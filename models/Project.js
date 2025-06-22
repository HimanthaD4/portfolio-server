const mongoose = require('mongoose');
const redis = require('redis');
const { promisify } = require('util');

// Redis client setup
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));

const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.setex).bind(redisClient);

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
    index: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [50, 'Description should be at least 50 characters'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  tags: {
    type: [String],
    required: [true, 'At least one tag is required'],
    validate: {
      validator: function(tags) {
        return tags.length > 0;
      },
      message: 'At least one tag is required'
    },
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['web', 'ai', 'mobile', 'desktop', 'game', 'embedded', 'other'],
    default: 'web',
    index: true
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  image: {
    optimizedData: Buffer,  // Stores optimized image
    thumbnailData: Buffer,  // Stores thumbnail for listings
    contentType: String,
    originalSize: Number,   // Original file size
    optimizedSize: Number   // Optimized file size
  },
  github: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(v);
      },
      message: 'Please enter a valid URL'
    }
  },
  live: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(v);
      },
      message: 'Please enter a valid URL'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Add indexes for frequently queried fields
projectSchema.index({ title: 'text', description: 'text', tags: 'text' });

projectSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // If image is being modified, process it
  if (this.isModified('image') && this.image.data) {
    await this.processImage();
  }
  
  next();
});

// Image processing method
projectSchema.methods.processImage = async function() {
  const sharp = require('sharp');
  const originalBuffer = this.image.data;
  
  // Store original size
  this.image.originalSize = originalBuffer.length;
  
  // Create optimized version (max width 1200px, 80% quality)
  this.image.optimizedData = await sharp(originalBuffer)
    .resize(1200, null, { withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  // Create thumbnail (300px width)
  this.image.thumbnailData = await sharp(originalBuffer)
    .resize(300, null, { withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
    
  this.image.optimizedSize = this.image.optimizedData.length;
  this.image.data = undefined; // Remove the original to save space
};

// Static method for caching
projectSchema.statics.cache = async function(key, data, ttl = 3600) {
  try {
    await setAsync(key, ttl, JSON.stringify(data));
  } catch (err) {
    console.error('Redis cache error:', err);
  }
};

// Static method for getting cached data
projectSchema.statics.getCached = async function(key) {
  try {
    const data = await getAsync(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Redis cache error:', err);
    return null;
  }
};

module.exports = mongoose.model('Project', projectSchema);