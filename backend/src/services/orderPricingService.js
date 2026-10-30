'use strict';

const Restaurant = require('../models/Restaurant');
const Vendor = require('../models/Vendor');
const PromoCode = require('../models/PromoCode');

const MAX_LINE_ITEMS = 50;
const MAX_QUANTITY = 50;

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function objectId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
}

// Accept the canonical `customizations` array as well as the legacy cart shape
// `{ Protein: 'Fried Chicken' }` (also arrays of strings/objects per group).
function normalizeCustomizations(supplied) {
  if (supplied === undefined || supplied === null || supplied === '') return [];
  if (Array.isArray(supplied)) return supplied;
  if (typeof supplied === 'object') {
    return Object.entries(supplied).flatMap(([group, value]) => {
      if (value === undefined || value === null || value === '') return [];
      const values = Array.isArray(value) ? value : [value];
      return values.flatMap((item) => {
        if (item === undefined || item === null || item === '') return [];
        if (typeof item === 'string') return [{ name: group, option: item }];
        if (typeof item === 'object') {
          return [{
            name: item.name || item.group || group,
            option: item.option || item.label || item.value || '',
          }];
        }
        return [];
      });
    });
  }
  return supplied;
}

function validateCustomizations(menuItem, supplied) {
  const input = normalizeCustomizations(supplied);
  const groups = menuItem.customizationOptions || [];

  if (!Array.isArray(input)) {
    fail(`Customizations for ${menuItem.name} must be an array or an options object`);
  }

  const selections = new Map();
  const picked = new Map();

  for (const selection of input) {
    const groupName = String(selection?.name || selection?.group || '').trim();
    const optionName = String(selection?.option || selection?.label || selection?.value || '').trim();
    if (!groupName || !optionName) {
      fail(`Invalid customization selection for ${menuItem.name}`);
    }

    const group = groups.find((item) => item.name === groupName);
    if (!group) {
      fail(`Invalid customization group "${groupName}" for ${menuItem.name}`);
    }

    const option = (group.options || []).find((item) => item.name === optionName);
    if (!option) {
      fail(`Invalid customization "${optionName}" for ${menuItem.name}`);
    }

    if (!selections.has(group.name)) {
      selections.set(group.name, new Set());
      picked.set(group.name, []);
    }
    const chosen = selections.get(group.name);
    // Ignore duplicate selections for the same group/option instead of
    // charging the delta twice.
    if (chosen.has(option.name)) continue;
    chosen.add(option.name);
    picked.get(group.name).push({
      name: group.name,
      option: option.name,
      // Price always comes from the database menu definition.
      price: money(option.price),
    });
  }

  const customizations = [];
  for (const group of groups) {
    const chosen = selections.get(group.name);
    const count = chosen ? chosen.size : 0;
    const isSingle = group.type === 'single';
    const max = isSingle
      ? 1
      : Math.max(1, Number(group.max || (group.options || []).length || 1));
    const min = group.required
      ? Math.max(1, Number(group.min || 1))
      : Math.max(0, Number(group.min || 0));

    // Optional groups may be left empty even when their schema min defaults to
    // 1; once the customer starts choosing, min still applies.
    if (count < min && (group.required || count > 0)) {
      fail(group.required
        ? `${group.name} is required for ${menuItem.name}`
        : `${group.name} requires at least ${min} selection(s) for ${menuItem.name}`);
    }
    if (count > max || (isSingle && count > 1)) {
      fail(`Too many selections for ${group.name} on ${menuItem.name}`);
    }

    customizations.push(...(picked.get(group.name) || []));
  }

  return customizations;
}

