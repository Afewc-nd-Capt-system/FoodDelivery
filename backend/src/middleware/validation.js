const { z } = require('zod');

const sanitizeString = (val) => {
  if (typeof val !== 'string') return val;
  return val.trim().replace(/[<>]/g, '');
};

const createValidationMiddleware = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.strict().parse({
        ...req.body,
        ...req.query,
        ...req.params
      });

      const sanitized = {};
      Object.keys(result).forEach(key => {
        const val = result[key];
        if (typeof val === 'string') {
          sanitized[key] = sanitizeString(val);
        } else if (Array.isArray(val)) {
          sanitized[key] = val.map(item => typeof item === 'string' ? sanitizeString(item) : item);
        } else if (typeof val === 'object' && val !== null) {
          sanitized[key] = val;
        } else {
          sanitized[key] = val;
        }
      });

      req.validated = sanitized;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
          code: 'VALIDATION_ERROR'
        });
      }
      next(err);
    }
  };
};

const schemas = {
  register: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    phone: z.string().optional()
  }),

  login: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  }),

  updateProfile: z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional()
    }).optional(),
    dietaryPreferences: z.array(z.enum(['vegan', 'vegetarian', 'halal', 'kosher', 'gluten-free', 'nut-free', 'dairy-free'])).optional()
  }),

  order: z.object({
    restaurant: z.string().min(1),
    restaurantName: z.string().min(1),
    items: z.array(z.object({
      menuItem: z.string().optional(),
      name: z.string().min(1),
      price: z.number().positive(),
      quantity: z.number().int().positive()
    })).min(1),
    totalAmount: z.number().positive(),
    deliveryAddress: z.string().min(1),
    paymentMethod: z.enum(['cash', 'card', 'wallet', 'wallet_card']).optional(),
    deliveryFee: z.number().optional()
  }),

  scheduledOrder: z.object({
    restaurant: z.string().min(1),
    restaurantName: z.string().min(1),
    items: z.array(z.any()).min(1),
    totalAmount: z.number().positive(),
    deliveryAddress: z.string().min(1),
    paymentMethod: z.string().optional(),
    deliveryFee: z.number().optional(),
    scheduledTime: z.string().datetime()
  }),

  dispute: z.object({
    orderId: z.string().min(1),
    type: z.enum(['wrong_item', 'missing_item', 'quality_issue', 'delivery_delay', 'other']),
    description: z.string().min(10).max(1000),
    evidence: z.array(z.string()).optional()
  }),

  catering: z.object({
    restaurantId: z.string().min(1),
    eventType: z.enum(['birthday', 'wedding', 'corporate', 'family_gathering', 'other']),
    eventDate: z.string().datetime(),
    numberOfPeople: z.number().int().min(20),
    menuPreference: z.string().optional(),
    specialRequirements: z.string().optional(),
    contactName: z.string().min(1),
    contactPhone: z.string().min(1)
  }),

  reservation: z.object({
    restaurantId: z.string().min(1),
    date: z.string().datetime(),
    time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    partySize: z.number().int().min(1).max(20),
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional(),
    specialRequests: z.string().optional()
  })
};

module.exports = { createValidationMiddleware, schemas };