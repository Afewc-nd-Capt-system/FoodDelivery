const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

const OWNER_EMAIL = 'restaurant@vibechops.ng';
const RESTAURANT_NAME = 'Mama Cass Kitchen';

/**
 * Link the seeded restaurant account to its restaurant profile.
 * Idempotent: safe to run from the seed route or as a standalone script.
 */
async function seedRestaurantOwner() {
  const owner = await User.findOne({
    email: OWNER_EMAIL,
    role: 'restaurant',
  });

  if (!owner) {
    throw new Error(`No restaurant user found for ${OWNER_EMAIL}`);
  }

  const restaurant = await Restaurant.findOneAndUpdate(
    { name: RESTAURANT_NAME },
    { $set: { owner: owner._id } },
    { new: true }
  );

  if (!restaurant) {
    throw new Error(`Restaurant not found: ${RESTAURANT_NAME}`);
  }

  return { restaurant, owner };
}

module.exports = { seedRestaurantOwner, OWNER_EMAIL, RESTAURANT_NAME };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');

  const uri = process.env.MONGODB_URI;
  if (!uri || !uri.includes('/vibechops_prod')) {
    console.error('Refusing to seed: MONGODB_URI must contain /vibechops_prod.');
    process.exit(1);
  }

  (async () => {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
    const { restaurant, owner } = await seedRestaurantOwner();
    console.log(`restaurant: ${restaurant.name} (${restaurant._id})`);
    console.log(`owner: ${owner.email} (${owner._id})`);
    console.log(`ownerLinked: ${String(restaurant.owner) === String(owner._id)}`);
    await mongoose.disconnect();
  })().catch(async (error) => {
    console.error(`SEED_FAILED: ${error.message}`);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
}
