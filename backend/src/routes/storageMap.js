const express = require('express');
const StorageRange = require('../models/StorageRange');
const PatientFile = require('../models/PatientFile');
const { requireAccessLevel } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const { normalizePatientNumber, locationText, loadRanges } = require('../utils/storageMap');
const router = express.Router();

// GET /api/storage-map - Get all ranges (all roles)
router.get('/', requireAccessLevel('ADMINISTRATOR', 'RECORDS_OPERATOR', 'CLINICAL_STAFF'), async (req, res) => {
  try {
    const ranges = await StorageRange.find()
      .sort({ section: 1, tier: 1, column: 1 });

    res.json({
      ranges: ranges.map(r => ({
        _id: r._id,
        section: r.section,
        tier: r.tier,
        column: r.column,
        fromNumber: r.fromNumber,
        toNumber: r.toNumber,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get storage map error:', error);
    res.status(500).json({
      error: 'Failed to load storage map',
      message: 'Internal server error'
    });
  }
});

// GET /api/storage-map/lookup/:number - Lookup location for a patient number (all roles)
router.get('/lookup/:number', requireAccessLevel('ADMINISTRATOR', 'RECORDS_OPERATOR', 'CLINICAL_STAFF'), async (req, res) => {
  try {
    const normalized = normalizePatientNumber(req.params.number);
    if (!normalized) {
      return res.json({
        number: req.params.number,
        location: null,
        text: 'Invalid patient number'
      });
    }

    const ranges = await StorageRange.find().lean();
    const text = locationText(normalized, ranges);

    res.json({
      number: normalized,
      location: text !== 'Not in the storage map yet' ? text : null,
      text
    });
  } catch (error) {
    console.error('Lookup storage error:', error);
    res.status(500).json({
      error: 'Lookup failed',
      message: 'Internal server error'
    });
  }
});

// POST /api/storage-map - Create a range (ADMINISTRATOR only)
router.post('/', requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const { section, tier, column, fromNumber, toNumber } = req.body;

    // Validation
    if (!section || !tier || !column || !fromNumber || !toNumber) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Section, tier, column, fromNumber, and toNumber are required'
      });
    }

    if (fromNumber > toNumber) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Start number must be less than or equal to end number'
      });
    }

    // Check for overlaps with other ranges
    const overlapping = await StorageRange.findOne({
      $or: [
        { fromNumber: { $lte: toNumber }, toNumber: { $gte: fromNumber } }
      ]
    });

    if (overlapping) {
      return res.status(409).json({
        error: 'Overlap detected',
        message: `Files ${fromNumber} to ${toNumber} overlap Section ${overlapping.section}, Tier ${overlapping.tier}, ${overlapping.column === 'left' ? 'Left' : 'Right'} column (${overlapping.fromNumber} to ${overlapping.toNumber}).`
      });
    }

    // Check for duplicate section/tier/column
    const duplicate = await StorageRange.findOne({ section, tier, column });
    if (duplicate) {
      return res.status(409).json({
        error: 'Duplicate column',
        message: 'A column already exists for this section, tier, and side.'
      });
    }

    const newRange = new StorageRange({
      section,
      tier,
      column,
      fromNumber,
      toNumber
    });

    await newRange.save();

    // Log activity
    await logActivity({
      req,
      action: 'STORAGE_MAP_CHANGED',
      targetType: 'StorageRange',
      targetId: newRange._id,
      targetLabel: `Section ${section} Tier ${tier} ${column}`,
      details: { added: { section, tier, column, fromNumber, toNumber } }
    });

    res.status(201).json({
      message: 'Storage range created',
      range: newRange
    });
  } catch (error) {
    console.error('Create storage range error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate column',
        message: 'A column already exists for this section, tier, and side.'
      });
    }
    res.status(500).json({
      error: 'Failed to create storage range',
      message: 'Internal server error'
    });
  }
});

// PUT /api/storage-map/:id - Update a range (ADMINISTRATOR only)
router.put('/:id', requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const { section, tier, column, fromNumber, toNumber } = req.body;

    const existingRange = await StorageRange.findById(req.params.id);
    if (!existingRange) {
      return res.status(404).json({
        error: 'Range not found',
        message: 'No storage range with that ID'
      });
    }

    // Validation
    if (fromNumber > toNumber) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Start number must be less than or equal to end number'
      });
    }

    // Check for overlaps, excluding this document
    const overlapping = await StorageRange.findOne({
      _id: { $ne: req.params.id },
      $or: [
        { fromNumber: { $lte: toNumber }, toNumber: { $gte: fromNumber } }
      ]
    });

    if (overlapping) {
      return res.status(409).json({
        error: 'Overlap detected',
        message: `Files ${fromNumber} to ${toNumber} overlap Section ${overlapping.section}, Tier ${overlapping.tier}, ${overlapping.column === 'left' ? 'Left' : 'Right'} column (${overlapping.fromNumber} to ${overlapping.toNumber}).`
      });
    }

    // Check for duplicate section/tier/column, excluding this document
    const duplicate = await StorageRange.findOne({
      _id: { $ne: req.params.id },
      section,
      tier,
      column
    });
    if (duplicate) {
      return res.status(409).json({
        error: 'Duplicate column',
        message: 'A column already exists for this section, tier, and side.'
      });
    }

    existingRange.section = section;
    existingRange.tier = tier;
    existingRange.column = column;
    existingRange.fromNumber = fromNumber;
    existingRange.toNumber = toNumber;

    await existingRange.save();

    // Log activity
    await logActivity({
      req,
      action: 'STORAGE_MAP_CHANGED',
      targetType: 'StorageRange',
      targetId: existingRange._id,
      targetLabel: `Section ${section} Tier ${tier} ${column}`,
      details: { updated: { section, tier, column, fromNumber, toNumber } }
    });

    res.json({
      message: 'Storage range updated',
      range: existingRange
    });
  } catch (error) {
    console.error('Update storage range error:', error);
    res.status(500).json({
      error: 'Failed to update storage range',
      message: 'Internal server error'
    });
  }
});

