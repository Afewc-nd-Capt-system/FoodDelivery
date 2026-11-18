'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Restaurant = require('../../models/Restaurant');
const Subscription = require('../../models/Subscription');
const BusinessSubscriptionPlan = require('../../models/BusinessSubscriptionPlan');
const authMiddleware = require('../../middleware/auth');
const { geocodeAddress } = require('../../services/geocode');
const { CONFIGURED: IMAGE_STORAGE_CONFIGURED, storeImage } = require('../../utils/imageStorage');
const upload = require('../../utils/upload');

const router = express.Router();
router.use(authMiddleware);

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DEFAULT_MENU_LIMIT = 20;

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function cleanString(value, max) {
  if (value === undefined || value === null) return '';
  const text = String(value).trim();
  return text.slice(0, max);
}

function isMoney(value) {
  return value !== '' && value !== null && value !== undefined
    && Number.isFinite(Number(value)) && Number(value) >= 0;
}

function validImage(value) {
  if (value === undefined || value === null || value === '') return '';
  const text = String(value).trim();
  if (text.length > 2048) return null;
  if (/^https?:\/\/[^\s]+$/i.test(text)) return text;
  if (/^\/[^\s]*$/.test(text)) return text;
  return null;
}

function normalizeCustomizationGroups(input) {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) throw new Error('customizationGroups must be an array');
  if (input.length > 10) throw new Error('At most 10 customization groups are allowed');

  return input.map((group, index) => {
    const name = cleanString(group?.name, 60);
    if (!name) throw new Error(`Customization group ${index + 1} requires a name`);

    const type = group?.type === 'quantity' ? 'multiple' : cleanString(group?.type || 'single', 20);
    if (!['single', 'multiple'].includes(type)) {
      throw new Error(`Customization group "${name}" must be single or multiple`);
    }
    if (!Array.isArray(group?.options) || group.options.length === 0) {
      throw new Error(`Customization group "${name}" requires at least one option`);
    }
    if (group.options.length > 20) {
      throw new Error(`Customization group "${name}" supports at most 20 options`);
    }

    const seen = new Set();
    const options = group.options.map((option, optionIndex) => {
      const optionName = cleanString(option?.name, 60);
      if (!optionName) throw new Error(`Option ${optionIndex + 1} in "${name}" requires a name`);
      const key = optionName.toLowerCase();
      if (seen.has(key)) throw new Error(`Duplicate option "${optionName}" in "${name}"`);
      seen.add(key);
      const price = option?.price === undefined ? 0 : Number(option.price);
      if (!Number.isFinite(price) || price < 0 || price > 1000000) {
        throw new Error(`Invalid price for option "${optionName}" in "${name}"`);
      }
      return { name: optionName, price: Math.round(price * 100) / 100 };
    });

    const required = Boolean(group?.required);
    if (type === 'single') {
      return { name, type, required, options, min: 1, max: 1 };
    }

    const min = group?.min === undefined ? (required ? 1 : 0) : Number(group.min);
    const max = group?.max === undefined ? options.length : Number(group.max);
    if (!Number.isInteger(min) || min < 0 || min > options.length) {
      throw new Error(`Invalid minimum selections for "${name}"`);
    }
    if (!Number.isInteger(max) || max < 1 || max > options.length) {
      throw new Error(`Invalid maximum selections for "${name}"`);
    }
    if (min > max) throw new Error(`Minimum selections for "${name}" cannot exceed the maximum`);
    if (required && min < 1) throw new Error(`Required group "${name}" needs a minimum of at least 1`);
    return { name, type, required, options, min, max };
  });
}

function validateMenuPayload(body, existing) {
  const source = existing ? { ...existing, ...body } : body;

  const name = cleanString(source.name, 120);
  if (!name) throw new Error('Menu item name is required');

  const category = cleanString(source.category, 60);
  if (!category) throw new Error('Menu item category is required');

  const price = Number(source.price);
  if (!Number.isFinite(price) || price < 0 || price > 10000000) {
    throw new Error('Menu item price must be a valid non-negative amount');
  }

  const description = cleanString(source.description, 2000);
  const image = validImage(source.image);
  if (image === null) throw new Error('Image must be an http(s) URL or a site-relative path');

  return {
    name,
    description,
    price: Math.round(price * 100) / 100,
    image,
    category,
    isVeg: Boolean(source.isVeg),
    isAvailable: source.isAvailable === undefined ? true : Boolean(source.isAvailable),
    popular: Boolean(source.popular),
    calories: cleanString(source.calories, 40),
    allowSpecialInstructions: source.allowSpecialInstructions === undefined
      ? true
      : Boolean(source.allowSpecialInstructions),
    customizationOptions: normalizeCustomizationGroups(source.customizationOptions),
  };
}

