const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { requireAuth } = require('../middleware/authMiddleware');

// Public routes
router.post(
  '/',
  contactController.validateContact,
  contactController.createContact
);

// Protected admin routes
router.use(requireAuth);

router.get('/', contactController.getContacts);
router.get('/:id', contactController.getContact);
router.put('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;