// DELETE /api/storage-map/:id - Delete a range (ADMINISTRATOR only)
router.delete('/:id', requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const range = await StorageRange.findByIdAndDelete(req.params.id);
    if (!range) {
      return res.status(404).json({
        error: 'Range not found',
        message: 'No storage range with that ID'
      });
    }

    // Log activity
    await logActivity({
      req,
      action: 'STORAGE_MAP_CHANGED',
      targetType: 'StorageRange',
      targetId: range._id,
      targetLabel: `Section ${range.section} Tier ${range.tier} ${range.column}`,
      details: { deleted: { section: range.section, tier: range.tier, column: range.column, fromNumber: range.fromNumber, toNumber: range.toNumber } }
    });

    res.json({
      message: 'Storage range deleted',
      range
    });
  } catch (error) {
    console.error('Delete storage range error:', error);
    res.status(500).json({
      error: 'Failed to delete storage range',
      message: 'Internal server error'
    });
  }
});

// GET /api/storage-map/check - Check for gaps (ADMINISTRATOR only)
router.get('/check', requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const ranges = await StorageRange.find().lean();

    if (ranges.length === 0) {
      return res.json({
        gaps: [],
        uncoveredPatients: 0,
        highestCovered: 0,
        lowestCovered: 0
      });
    }

    // Find min and max covered numbers
    let lowestCovered = Infinity;
    let highestCovered = 0;
    ranges.forEach(r => {
      lowestCovered = Math.min(lowestCovered, r.fromNumber);
      highestCovered = Math.max(highestCovered, r.toNumber);
    });

    // Find gaps
    const sortedRanges = ranges.sort((a, b) => a.fromNumber - b.fromNumber);
    const gaps = [];
    for (let i = 0; i < sortedRanges.length - 1; i++) {
      const currentEnd = sortedRanges[i].toNumber;
      const nextStart = sortedRanges[i + 1].fromNumber;
      if (currentEnd < nextStart - 1) {
        gaps.push({
          from: currentEnd + 1,
          to: nextStart - 1
        });
      }
    }

    // Count uncovered patients
    const allPatients = await PatientFile.find().select('patientId').lean();
    const uncoveredPatients = allPatients.filter(p => {
      const num = parseInt(p.patientId, 10);
      for (const range of ranges) {
        if (num >= range.fromNumber && num <= range.toNumber) {
          return false;
        }
      }
      return true;
    }).length;

    res.json({
      gaps: gaps.slice(0, 10),
      uncoveredPatients,
      highestCovered: highestCovered || 0,
      lowestCovered: lowestCovered === Infinity ? 0 : lowestCovered
    });
  } catch (error) {
    console.error('Check storage map error:', error);
    res.status(500).json({
      error: 'Check failed',
      message: 'Internal server error'
    });
  }
});

// POST /api/storage-map/generate - Generate a storage map (ADMINISTRATOR only)
router.post('/generate', requireAccessLevel('ADMINISTRATOR'), async (req, res) => {
  try {
    const { sections = 20, tiers = 3, filesPerColumn = 250, startNumber = 1, replace = false } = req.body;

    // Validation
    if (sections < 1 || sections > 99) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Sections must be between 1 and 99'
      });
    }
    if (tiers < 1 || tiers > 10) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Tiers must be between 1 and 10'
      });
    }
    if (filesPerColumn < 1 || filesPerColumn > 5000) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Files per column must be between 1 and 5000'
      });
    }

    // Check if map is empty
    const existingCount = await StorageRange.countDocuments();
    if (existingCount > 0 && !replace) {
      return res.status(409).json({
        error: 'Storage map not empty',
        message: 'The storage map is not empty. Pass replace: true to overwrite it.'
      });
    }

    // Delete all existing ranges if replace is true
    if (existingCount > 0 && replace) {
      await StorageRange.deleteMany({});
    }

    // Generate ranges
    const ranges = [];
    let currentNumber = startNumber;

    for (let s = 1; s <= sections; s++) {
      for (let t = 1; t <= tiers; t++) {
        for (const col of ['left', 'right']) {
          const fromNumber = currentNumber;
          const toNumber = currentNumber + filesPerColumn - 1;

          ranges.push({
            section: s,
            tier: t,
            column: col,
            fromNumber,
            toNumber
          });

          currentNumber = toNumber + 1;
        }
      }
    }

    // Insert all ranges
    await StorageRange.insertMany(ranges);

    // Log activity
    await logActivity({
      req,
      action: 'STORAGE_MAP_CHANGED',
      targetType: 'StorageRange',
      targetId: null,
      targetLabel: 'Generated storage map',
      details: { generated: { sections, tiers, filesPerColumn, startNumber, totalRanges: ranges.length } }
    });

    res.status(201).json({
      message: `Generated storage map with ${ranges.length} ranges`,
      ranges: ranges.slice(0, 10),
      totalCreated: ranges.length
    });
  } catch (error) {
    console.error('Generate storage map error:', error);
    res.status(500).json({
      error: 'Failed to generate storage map',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
