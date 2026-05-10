require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery');
    console.log('Connected to MongoDB');

    const adminExists = await User.findOne({ email: 'admin@fooddelivery.com' });
    
    if (adminExists) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin123!', 10);
    
    const admin = new User({
      name: 'Admin Master',
      email: 'admin@fooddelivery.com',
      password: hashedPassword,
      phone: '+1234567890',
      address: {
        street: '123 Admin Street',
        city: 'Admin City',
        state: 'Admin State',
        zipCode: '12345'
      },
      role: 'admin'
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@fooddelivery.com');
    console.log('Password: [CHECK .env or documentation]');
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmin();
