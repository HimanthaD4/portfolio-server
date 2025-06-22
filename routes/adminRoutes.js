const express = require('express');
const router = express.Router();

router.get('/dashboard', (req, res) => {
  console.log('Admin dashboard accessed by user ID:', req.userId);
  try {
    res.json({ 
      message: 'Welcome to the admin dashboard',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
});

module.exports = router;