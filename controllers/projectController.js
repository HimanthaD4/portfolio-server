const Project = require('../models/Project');
const sharp = require('sharp');
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

// Helper function to process image data for response
const processImageForResponse = (project, useThumbnail = false) => {
  const projectObj = project.toObject ? project.toObject() : project;
  
  if (projectObj.image) {
    const imageData = useThumbnail ? 
      (projectObj.image.thumbnailData || projectObj.image.optimizedData) : 
      projectObj.image.optimizedData;
    
    if (imageData) {
      projectObj.image = {
        contentType: projectObj.image.contentType,
        data: imageData.toString('base64'),
        size: projectObj.image.optimizedSize,
        originalSize: projectObj.image.originalSize
      };
    } else {
      projectObj.image = undefined;
    }
  }
  
  return projectObj;
};

const processImageForResponse = (project, useThumbnail = false) => {
  const projectObj = project.toObject ? project.toObject() : project;
  
  if (projectObj.image) {
    const imageData = useThumbnail ? 
      (projectObj.image.thumbnailData || projectObj.image.optimizedData) : 
      projectObj.image.optimizedData;
    
    if (imageData) {
      // Return a URL-accessible path instead of base64
      projectObj.image = {
        url: `/api/projects/${projectObj._id}/image${useThumbnail ? '/thumbnail' : ''}`,
        contentType: projectObj.image.contentType,
        size: projectObj.image.optimizedSize,
        originalSize: projectObj.image.originalSize
      };
    } else {
      projectObj.image = undefined;
    }
  }
  
  return projectObj;
};

// Add new route handlers for image serving
const serveImage = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project || !project.image) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    const imageData = req.params.type === 'thumbnail' ? 
      project.image.thumbnailData : 
      project.image.optimizedData;

    if (!imageData) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    res.set('Content-Type', project.image.contentType);
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    res.send(imageData);
  } catch (err) {
    console.error('Error serving image:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAllProjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;
    
    const cacheKey = `projects:${page}:${limit}:${req.query.featured || 'all'}:${req.query.category || 'all'}`;
    
    // Try to get cached data
    const cachedData = await Project.getCached(cacheKey);
    if (cachedData) {
      return res.status(200).json({ 
        success: true, 
        fromCache: true,
        data: cachedData 
      });
    }
    
    // Build query
    const query = {};
    if (req.query.featured) query.featured = req.query.featured === 'true';
    if (req.query.category) query.category = req.query.category;
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }
    
    // Get total count for pagination info
    const total = await Project.countDocuments(query);
    
    // Get projects with optimized projection (excluding full image data for listing)
    const projects = await Project.find(query, {
      title: 1,
      description: 1,
      tags: 1,
      category: 1,
      featured: 1,
      createdAt: 1,
      updatedAt: 1,
      github: 1,
      live: 1,
      'image.contentType': 1,
      'image.thumbnailData': 1
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean(); // Use lean() for faster queries when not needing Mongoose documents
    
    // Process images (using thumbnails for listings)
    const transformedProjects = projects.map(project => 
      processImageForResponse(project, true)
    );
    
    // Cache the result
    await Project.cache(cacheKey, {
      data: transformedProjects,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
    
    res.status(200).json({ 
      success: true,
      fromCache: false,
      data: transformedProjects,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (err) {
    console.error('Error in getAllProjects:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getProjectById = async (req, res) => {
  try {
    const cacheKey = `project:${req.params.id}`;
    
    // Try to get cached data
    const cachedData = await Project.getCached(cacheKey);
    if (cachedData) {
      return res.status(200).json({ 
        success: true, 
        fromCache: true,
        data: cachedData 
      });
    }
    
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const projectObj = processImageForResponse(project);
    
    // Cache the result
    await Project.cache(cacheKey, projectObj);
    
    res.status(200).json({ 
      success: true, 
      fromCache: false,
      data: projectObj 
    });
  } catch (err) {
    console.error('Error in getProjectById:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createProject = async (req, res) => {
  try {
    const { title, description, tags, category, github, live, featured } = req.body;
    
    const parsedTags = typeof tags === 'string' ? 
      tags.split(',').map(tag => tag.trim()) : 
      Array.isArray(tags) ? tags : [];
    
    const image = req.file ? { 
      data: req.file.buffer, 
      contentType: req.file.mimetype 
    } : undefined;

    const project = new Project({
      title,
      description,
      tags: parsedTags,
      category,
      featured: !!featured,
      image,
      github,
      live
    });

    const savedProject = await project.save();
    const projectObj = processImageForResponse(savedProject);
    
    res.status(201).json({ success: true, data: projectObj });
  } catch (err) {
    console.error('Error in createProject:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateProject = async (req, res) => {
  try {
    const { title, description, tags, category, github, live, featured } = req.body;
    
    const parsedTags = typeof tags === 'string' ? 
      tags.split(',').map(tag => tag.trim()) : 
      Array.isArray(tags) ? tags : [];
    
    const updateData = { 
      title, 
      description, 
      tags: parsedTags, 
      category, 
      github, 
      live, 
      featured: !!featured,
      updatedAt: Date.now() 
    };
    
    if (req.file) {
      updateData.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const projectObj = processImageForResponse(updatedProject);
    
    res.status(200).json({ success: true, data: projectObj });
  } catch (err) {
    console.error('Error in updateProject:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.status(200).json({ success: true, data: project });
  } catch (err) {
    console.error('Error in deleteProject:', err);
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