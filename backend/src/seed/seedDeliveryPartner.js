const crypto = require('crypto');
const User = require('../models/User');
const DeliveryCompany = require('../models/DeliveryCompany');
const DeliveryPartner = require('../models/DeliveryPartner');

const RIDER_EMAIL = 'rider@vibechops.ng';
const COMPANY_EMAIL = 'delivery@vibechops.ng';

/**
 * Create the DeliveryPartner profile used by the delivery-company assignment
 * flow. Web riders log in as Users; deliveries store a DeliveryPartner id.
 * Idempotent: safe to run from the seed route or as a standalone script.
 */
async function seedDeliveryPartner() {
  const user = await User.findOne({
    email: RIDER_EMAIL,
    role: 'delivery_rider',
  });
  if (!user) {
    throw new Error(`No delivery_rider user found for ${RIDER_EMAIL}`);
  }

  const company = await DeliveryCompany.findOne({ email: COMPANY_EMAIL });
  if (!company) {
    throw new Error(`No delivery company found for ${COMPANY_EMAIL}`);
  }

  let partner = await DeliveryPartner.findOne({ email: RIDER_EMAIL });
  let created = false;

  if (!partner) {
    const riderPassword = process.env.SEED_RIDER_PASSWORD
      || crypto.randomBytes(32).toString('base64url');
    partner = await DeliveryPartner.create({
      name: user.name,
      email: RIDER_EMAIL,
      password: riderPassword,
      phone: user.phone || '+2348044444444',
      vehicleType: 'bike',
      vehicleNumber: 'LAG-001-RD',
      licenseNumber: 'DL-VIBECHOPS-001',
      company: company._id,
      companyId: String(company._id),
      companyRole: 'rider',
      isActive: true,
      isOnline: true,
    });
    created = true;
  } else if (
    String(partner.company) !== String(company._id) ||
    partner.companyId !== String(company._id)
  ) {
    partner.company = company._id;
    partner.companyId = String(company._id);
    partner.isActive = true;
    await partner.save();
  }

  if (created) {
    await DeliveryCompany.findByIdAndUpdate(company._id, {
      $inc: { 'fleet.totalRiders': 1, 'fleet.activeRiders': 1 },
    });
  }

  return { partner, user, company };
}

module.exports = { seedDeliveryPartner, RIDER_EMAIL, COMPANY_EMAIL };

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
    const { partner, company } = await seedDeliveryPartner();
    console.log(`riderPartner: ${partner.name} (${partner._id})`);
    console.log(`company: ${company.companyName} (${company._id})`);
    console.log(`companyLinked: ${String(partner.company) === String(company._id)}`);
    await mongoose.disconnect();
  })().catch(async (error) => {
    console.error(`SEED_FAILED: ${error.message}`);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
}