function validateOpeningHours(input) {
  if (!Array.isArray(input)) throw new Error('openingHours must be an array');
  if (input.length > 7) throw new Error('openingHours can contain at most 7 days');

  const seen = new Set();
  const hours = input.map((entry) => {
    const day = cleanString(entry?.day, 20).toLowerCase();
    if (!DAYS.includes(day)) throw new Error(`Invalid opening-hours day "${entry?.day}"`);
    if (seen.has(day)) throw new Error(`Duplicate opening-hours entry for ${day}`);
    seen.add(day);

    const closed = Boolean(entry?.closed);
    const open = cleanString(entry?.open || '09:00', 5);
    const close = cleanString(entry?.close || '21:00', 5);
    if (!closed) {
      const pattern = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!pattern.test(open) || !pattern.test(close)) {
        throw new Error(`Opening hours for ${day} must use HH:MM`);
      }
      if (open >= close) throw new Error(`Closing time for ${day} must be after opening time`);
    }
    return { day, open, close, closed };
  });

  return hours;
}

async function ownedRestaurant(user) {
  if (!user?.id) return null;
  return Restaurant.findOne({ owner: user.id, deletedAt: null });
}

async function menuLimitFor(restaurant, user) {
  let subscription = await Subscription.findOne({
    restaurant: restaurant._id,
    status: 'active',
  });

  if (!subscription) {
    subscription = await Subscription.findOne({
      user: user.id,
      status: 'active',
      plan: { $type: 'objectId' },
    });
  }

  // `plan` is Mixed because Vibepass plans store a string while business plans
  // store a BusinessSubscriptionPlan ObjectId. Resolve the business plan
  // explicitly instead of relying on populate() (which ignores Mixed paths).
  let plan = null;
  if (subscription?.plan) {
    if (typeof subscription.plan === 'object' && subscription.plan.maxMenuItems !== undefined) {
      plan = subscription.plan;
    } else if (mongoose.Types.ObjectId.isValid(subscription.plan)) {
      plan = await BusinessSubscriptionPlan.findById(subscription.plan);
    }
  }

  if (plan?.maxMenuItems) return Number(plan.maxMenuItems);

  const basic = await BusinessSubscriptionPlan.findOne({ targetType: 'restaurant', isActive: true })
    .sort({ price: 1 });
  return basic ? Number(basic.maxMenuItems) : DEFAULT_MENU_LIMIT;
}

function canManage(user, restaurant) {
  return Boolean(user && (user.role === 'admin' || String(restaurant.owner) === String(user.id)));
}

