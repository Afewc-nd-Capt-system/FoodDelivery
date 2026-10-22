require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const DeliveryPartner = require('../models/DeliveryPartner');
const DeliveryCompany = require('../models/DeliveryCompany');

const RIDER_EMAIL = 'rider@vibechops.com';
const RIDER_PASSWORD = 'Rider123!';
const COMPANY_EMAIL = 'fleet@vibechops.com';
const COMPANY_PASSWORD = 'Fleet123!';

/**
 * Creates a demo delivery company + rider account so the rider delivery flow
 * (accept -> pickup -> confirm arrival -> customer verification) can be tested.
 *
 * Rider login uses the normal auth endpoint: POST /api/v2/auth/login
 */
const seedTestRider = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery');

    let company = await DeliveryCompany.findOne({ email: COMPANY_EMAIL });
    if (!company) {
      company = await DeliveryCompany.create({
        companyName: 'VibeChops Demo Fleet',
        businessRegistrationNumber: 'RC-DEMO-0001',
        email: COMPANY_EMAIL,
        phone: '+2348000000001',
        address: { street: '1 Fleet Road', city: 'Lagos', state: 'Lagos' },
        verification: { status: 'verified' },
        isActive: true,
      });
      console.log('Delivery company created:', company.companyName);
    } else {
      console.log('Delivery company already exists:', company.companyName);
    }

    let companyUser = await User.findOne({ email: COMPANY_EMAIL });
    if (!companyUser) {
      companyUser = await User.create({
        name: 'VibeChops Demo Fleet',
        email: COMPANY_EMAIL,
        password: COMPANY_PASSWORD,
        phone: '+2348000000003',
        role: 'delivery_company',
        isVerified: true,
        isActive: true,
      });
      console.log('Delivery company user created');
    } else {
      console.log('Delivery company user already exists');
    }

    if (!company.owner || company.owner.toString() !== companyUser._id.toString()) {
      company.owner = companyUser._id;
      await company.save();
      console.log('Delivery company owner linked');
    }

    let riderUser = await User.findOne({ email: RIDER_EMAIL });
    if (!riderUser) {
      riderUser = await User.create({
        name: 'Demo Rider',
        email: RIDER_EMAIL,
        password: RIDER_PASSWORD,
        phone: '+2348000000002',
        role: 'delivery_rider',
      });
      console.log('Rider user created');
    } else {
      console.log('Rider user already exists');
    }

    let partner = await DeliveryPartner.findOne({ email: RIDER_EMAIL });
    if (!partner) {
      partner = await DeliveryPartner.create({
        name: 'Demo Rider',
        email: RIDER_EMAIL,
        password: RIDER_PASSWORD,
        phone: '+2348000000002',
        vehicleType: 'bike',
        vehicleNumber: 'LAG-DEMO-01',
        licenseNumber: 'LIC-DEMO-01',
        company: company._id,
        companyId: company._id.toString(),
        companyRole: 'rider',
        isOnline: false,
      });
      console.log('Delivery partner created');
    } else {
      console.log('Delivery partner already exists');
    }

    console.log('\nCompany login:');
    console.log(`  Email: ${COMPANY_EMAIL}`);
    console.log(`  Password: ${COMPANY_PASSWORD}`);

    console.log('\nRider login:');
    console.log(`  Email: ${RIDER_EMAIL}`);
    console.log(`  Password: ${RIDER_PASSWORD}`);
  } catch (error) {
    console.error('Failed to seed test rider:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedTestRider();
