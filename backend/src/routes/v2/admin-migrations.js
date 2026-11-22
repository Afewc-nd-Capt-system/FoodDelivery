'use strict';

const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../../middleware/auth');
const { adminGuard } = require('../../middleware/routeGuards');
const runner = require('../../migrations/runner');

const router = express.Router();
router.use(authMiddleware, adminGuard);

// GET /api/v2/admin/migrations
router.get('/', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const applied = await db.collection('migrations').find({}).sort({ appliedAt: 1 }).toArray();
    const files = runner.listMigrationFiles();
    const appliedNames = new Set(applied.map((doc) => doc.name));
    const pending = files.filter((file) => !appliedNames.has(file.name)).map((file) => file.name);

    res.json({
      success: true,
      status: runner.getMigrationStatus(),
      pending,
      applied,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
