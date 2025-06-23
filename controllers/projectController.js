const Project = require('../models/Project');

// Get all projects
const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find({}).sort({ createdAt: -1 });
    const projectsWithImages = projects.map(project => ({
      ...project.toObject(),
      image: project.image ? {
        url: `/api/projects/${project._id}/image`,
        contentType: project.image.contentType,
        size: project.image.size
      } : null
    }));
    
    res.json({ success: true, data: projectsWithImages });
  } catch (err) {
    console.error('Error getting projects:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single project
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const projectWithImage = {
      ...project.toObject(),
      image: project.image ? {
        url: `/api/projects/${project._id}/image`,
        contentType: project.image.contentType,
        size: project.image.size
      } : null
    };
    
    res.json({ success: true, data: projectWithImage });
  } catch (err) {
    console.error('Error getting project:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create project
const createProject = async (req, res) => {
  try {
    const { title, description, tags, category, github, live, featured } = req.body;
    
    const project = new Project({
      title,
      description,
      tags: Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()),
      category,
      github,
      live,
      featured: featured === 'true',
      image: req.file ? {
        data: req.file.buffer,
        contentType: req.file.mimetype
      } : null
    });

    await project.save();
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    const updates = {
      ...req.body,
      updatedAt: Date.now()
    };
    
    if (req.file) {
      updates.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }
    
    const project = await Project.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    res.json({ success: true, data: project });
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Serve image
const serveImage = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project || !project.image || !project.image.data) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    
    res.set({
      'Content-Type': project.image.contentType,
      'Content-Length': project.image.size,
      'Cache-Control': 'public, max-age=31536000' // 1 year cache
    });
    
    res.send(project.image.data);
  } catch (err) {
    console.error('Error serving image:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  serveImage
};