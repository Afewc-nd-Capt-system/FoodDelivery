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

function normalizeCustomizations(supplied) {
  if (supplied === undefined || supplied === null) return [];
  if (Array.isArray(supplied)) return supplied;
  if (typeof supplied === 'object') {
    return Object.entries(supplied).flatMap(([group, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => (typeof item === 'string'
          ? { name: group, option: item }
          : item));
      }
      if (value === undefined || value === null || value === '') return [];
      return [{ name: group, option: value }];
    });
  }
  return supplied;
}

function validateCustomizations(menuItem, supplied) {
  const selections = new Map();
  const customizations = [];
  const input = normalizeCustomizations(supplied);

  if (!Array.isArray(input)) {
    fail(`Customizations for ${menuItem.name} must be an array`);
  }

  for (const selection of input) {
    const groupName = String(selection?.name || selection?.group || '').trim();
    const optionName = String(selection?.option || selection?.label || '').trim();
    const group = (menuItem.customizationOptions || []).find((item) => item.name === groupName);
    if (!group) {
      fail(`Invalid customization group "${groupName}" for ${menuItem.name}`);
    }

    const option = (group.options || []).find((item) => item.name === optionName);
    if (!option) {
      fail(`Invalid customization "${optionName}" for ${menuItem.name}`);
    }

    if (!selections.has(group.name)) selections.set(group.name, new Set());
    const chosen = selections.get(group.name);
    if (group.type === 'single' && chosen.size >= Math.max(1, Number(group.max || 1))) {
      fail(`Too many selections for ${group.name} on ${menuItem.name}`);
    }
    chosen.add(option.name);
    customizations.push({
      name: group.name,
      option: option.name,
      price: money(option.price),
    });
  }

  for (const group of menuItem.customizationOptions || []) {
    const chosen = selections.get(group.name);
    const count = chosen ? chosen.size : 0;
    if (group.required && count < Math.max(1, Number(group.min || 1))) {
      fail(`${group.name} is required for ${menuItem.name}`);
    }
    if (count > Math.max(1, Number(group.max || 1))) {
      fail(`Too many selections for ${group.name} on ${menuItem.name}`);
    }
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

    const customizations = validateCustomizations(menuItem, line.customizations);
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