async function priceOrder({ restaurantId, vendorId, items, promoCode }) {
  if (restaurantId && vendorId) {
    fail('Provide either restaurantId or vendorId, not both');
  }
  if (!restaurantId && !vendorId) {
    fail('Restaurant ID or Vendor ID is required');
  }
  if (!Array.isArray(items) || items.length === 0) {
    fail('At least one order item is required');
  }
  if (items.length > MAX_LINE_ITEMS) {
    fail('Too many order items');
  }

  let restaurant = null;
  let vendor = null;
  let store;
  if (restaurantId) {
    restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) fail('Restaurant not found', 404);
    store = restaurant;
  } else {
    vendor = await Vendor.findById(vendorId);
    if (!vendor) fail('Vendor not found', 404);
    store = vendor;
  }

  if (store.isOpen === false || store.isActive === false) {
    fail('Restaurant or vendor is currently closed');
  }

  const pricedItems = [];
  let subtotal = 0;

  for (const line of items) {
    const menuItemId = objectId(line?.menuItem || line?.id || line?.menuItemId);
    if (!menuItemId) fail('Each order item requires a menuItem id');

    const menuItem = (store.menu || []).find((item) => String(item._id) === menuItemId);
    if (!menuItem) fail(`Menu item not found: ${menuItemId}`, 404);
    if (menuItem.isAvailable === false) fail(`${menuItem.name} is currently unavailable`);

    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      fail(`Invalid quantity for ${menuItem.name}`);
    }

    const customizations = validateCustomizations(
      menuItem,
      line.customizations !== undefined ? line.customizations : line.selectedOptions
    );
    const customizationTotal = customizations.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const unitPrice = Number(menuItem.price) + customizationTotal;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      fail(`Invalid menu price for ${menuItem.name}`);
    }

    const lineTotal = money(unitPrice * quantity);
    subtotal += lineTotal;
    pricedItems.push({
      menuItem: menuItemId,
      name: menuItem.name,
      price: money(menuItem.price),
      quantity,
      customizations,
      specialInstructions: typeof line.specialInstructions === 'string'
        ? line.specialInstructions.trim().slice(0, 500)
        : undefined,
    });
  }

  subtotal = money(subtotal);
  const minOrder = Number(store.minOrderValue || store.minOrderForDelivery || 0);
  if (minOrder > 0 && subtotal < minOrder) {
    fail(`Minimum order value is ${minOrder}`);
  }

  const deliveryFee = money(store.deliveryFee === undefined || store.deliveryFee === null
    ? 40
    : store.deliveryFee);
  const serviceFee = money(store.serviceFee || 0);

  let promo = null;
  let promoDiscount = 0;
  const normalizedPromo = String(promoCode || '').trim().toUpperCase();
  if (normalizedPromo) {
    promo = await PromoCode.findOne({ code: normalizedPromo, isActive: true });
    if (!promo) fail('Invalid promo code');
    const now = new Date();
    if (promo.validFrom && now < promo.validFrom) fail('Promo code is not active yet');
    if (promo.validUntil && now > promo.validUntil) fail('Promo code expired');
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) fail('Promo code usage limit reached');
    if (subtotal < Number(promo.minOrderAmount || 0)) {
      fail(`Minimum order amount for this promo is ${promo.minOrderAmount}`);
    }
    if (promo.applicableRestaurants?.length && restaurant) {
      const applies = promo.applicableRestaurants.some(
        (item) => String(item) === String(restaurant._id)
      );
      if (!applies) fail('Promo code is not applicable to this restaurant');
    }

    if (promo.discountType === 'percentage') {
      promoDiscount = (subtotal * Number(promo.discountValue || 0)) / 100;
      if (promo.maxDiscount) promoDiscount = Math.min(promoDiscount, Number(promo.maxDiscount));
    } else {
      promoDiscount = Math.min(Number(promo.discountValue || 0), subtotal);
    }
    promoDiscount = money(Math.max(0, Math.min(promoDiscount, subtotal + deliveryFee + serviceFee)));
  }

  const totalAmount = money(Math.max(0, subtotal + deliveryFee + serviceFee - promoDiscount));

  return {
    restaurant,
    vendor,
    store,
    restaurantName: restaurant?.name || vendor?.businessName,
    items: pricedItems,
    subtotal,
    deliveryFee,
    serviceFee,
    promo,
    promoCode: promo?.code || '',
    promoDiscount,
    totalAmount,
    currency: 'NGN',
  };
}

module.exports = { priceOrder, validateCustomizations };
