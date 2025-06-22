const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const multer = require('multer');

const upload = multer();

router.get('/', projectController.getAllProjects);
router.post('/', upload.single('image'), projectController.createProject);
router.get('/:id', projectController.getProjectById);
router.put('/:id', upload.single('image'), projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.get('/projects/:id/image', projectController.serveImage);
router.get('/projects/:id/image/thumbnail', projectController.serveImage);

module.exports = router;