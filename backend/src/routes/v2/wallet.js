const express = require('express');
const crypto = require('crypto');
const authMiddleware = require('../../middleware/auth');
const User = require('../../models/User');
const Wallet = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
const axios = require('axios');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id, deletedAt: null });

    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user.id,
        balance: 0,
        currency: 'NGN',
        isActive: true
      });
    }

    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const wallet = await Wallet.findOne({ user: req.user.id, deletedAt: null });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const query = { wallet: wallet._id, deletedAt: null };
    if (type) {
      query.type = type;
    }

    const total = await WalletTransaction.countDocuments(query);
    const transactions = await WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('order', 'status totalAmount');

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/topup', authMiddleware, async (req, res) => {
  try {
    const { amount, email } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const user = await User.findById(req.user.id);
    let wallet = await Wallet.findOne({ user: req.user.id, deletedAt: null });

    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user.id,
        balance: 0,
        currency: 'NGN',
        isActive: true
      });
    }

    const reference = 'WALLET-' + crypto.randomBytes(8).toString('hex').toUpperCase();

    const paystackUrl = 'https://api.paystack.co/transaction/initialize';
    const paymentData = {
      email: email || user.email,
      amount: amount * 100,
      reference: reference,
      callback_url: process.env.FRONTEND_URL + '/wallet/callback',
      metadata: {
        wallet_topup: true,
        userId: req.user.id,
        type: 'wallet_topup'
      }
    };

    const response = await axios.post(paystackUrl, paymentData, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      data: {
        authorizationUrl: response.data.data.authorization_url,
        reference: reference
      },
      message: 'Redirect to payment to complete top-up'
    });
  } catch (error) {
    console.error('Paystack initialization error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.response?.data?.message || 'Failed to initialize payment' });
  }
});

router.post('/topup/verify', authMiddleware, async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Payment reference required' });
    }

    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });

    const transactionData = response.data.data;

    if (transactionData.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Payment not successful' });
    }

    const amount = transactionData.amount / 100;

    let wallet = await Wallet.findOne({ user: req.user.id, deletedAt: null });
    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user.id,
        balance: 0,
        currency: 'NGN',
        isActive: true
      });
    }

    wallet.balance += amount;
    await wallet.save();

    const transaction = new WalletTransaction({
      wallet: wallet._id,
      user: req.user.id,
      type: 'credit',
      amount: amount,
      description: 'Wallet top-up via Paystack',
      reference: 'TXN-' + reference,
      paymentReference: reference,
      status: 'completed'
    });
    await transaction.save();

    res.json({
      success: true,
      data: {
        newBalance: wallet.balance,
        amount: amount,
        transactionId: transaction._id
      },
      message: 'Wallet topped up successfully'
    });
  } catch (error) {
    console.error('Verification error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.response?.data?.message || 'Verification failed' });
  }
});

router.post('/deduct', authMiddleware, async (req, res) => {
  try {
    const { amount, description, orderId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const wallet = await Wallet.findOne({ user: req.user.id, deletedAt: null });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    wallet.balance -= amount;
    await wallet.save();

    const transaction = new WalletTransaction({
      wallet: wallet._id,
      user: req.user.id,
      type: 'debit',
      amount: amount,
      description: description || 'Order payment',
      order: orderId,
      reference: 'DEBIT-' + Date.now(),
      status: 'completed'
    });
    await transaction.save();

    res.json({
      success: true,
      data: {
        newBalance: wallet.balance,
        amount: amount,
        transactionId: transaction._id
      },
      message: 'Wallet debited successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/credit', authMiddleware, async (req, res) => {
  try {
    const { amount, description, orderId, reference } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    let wallet = await Wallet.findOne({ user: req.user.id, deletedAt: null });
    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user.id,
        balance: 0,
        currency: 'NGN',
        isActive: true
      });
    }

    wallet.balance += amount;
    await wallet.save();

    const transaction = new WalletTransaction({
      wallet: wallet._id,
      user: req.user.id,
      type: 'credit',
      amount: amount,
      description: description || 'Wallet credit',
      order: orderId,
      reference: reference || 'CREDIT-' + Date.now(),
      status: 'completed'
    });
    await transaction.save();

    res.json({
      success: true,
      data: {
        newBalance: wallet.balance,
        amount: amount,
        transactionId: transaction._id
      },
      message: 'Wallet credited successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/balance-check', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.query;

    const wallet = await Wallet.findOne({ user: req.user.id, deletedAt: null });
    if (!wallet) {
      return res.json({
        success: true,
        data: { sufficient: false, balance: 0, required: parseFloat(amount) || 0 }
      });
    }

    const sufficient = wallet.balance >= (parseFloat(amount) || 0);

    res.json({
      success: true,
      data: {
        sufficient,
        balance: wallet.balance,
        required: parseFloat(amount) || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;