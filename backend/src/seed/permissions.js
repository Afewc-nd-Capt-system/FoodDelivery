require('dotenv').config();
const mongoose = require('mongoose');
const Permission = require('../models/Permission');

const permissions = [
  { name: 'create_order', description: 'Create new orders', resource: 'orders', action: 'create', roles: ['customer'] },
  { name: 'view_own_orders', description: 'View own orders', resource: 'orders', action: 'read', roles: ['customer'] },
  { name: 'cancel_own_order', description: 'Cancel own order', resource: 'orders', action: 'update', roles: ['customer'] },
  { name: 'update_profile', description: 'Update own profile', resource: 'users', action: 'update', roles: ['customer'] },
  { name: 'view_restaurant_orders', description: 'View restaurant orders', resource: 'orders', action: 'read', roles: ['restaurant'] },
  { name: 'update_restaurant_orders', description: 'Update restaurant order status', resource: 'orders', action: 'update', roles: ['restaurant'] },
  { name: 'manage_menu', description: 'Manage restaurant menu', resource: 'restaurants', action: 'manage', roles: ['restaurant'] },
  { name: 'configure_pod', description: 'Configure pay on delivery', resource: 'restaurants', action: 'update', roles: ['restaurant', 'vendor'] },
  { name: 'view_vendor_orders', description: 'View vendor orders', resource: 'orders', action: 'read', roles: ['vendor'] },
  { name: 'manage_vendor_menu', description: 'Manage vendor menu', resource: 'vendors', action: 'manage', roles: ['vendor'] },
  { name: 'view_available_orders', description: 'View available delivery orders', resource: 'orders', action: 'read', roles: ['delivery_rider'] },
  { name: 'accept_delivery_order', description: 'Accept delivery order', resource: 'orders', action: 'update', roles: ['delivery_rider'] },
  { name: 'confirm_delivery', description: 'Confirm delivery completion', resource: 'orders', action: 'update', roles: ['delivery_rider'] },
  { name: 'update_location', description: 'Update rider location', resource: 'delivery', action: 'update', roles: ['delivery_rider'] },
  { name: 'manage_riders', description: 'Manage company riders', resource: 'delivery_company', action: 'manage', roles: ['delivery_company'] },
  { name: 'view_company_stats', description: 'View company statistics', resource: 'delivery_company', action: 'read', roles: ['delivery_company'] },
  { name: 'manage_company_wallet', description: 'Manage company wallet', resource: 'wallet', action: 'manage', roles: ['delivery_company'] },
  { name: 'manage_all_users', description: 'Manage all users', resource: 'users', action: 'manage', roles: ['admin'] },
  { name: 'manage_all_orders', description: 'Manage all orders', resource: 'orders', action: 'manage', roles: ['admin'] },
  { name: 'verify_companies', description: 'Verify delivery companies', resource: 'delivery_company', action: 'manage', roles: ['admin'] },
  { name: 'configure_permissions', description: 'Configure system permissions', resource: 'permissions', action: 'manage', roles: ['admin'] },
];

async function seedPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery');
    console.log('Connected to MongoDB');

    for (const perm of permissions) {
      await Permission.findOneAndUpdate(
        { name: perm.name },
        perm,
        { upsert: true, new: true }
      );
    }

    console.log(`Seeded ${permissions.length} permissions successfully`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding permissions:', error);
    process.exit(1);
  }
}

seedPermissions();
