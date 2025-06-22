const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, JWT_EXPIRE } = process.env;
const router = express.Router();

// Create admin (initial setup)
router.post('/create-admin', async (req, res) => {
  console.log('Creating admin user...');
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.warn('Missing credentials in request');
      return res.status(400).json({ message: 'Username and password required' });
    }

    const existingAdmin = await User.findOne({ username });
    if (existingAdmin) {
      console.warn('Admin already exists:', username);
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const admin = await User.create({ 
      username, 
      password,
      isAdmin: true 
    });

    console.log('Admin created successfully:', admin.username);
    res.status(201).json({ 
      message: 'Admin created successfully',
      admin: { id: admin._id, username: admin.username }
    });
  } catch (err) {
    console.error('Admin creation error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: 'Failed to create admin' });
  }
});

// Login
router.post('/login', async (req, res) => {
  console.log('Login attempt for:', req.body.username);
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      console.warn('Missing credentials in login request');
      return res.status(400).json({ message: 'Username and password required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      console.warn('User not found:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.correctPassword(password, user.password);
    if (!isMatch) {
      console.warn('Password mismatch for user:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    console.log('Login successful for:', username);
    res.json({ 
      message: 'Login successful', 
      isAdmin: user.isAdmin 
    });
  } catch (err) {
    console.error('Login error:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  console.log('Logout request received');
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ message: 'Logged out successfully' });
});

// Check auth status
router.get('/check-auth', async (req, res) => {
  console.log('Checking auth status...');
  try {
    const token = req.cookies.jwt;
    if (!token) {
      console.log('No token found');
      return res.json({ isAuthenticated: false });
    }

    jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
      if (err) {
        console.warn('Invalid token:', err.message);
        return res.json({ isAuthenticated: false });
      }
      console.log('Valid token for user ID:', decodedToken.id);
      res.json({ isAuthenticated: true, isAdmin: true });
    });
  } catch (err) {
    console.error('Auth check error:', err.message);
    res.status(500).json({ message: 'Auth check failed' });
  }
});

module.exports = router;