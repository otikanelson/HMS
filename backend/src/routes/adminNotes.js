const express = require('express');
const router = express.Router();
const AdminNote = require('../models/AdminNote');
const { requireAccessLevel } = require('../middleware/auth');

// All routes require ADMINISTRATOR access
router.use(requireAccessLevel('ADMINISTRATOR'));

// GET / - List all notes for the current admin
router.get('/', async (req, res) => {
  try {
    const notes = await AdminNote.find({ createdBy: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(notes);
  } catch (error) {
    console.error('Error fetching admin notes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notes',
      message: error.message 
    });
  }
});

// POST / - Create a new note
router.post('/', async (req, res) => {
  try {
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ 
        error: 'Note body is required' 
      });
    }

    if (body.length > 1000) {
      return res.status(400).json({ 
        error: 'Note body cannot exceed 1000 characters' 
      });
    }

    const note = new AdminNote({
      body: body.trim(),
      createdBy: req.user.userId
    });

    await note.save();

    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating admin note:', error);
    res.status(500).json({ 
      error: 'Failed to create note',
      message: error.message 
    });
  }
});

// PUT /:id - Update a note (ownership check)
router.put('/:id', async (req, res) => {
  try {
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ 
        error: 'Note body is required' 
      });
    }

    if (body.length > 1000) {
      return res.status(400).json({ 
        error: 'Note body cannot exceed 1000 characters' 
      });
    }

    // Find by both _id AND createdBy - returns null if not found or belongs to someone else
    const note = await AdminNote.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.userId },
      { body: body.trim() },
      { new: true, runValidators: true }
    );

    if (!note) {
      // Return 404 regardless of whether note doesn't exist or belongs to someone else
      // This prevents information leakage about other admins' notes
      return res.status(404).json({ 
        error: 'Note not found' 
      });
    }

    res.json(note);
  } catch (error) {
    console.error('Error updating admin note:', error);
    res.status(500).json({ 
      error: 'Failed to update note',
      message: error.message 
    });
  }
});

// DELETE /:id - Delete a note (ownership check)
router.delete('/:id', async (req, res) => {
  try {
    // Find by both _id AND createdBy - returns null if not found or belongs to someone else
    const note = await AdminNote.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.userId
    });

    if (!note) {
      // Return 404 regardless of whether note doesn't exist or belongs to someone else
      return res.status(404).json({ 
        error: 'Note not found' 
      });
    }

    res.json({ 
      message: 'Note deleted successfully',
      noteId: note._id 
    });
  } catch (error) {
    console.error('Error deleting admin note:', error);
    res.status(500).json({ 
      error: 'Failed to delete note',
      message: error.message 
    });
  }
});

module.exports = router;
