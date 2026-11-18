const express = require('express');
const InventoryItem = require('../models/InventoryItem');
const { requireAccessLevel } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const router = express.Router();

// Helper: normalize name for duplicate checking (lowercase, trim extra spaces)
const normalizeName = (name) => name.toLowerCase().replace(/\s+/g, ' ').trim();

// Helper: escape string for safe regex use
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper: check if name already exists (ignoring case and spaces)
const nameExists = async (name, excludeId = null) => {
  const normalized = normalizeName(name);
  const items = await InventoryItem.find({ isActive: true });
  
  return items.some(item => {
    if (excludeId && item._id.toString() === excludeId.toString()) {
      return false;
    }
    return normalizeName(item.name) === normalized;
  });
};

// GET / - Get all active items with optional filters
router.get('/', async (req, res) => {
  try {
    const { category, q, missingPrice, missingQuantity } = req.query;
    
    // Base query: only active items
    let query = { isActive: true };
    
    // Apply category filter
    if (category && ['drug', 'supply'].includes(category)) {
      query.category = category;
    }
    
    // Apply search query
    if (q) {
      const escaped = escapeRegex(q);
      query.name = { $regex: escaped, $options: 'i' };
    }
    
    // Apply missing price filter
    if (missingPrice === 'true') {
      query.price = null;
    }
    
    // Apply missing quantity filter
    if (missingQuantity === 'true') {
      query.expectedQuantity = null;
    }
    
    // Fetch filtered items sorted by name
    const items = await InventoryItem.find(query)
      .sort({ name: 1 })
      .populate('lastUpdatedBy', 'fullName')
      .lean();
    
    // Always fetch ALL active items for counts (ignore filters)
    const allItems = await InventoryItem.find({ isActive: true });
    
    const counts = {
      total: allItems.length,
      drugs: allItems.filter(i => i.category === 'drug').length,
      supplies: allItems.filter(i => i.category === 'supply').length,
      missingPrice: allItems.filter(i => i.price === null).length,
      missingQuantity: allItems.filter(i => i.expectedQuantity === null).length
    };
    
    res.json({
      items: items.map(item => ({
        ...item,
        lastUpdatedBy: item.lastUpdatedBy?.fullName || null
      })),
      counts
    });
    
  } catch (error) {
    console.error('Inventory fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch inventory',
      message: 'Internal server error'
    });
  }
});

// POST / - Create new inventory item (any logged-in role)
router.post('/', async (req, res) => {
  try {
    const { name, category, unit, expectedQuantity, price, notes } = req.body;
    
    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!category || !['drug', 'supply'].includes(category)) {
      return res.status(400).json({ error: 'Category must be drug or supply' });
    }
    
    // Check for duplicate name
    if (await nameExists(name)) {
      return res.status(400).json({ error: 'That item is already on the list.' });
    }
    
    // Validate and convert numbers
    let parsedPrice = null;
    let parsedQuantity = null;
    
    if (price !== undefined && price !== '' && price !== null) {
      parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice)) {
        return res.status(400).json({ error: 'Price must be a number, zero or more.' });
      }
      if (parsedPrice < 0) {
        return res.status(400).json({ error: 'Price must be a number, zero or more.' });
      }
    }
    
    if (expectedQuantity !== undefined && expectedQuantity !== '' && expectedQuantity !== null) {
      parsedQuantity = parseFloat(expectedQuantity);
      if (isNaN(parsedQuantity)) {
        return res.status(400).json({ error: 'Expected quantity must be a number, zero or more.' });
      }
      if (parsedQuantity < 0) {
        return res.status(400).json({ error: 'Expected quantity must be a number, zero or more.' });
      }
    }
    
    // Create item
    const item = new InventoryItem({
      name: name.trim(),
      category,
      unit: unit && unit.trim() ? unit.trim() : null,
      expectedQuantity: parsedQuantity,
      price: parsedPrice,
      notes: notes && notes.trim() ? notes.trim() : null,
      lastUpdatedBy: req.user.userId
    });
    
    await item.save();
    await item.populate('lastUpdatedBy', 'fullName');
    
    // Log activity
    await logActivity({
      req,
      action: 'INVENTORY_ITEM_ADDED',
      targetType: 'InventoryItem',
      targetId: item._id,
      targetLabel: item.name,
      details: {
        category: item.category,
        unit: item.unit,
        price: item.price,
        expectedQuantity: item.expectedQuantity
      }
    });
    
    res.status(201).json({
      item: {
        ...item.toObject(),
        lastUpdatedBy: item.lastUpdatedBy?.fullName || null
      },
      message: 'Item added'
    });
    
  } catch (error) {
    console.error('Inventory creation error:', error);
    res.status(500).json({
      error: 'Failed to add item',
      message: 'Internal server error'
    });
  }
});

