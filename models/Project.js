const mongoose = require('mongoose');
const sharp = require('sharp');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 50,
    maxlength: 2000
  },
  tags: [String],
  category: {
    type: String,
    required: true,
    enum: ['web', 'ai', 'mobile', 'desktop', 'game', 'embedded', 'other'],
    default: 'web'
  },
  featured: {
    type: Boolean,
    default: false
  },
  image: {
    data: Buffer,
    contentType: String,
    size: Number
  },
  github: String,
  live: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Process image before saving
projectSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  if (this.isModified('image')) {
    try {
      if (this.image.data) {
        // Process image while maintaining quality
        this.image.data = await sharp(this.image.data)
          .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .toBuffer();
        this.image.size = this.image.data.length;
      }
    } catch (err) {
      console.error('Image processing error:', err);
      return next(err);
    }
  }
  
  next();
});

module.exports = mongoose.model('Project', projectSchema);