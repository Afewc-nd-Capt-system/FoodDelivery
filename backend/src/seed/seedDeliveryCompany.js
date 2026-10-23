const User = require('../models/User');
const DeliveryCompany = require('../models/DeliveryCompany');

const COMPANY_EMAIL = 'delivery@vibechops.ng';
const COMPANY_NAME = 'Swift Delivery Co';

/**
 * Create or repair the seeded delivery company and link it to its owner.
 * Idempotent: safe to run from the seed route or as a standalone script.
 */
async function seedDeliveryCompany() {
  const owner = await User.findOne({
    email: COMPANY_EMAIL,
    role: 'delivery_company',
  });

  if (!owner) {
    throw new Error(`No delivery_company user found for ${COMPANY_EMAIL}`);
  }

  const company = await DeliveryCompany.findOneAndUpdate(
    { email: COMPANY_EMAIL },
    {
      $setOnInsert: {
        companyName: COMPANY_NAME,
        businessRegistrationNumber: 'RC-VIBECHOPS-0001',
        email: COMPANY_EMAIL,
        phone: '+2348055555555',
        address: {
          street: '1 Fleet Road',
          city: 'Lagos',
          state: 'Lagos',
        },
        verification: {
          status: 'verified',
          verifiedAt: new Date(),
        },
        isActive: true,
      },
      $set: { owner: owner._id },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  return { company, owner };
}

module.exports = { seedDeliveryCompany, COMPANY_EMAIL, COMPANY_NAME };

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
    const { company, owner } = await seedDeliveryCompany();
    console.log(`company: ${company.companyName} (${company.email})`);
    console.log(`companyId: ${company._id}`);
    console.log(`owner: ${owner.email} (${owner._id})`);
    console.log(`ownerLinked: ${String(company.owner) === String(owner._id)}`);
    await mongoose.disconnect();
  })().catch(async (error) => {
    console.error(`SEED_FAILED: ${error.message}`);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
}
