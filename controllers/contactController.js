const Contact = require('../models/ContactModel');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');

// @desc    Create new contact message
// @route   POST /api/contact
// @access  Public
exports.createContact = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, phone, message } = req.body;

  const contact = await Contact.create({
    email,
    phone,
    message
  });

  res.status(201).json({
    success: true,
    data: contact,
    message: 'Thank you for your message!'
  });
});

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private/Admin
exports.getContacts = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  
  let query = {};
  
  if (status) {
    query.status = status;
  }
  
  if (search) {
    query.$text = { $search: search };
  }

  const contacts = await Contact.find(query)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: contacts.length,
    data: contacts
  });
});

// @desc    Get single contact message
// @route   GET /api/contact/:id
// @access  Private/Admin
exports.getContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact message not found'
    });
  }

  res.status(200).json({
    success: true,
    data: contact
  });
});

// @desc    Update contact message status
// @route   PUT /api/contact/:id
// @access  Private/Admin
exports.updateContact = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact message not found'
    });
  }

  res.status(200).json({
    success: true,
    data: contact,
    message: 'Contact updated successfully'
  });
});

// @desc    Delete contact message
// @route   DELETE /api/contact/:id
// @access  Private/Admin
exports.deleteContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findByIdAndDelete(req.params.id);

  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact message not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {},
    message: 'Contact deleted successfully'
  });
});

// Validation rules
exports.validateContact = [
  body('email')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Phone number too long')
    .matches(/^[0-9+-\s]+$/).withMessage('Phone number contains invalid characters'),
  body('message')
    .trim()
    .isLength({ min: 10 }).withMessage('Message must be at least 10 characters')
    .isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters')
];