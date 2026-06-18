const express = require('express');
const PatientFile = require('../models/PatientFile');
const router = express.Router();

// GET /api/dashboard/stats - Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get basic counts
    const totalPatients = await PatientFile.countDocuments();
    const patientsWithPhone = await PatientFile.countDocuments({ 
      phoneNumber: { $ne: null, $ne: '' } 
    });

    // Get cabinet count (distinct cabinets in use)
    const cabinetStats = await PatientFile.aggregate([
      {
        $group: {
          _id: '$cabinetNumber',
          patientCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get recent patients (last 5 added)
    const recentPatients = await PatientFile.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('patientId fullName cabinetNumber shelfNumber folderNumber createdAt');

    // Add locationDisplay to recent patients
    const recentPatientsWithLocation = recentPatients.map(patient => ({
      ...patient.toObject(),
      locationDisplay: patient.locationDisplay
    }));

    // Storage distribution stats
    const storageStats = await PatientFile.aggregate([
      {
        $group: {
          _id: null,
          maxCabinet: { $max: '$cabinetNumber' },
          maxShelf: { $max: '$shelfNumber' },
          maxFolder: { $max: '$folderNumber' },
          minCabinet: { $min: '$cabinetNumber' },
          minShelf: { $min: '$shelfNumber' },
          minFolder: { $min: '$folderNumber' }
        }
      }
    ]);

    const storage = storageStats[0] || {};

    res.json({
      totalPatients,
      patientsWithPhone,
      cabinetCount: cabinetStats.length,
      recentPatients: recentPatientsWithLocation,
      cabinetDistribution: cabinetStats,
      storage: {
        cabinetRange: `${storage.minCabinet || 1}-${storage.maxCabinet || 1}`,
        shelfRange: `${storage.minShelf || 1}-${storage.maxShelf || 1}`,
        folderRange: `${storage.minFolder || 1}-${storage.maxFolder || 1}`
      },
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve dashboard statistics',
      message: 'Internal server error'
    });
  }
});

// GET /api/dashboard/search-stats - Search performance stats
router.get('/search-stats', async (req, res) => {
  try {
    // This would typically come from a search analytics system
    // For now, we'll return static/calculated stats
    
    const totalFiles = await PatientFile.countDocuments();
    const filesWithPhone = await PatientFile.countDocuments({ 
      phoneNumber: { $ne: null, $ne: '' } 
    });

    res.json({
      searchableFields: {
        patientId: totalFiles,
        fullName: totalFiles,
        phoneNumber: filesWithPhone
      },
      averageSearchTime: '<200ms',
      indexedFields: ['patientId', 'fullName', 'phoneNumber'],
      searchTips: [
        'Search by Patient ID for fastest results',
        'Use partial names for flexible matching',
        'Phone numbers are fully searchable',
        'Search is case-insensitive'
      ]
    });

  } catch (error) {
    console.error('Search stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve search statistics',
      message: 'Internal server error'
    });
  }
});

module.exports = router;