// GET /api/v2/restaurant/me - the signed-in owner's restaurant + limits
router.get('/me', async (req, res) => {
  try {
    const restaurant = await ownedRestaurant(req.user);
    if (!restaurant) return fail(res, 404, 'No restaurant is linked to this account');

    const limit = await menuLimitFor(restaurant, req.user);
    const menu = [...(restaurant.menu || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const categories = [...new Set(menu.map((item) => item.category).filter(Boolean))];

    res.json({
      success: true,
      restaurant: { ...restaurant.toObject(), menu },
      menuLimit: limit,
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/v2/restaurant/me/profile - profile + operations
router.patch('/me/profile', async (req, res) => {
  try {
    const restaurant = await ownedRestaurant(req.user);
    if (!restaurant) return fail(res, 404, 'No restaurant is linked to this account');

    const body = req.body || {};

    if (body.name !== undefined) {
      const name = cleanString(body.name, 120);
      if (!name) return fail(res, 400, 'Restaurant name is required');
      restaurant.name = name;
    }
    if (body.description !== undefined) {
      const description = cleanString(body.description, 2000);
      if (!description) return fail(res, 400, 'Description is required');
      restaurant.description = description;
    }
    if (body.phone !== undefined) {
      const phone = cleanString(body.phone, 40);
      if (!/^[+0-9()\s-]{7,40}$/.test(phone)) return fail(res, 400, 'A valid phone number is required');
      restaurant.phone = phone;
    }
    if (body.cuisine !== undefined) {
      const cuisine = Array.isArray(body.cuisine) ? body.cuisine : [body.cuisine];
      const cleaned = cuisine.map((item) => cleanString(item, 60)).filter(Boolean).slice(0, 10);
      if (cleaned.length === 0) return fail(res, 400, 'At least one cuisine is required');
      restaurant.cuisine = cleaned;
    }
    if (body.deliveryTime !== undefined) {
      const deliveryTime = cleanString(body.deliveryTime, 40);
      if (!deliveryTime) return fail(res, 400, 'Delivery time is required');
      restaurant.deliveryTime = deliveryTime;
    }
    if (body.deliveryFee !== undefined) {
      if (!isMoney(body.deliveryFee)) return fail(res, 400, 'Delivery fee must be a non-negative amount');
      restaurant.deliveryFee = Math.round(Number(body.deliveryFee) * 100) / 100;
    }
    if (body.minOrderValue !== undefined) {
      if (!isMoney(body.minOrderValue)) return fail(res, 400, 'Minimum order must be a non-negative amount');
      restaurant.minOrderValue = Math.round(Number(body.minOrderValue) * 100) / 100;
    }
    if (body.image !== undefined || body.coverImage !== undefined) {
      const image = validImage(body.coverImage !== undefined ? body.coverImage : body.image);
      if (image === null) return fail(res, 400, 'Cover image must be an http(s) URL or a site-relative path');
      restaurant.image = image;
    }
    if (body.openingHours !== undefined) {
      try {
        restaurant.openingHours = validateOpeningHours(body.openingHours);
      } catch (error) {
        return fail(res, 400, error.message);
      }
    }
    if (body.address !== undefined) {
      const address = body.address || {};
      const street = cleanString(address.street, 200);
      const area = cleanString(address.area, 120);
      const city = cleanString(address.city, 120);
      const state = cleanString(address.state, 120);
      if (!street || !city) return fail(res, 400, 'Street and city are required');
      const geocoded = await geocodeAddress({
        street, area, city, state, country: cleanString(address.country || 'Nigeria', 120),
      }, body.location?.coordinates || restaurant.location?.coordinates);
      restaurant.address = {
        street,
        area,
        city,
        state,
        country: cleanString(address.country || 'Nigeria', 120),
        formattedAddress: geocoded?.formattedAddress || restaurant.address?.formattedAddress,
      };
      if (geocoded?.coordinates) {
        restaurant.location = { type: 'Point', coordinates: geocoded.coordinates };
      }
    }

    if (body.isOpen !== undefined) {
      const open = Boolean(body.isOpen);
      if (open) {
        if (restaurant.verificationStatus !== 'approved') {
          return fail(res, 403, 'Your CAC documents must be approved before the restaurant can go live');
        }
        if (restaurant.deliveryFee === null || restaurant.deliveryFee === undefined) {
          return fail(res, 400, 'Set a delivery fee before opening');
        }
        if (restaurant.minOrderValue === null || restaurant.minOrderValue === undefined) {
          return fail(res, 400, 'Set a minimum order before opening');
        }
      }
      restaurant.isOpen = open;
    }

    await restaurant.save();
    res.json({ success: true, restaurant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v2/restaurant/me/menu
router.get('/me/menu', async (req, res) => {
  try {
    const restaurant = await ownedRestaurant(req.user);
    if (!restaurant) return fail(res, 404, 'No restaurant is linked to this account');
    const limit = await menuLimitFor(restaurant, req.user);
    const menu = [...(restaurant.menu || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    res.json({
      success: true,
      items: menu,
      total: menu.length,
      limit,
      categories: [...new Set(menu.map((item) => item.category).filter(Boolean))],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v2/restaurant/me/menu
router.post('/me/menu', async (req, res) => {
  try {
    const restaurant = await ownedRestaurant(req.user);
    if (!restaurant) return fail(res, 404, 'No restaurant is linked to this account');

    const limit = await menuLimitFor(restaurant, req.user);
    if ((restaurant.menu || []).length >= limit) {
      return fail(res, 403, `Your plan allows up to ${limit} menu items. Upgrade to add more.`);
    }

    let payload;
    try {
      payload = validateMenuPayload(req.body || {}, null);
    } catch (error) {
      return fail(res, 400, error.message);
    }

    payload.sortOrder = (restaurant.menu || []).length;
    restaurant.menu.push(payload);
    await restaurant.save();

    const item = restaurant.menu[restaurant.menu.length - 1];
    res.status(201).json({ success: true, item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/v2/restaurant/me/menu/:itemId - availability / popular
router.patch('/me/menu/:itemId', async (req, res) => {
  try {
    const restaurant = await ownedRestaurant(req.user);
    if (!restaurant) return fail(res, 404, 'No restaurant is linked to this account');

    const item = restaurant.menu.id(req.params.itemId);
    if (!item) {
      const elsewhere = await Restaurant.exists({ 'menu._id': req.params.itemId });
      return fail(res, elsewhere ? 403 : 404, elsewhere ? 'You cannot change another restaurant\'s menu' : 'Menu item not found');
    }

    const body = req.body || {};
    if (body.isAvailable === undefined && body.popular === undefined) {
      return fail(res, 400, 'Provide isAvailable and/or popular');
    }
    if (body.isAvailable !== undefined) item.isAvailable = Boolean(body.isAvailable);
    if (body.popular !== undefined) item.popular = Boolean(body.popular);

    await restaurant.save();
    res.json({ success: true, item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/v2/restaurant/me/menu/:itemId
router.put('/me/menu/:itemId', async (req, res) => {
  try {
    const restaurant = await ownedRestaurant(req.user);
    if (!restaurant) return fail(res, 404, 'No restaurant is linked to this account');

    const item = restaurant.menu.id(req.params.itemId);
    if (!item) {
      const elsewhere = await Restaurant.exists({ 'menu._id': req.params.itemId });
      return fail(res, elsewhere ? 403 : 404, elsewhere ? 'You cannot change another restaurant\'s menu' : 'Menu item not found');
    }

    let payload;
    try {
      payload = validateMenuPayload(req.body || {}, item.toObject());
    } catch (error) {
      return fail(res, 400, error.message);
    }

    Object.assign(item, payload);
    await restaurant.save();
    res.json({ success: true, item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/v2/restaurant/me/menu/:itemId
router.delete('/me/menu/:itemId', async (req, res) => {
  try {
    const restaurant = await ownedRestaurant(req.user);
    if (!restaurant) return fail(res, 404, 'No restaurant is linked to this account');

    const item = restaurant.menu.id(req.params.itemId);
    if (!item) {
      const elsewhere = await Restaurant.exists({ 'menu._id': req.params.itemId });
      return fail(res, elsewhere ? 403 : 404, elsewhere ? 'You cannot change another restaurant\'s menu' : 'Menu item not found');
    }

    item.deleteOne();
    restaurant.menu.forEach((entry, index) => { entry.sortOrder = index; });
    await restaurant.save();
    res.json({ success: true, deleted: req.params.itemId });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v2/restaurant/me/menu/reorder
router.post('/me/menu/reorder', async (req, res) => {
  try {
    const restaurant = await ownedRestaurant(req.user);
    if (!restaurant) return fail(res, 404, 'No restaurant is linked to this account');

    const order = Array.isArray(req.body?.order) ? req.body.order.map(String) : null;
    if (!order || order.length !== restaurant.menu.length) {
      return fail(res, 400, 'order must list every menu item id exactly once');
    }
    const existing = restaurant.menu.map((item) => String(item._id));
    const unique = new Set(order);
    if (unique.size !== order.length || !order.every((id) => existing.includes(id))) {
      return fail(res, 400, 'order must list every menu item id exactly once');
    }

    order.forEach((id, index) => {
      const item = restaurant.menu.id(id);
      if (item) item.sortOrder = index;
    });
    restaurant.menu.sort((a, b) => a.sortOrder - b.sortOrder);
    await restaurant.save();

    res.json({ success: true, items: restaurant.menu });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/v2/restaurant/me/images - Cloudinary when configured, otherwise URL
router.post('/me/images', upload.single('image'), async (req, res) => {
  try {
    const restaurant = await ownedRestaurant(req.user);
    if (!restaurant) return fail(res, 404, 'No restaurant is linked to this account');

    let url = null;
    if (req.file) {
      url = await storeImage(req.file);
      if (!url) {
        return fail(res, 400, 'Cloudinary is not configured; send an imageUrl instead');
      }
    } else {
      url = validImage(req.body?.imageUrl);
      if (!url) return fail(res, 400, 'Provide an image file or an imageUrl');
    }
    res.json({ success: true, url, storage: IMAGE_STORAGE_CONFIGURED ? 'cloudinary' : 'url' });
  } catch (error) {
    res.status(error.status || 400).json({ success: false, message: error.message });
  }
});

// GET /api/v2/restaurant/:id - owner or admin only (isolation)
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return fail(res, 404, 'Restaurant not found');
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return fail(res, 404, 'Restaurant not found');
    if (!canManage(req.user, restaurant)) return fail(res, 403, 'You cannot access another restaurant');
    const limit = await menuLimitFor(restaurant, req.user);
    res.json({ success: true, restaurant, menuLimit: limit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v2/restaurant/:id/menu/manage - owner or admin only (isolation)
router.get('/:id/menu/manage', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return fail(res, 404, 'Restaurant not found');
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return fail(res, 404, 'Restaurant not found');
    if (!canManage(req.user, restaurant)) return fail(res, 403, 'You cannot access another restaurant');
    res.json({ success: true, items: restaurant.menu, total: restaurant.menu.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/v2/restaurant/:id - owner or admin only (isolation)
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return fail(res, 404, 'Restaurant not found');
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return fail(res, 404, 'Restaurant not found');
    if (!canManage(req.user, restaurant)) return fail(res, 403, 'You cannot change another restaurant');
    res.status(409).json({
      success: false,
      message: 'Use PATCH /api/v2/restaurant/me/profile to update your own restaurant',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
module.exports.validateMenuPayload = validateMenuPayload;
module.exports.validateOpeningHours = validateOpeningHours;
