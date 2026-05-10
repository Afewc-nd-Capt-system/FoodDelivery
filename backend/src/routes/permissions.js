const express = require('express');
const Permission = require('../models/Permission');
const authMiddleware = require('../middleware/auth');
const { adminGuard } = require('../middleware/routeGuards');

const router = express.Router();

// Get all permissions (admin only)
router.get('/', authMiddleware, adminGuard, async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ resource: 1, action: 1 });
    res.json({ permissions });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a permission (admin only)
router.put('/:id', authMiddleware, adminGuard, async (req, res) => {
  try {
    const { description, roles } = req.body;
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }

    if (description !== undefined) permission.description = description;
    if (roles !== undefined) permission.roles = roles;

    await permission.save();
    res.json({ permission });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create a permission (admin only)
router.post('/', authMiddleware, adminGuard, async (req, res) => {
  try {
    const permission = new Permission(req.body);
    await permission.save();
    res.status(201).json({ permission });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a permission (admin only)
router.delete('/:id', authMiddleware, adminGuard, async (req, res) => {
  try {
    const permission = await Permission.findByIdAndDelete(req.params.id);

    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }

    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
