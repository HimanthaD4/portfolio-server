const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const upload = require('../config/multer'); 

// Routes
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', upload.single('image'), projectController.createProject);
router.put('/:id', upload.single('image'), projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.get('/:id/image', projectController.serveImage);

module.exports = router;