// PUT /:id - Update inventory item (any logged-in role)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, unit, expectedQuantity, price, notes } = req.body;
    
    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }
    
    const item = await InventoryItem.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Build update object and track changes
    const updates = {};
    const changes = {};
    
    // Name
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName && normalizeName(item.name) !== normalizeName(trimmedName)) {
        if (await nameExists(trimmedName, id)) {
          return res.status(400).json({ error: 'That item is already on the list.' });
        }
        changes.name = { from: item.name, to: trimmedName };
        updates.name = trimmedName;
      }
    }
    
    // Category
    if (category !== undefined && ['drug', 'supply'].includes(category)) {
      if (item.category !== category) {
        changes.category = { from: item.category, to: category };
        updates.category = category;
      }
    }
    
    // Unit
    if (unit !== undefined) {
      const newUnit = unit && unit.trim() ? unit.trim() : null;
      if (item.unit !== newUnit) {
        changes.unit = { from: item.unit, to: newUnit };
        updates.unit = newUnit;
      }
    }
    
    // Price
    if (price !== undefined) {
      let newPrice = null;
      if (price !== '' && price !== null) {
        newPrice = parseFloat(price);
        if (isNaN(newPrice)) {
          return res.status(400).json({ error: 'Price must be a number, zero or more.' });
        }
        if (newPrice < 0) {
          return res.status(400).json({ error: 'Price must be a number, zero or more.' });
        }
      }
      if (item.price !== newPrice) {
        changes.price = { from: item.price, to: newPrice };
        updates.price = newPrice;
      }
    }
    
    // Expected Quantity
    if (expectedQuantity !== undefined) {
      let newQuantity = null;
      if (expectedQuantity !== '' && expectedQuantity !== null) {
        newQuantity = parseFloat(expectedQuantity);
        if (isNaN(newQuantity)) {
          return res.status(400).json({ error: 'Expected quantity must be a number, zero or more.' });
        }
        if (newQuantity < 0) {
          return res.status(400).json({ error: 'Expected quantity must be a number, zero or more.' });
        }
      }
      if (item.expectedQuantity !== newQuantity) {
        changes.expectedQuantity = { from: item.expectedQuantity, to: newQuantity };
        updates.expectedQuantity = newQuantity;
      }
    }
    
    // Notes
    if (notes !== undefined) {
      const newNotes = notes && notes.trim() ? notes.trim() : null;
      if (item.notes !== newNotes) {
        changes.notes = { from: item.notes, to: newNotes };
        updates.notes = newNotes;
      }
    }
    
    // If no changes, return without logging
    if (Object.keys(changes).length === 0) {
      return res.json({
        item: await InventoryItem.findById(id).populate('lastUpdatedBy', 'fullName')
          .then(i => ({ ...i.toObject(), lastUpdatedBy: i.lastUpdatedBy?.fullName || null })),
        message: 'No changes made'
      });
    }
    
    // Apply updates
    updates.lastUpdatedBy = req.user.userId;
    Object.assign(item, updates);
    await item.save();
    await item.populate('lastUpdatedBy', 'fullName');
    
    // Log activity only if there were changes
    await logActivity({
      req,
      action: 'INVENTORY_ITEM_UPDATED',
      targetType: 'InventoryItem',
      targetId: item._id,
      targetLabel: item.name,
      details: changes
    });
    
    res.json({
      item: {
        ...item.toObject(),
        lastUpdatedBy: item.lastUpdatedBy?.fullName || null
      },
      message: 'Item updated'
    });
    
  } catch (error) {
    console.error('Inventory update error:', error);
    res.status(500).json({
      error: 'Failed to update item',
      message: 'Internal server error'
    });
  }
});

// DELETE /:id - Remove item (Administrator only)
router.delete('/:id', requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }
    
    const item = await InventoryItem.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (!item.isActive) {
      return res.status(400).json({ error: 'Item is already removed' });
    }
    
    // Soft-delete
    item.isActive = false;
    await item.save();
    
    // Log activity
    await logActivity({
      req,
      action: 'INVENTORY_ITEM_REMOVED',
      targetType: 'InventoryItem',
      targetId: item._id,
      targetLabel: item.name,
      details: { category: item.category }
    });
    
    res.json({ message: 'Item removed from list' });
    
  } catch (error) {
    console.error('Inventory delete error:', error);
    res.status(500).json({
      error: 'Failed to remove item',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
