const Project = require('../models/Project');

// Get all projects
const getAllProjects = async (req, res) => {
  try {
    console.log('Attempting to fetch all projects');
    const projects = await Project.find({}).sort({ createdAt: -1 });
    
    console.log(`Successfully fetched ${projects.length} projects`);
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
    console.error('Error in getAllProjects:', {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch projects',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get single project
const getProjectById = async (req, res) => {
  try {
    console.log(`Attempting to fetch project with ID: ${req.params.id}`);
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      console.warn(`Project not found with ID: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    console.log(`Successfully fetched project: ${project.title}`);
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
    console.error('Error in getProjectById:', {
      id: req.params.id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch project',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Create project
const createProject = async (req, res) => {
  try {
    console.log('Attempting to create new project with data:', req.body);
    const { title, description, tags, category, github, live, featured } = req.body;
    
    const projectData = {
      title,
      description,
      tags: Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()),
      category,
      github,
      live,
      featured: featured === 'true'
    };

    if (req.file) {
      console.log('Processing uploaded image for new project');
      projectData.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        size: req.file.size
      };
    }

    const project = new Project(projectData);
    await project.save();
    
    console.log(`Successfully created new project: ${project.title} (ID: ${project._id})`);
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    console.error('Error in createProject:', {
      body: req.body,
      file: req.file ? true : false,
      message: err.message,
      stack: err.stack,
      validationErrors: err.errors
    });
    res.status(400).json({ 
      success: false, 
      message: 'Failed to create project',
      error: err.message,
      ...(err.errors && { validationErrors: err.errors })
    });
  }
};

// Update project - FIXED VERSION with corrected syntax
const updateProject = async (req, res) => {
  try {
    console.log(`Attempting to update project with ID: ${req.params.id}`);
    console.log('Update data received:', req.body);
    console.log('File received for update:', req.file ? true : false);

    // Find the existing project
    const project = await Project.findById(req.params.id);
    if (!project) {
      console.warn(`Project not found with ID: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Update all fields
    project.title = req.body.title || project.title;
    project.description = req.body.description || project.description;
    project.tags = req.body.tags ? 
      (Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',').map(tag => tag.trim()))
      : project.tags;
    project.category = req.body.category || project.category;
    project.featured = req.body.featured ? req.body.featured === 'true' : project.featured;
    project.github = req.body.github || project.github;
    project.live = req.body.live || project.live;
    project.updatedAt = Date.now();

    // Handle image update
    if (req.file) {
      console.log('Processing new image for update - replacing old image');
      // Completely replace the old image with the new one
      project.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        size: req.file.size
      };
    } else if (req.body.removeImage === 'true') {
      console.log('Removing existing image');
      project.image = undefined; // Use undefined instead of null for proper MongoDB removal
    }

    // Force Mongoose to recognize image as modified
    if (req.file || req.body.removeImage === 'true') {
      project.markModified('image');
    }

    await project.save();
    
    console.log(`Successfully updated project: ${project.title} (ID: ${project._id})`);
    res.json({ 
      success: true, 
      data: project,
      message: 'Project updated successfully'
    });
  } catch (err) {
    console.error('Error in updateProject:', {
      id: req.params.id,
      body: req.body,
      file: req.file ? true : false,
      message: err.message,
      stack: err.stack,
      validationErrors: err.errors
    });
    res.status(400).json({ 
      success: false, 
      message: 'Failed to update project',
      error: err.message,
      ...(err.errors && { validationErrors: err.errors })
    });
  }
};








// Delete project
const deleteProject = async (req, res) => {
  try {
    console.log(`Attempting to delete project with ID: ${req.params.id}`);
    const project = await Project.findByIdAndDelete(req.params.id);
    
    if (!project) {
      console.warn(`Project not found for deletion with ID: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    console.log(`Successfully deleted project: ${project.title} (ID: ${project._id})`);
    res.json({ 
      success: true, 
      data: project,
      message: 'Project deleted successfully'
    });
  } catch (err) {
    console.error('Error in deleteProject:', {
      id: req.params.id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete project',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Serve image
const serveImage = async (req, res) => {
  try {
    console.log(`Attempting to serve image for project ID: ${req.params.id}`);
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      console.warn(`Project not found when serving image: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    if (!project.image || !project.image.data) {
      console.warn(`Image not found for project: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    
    console.log(`Serving image for project: ${project.title}`);
    res.set({
      'Content-Type': project.image.contentType,
      'Content-Length': project.image.size,
      'Cache-Control': 'public, max-age=31536000' // 1 year cache
    });
    
    res.send(project.image.data);
  } catch (err) {
    console.error('Error in serveImage:', {
      id: req.params.id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to serve image',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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