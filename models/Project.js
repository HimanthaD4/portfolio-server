const mongoose = require('mongoose');
const redis = require('redis');
const sharp = require('sharp');

// Redis client setup with modern syntax
let redisClient;

// Initialize Redis connection if URL is provided
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  
  (async () => {
    try {
      await redisClient.connect();
      console.log('Redis connected successfully');
    } catch (err) {
      console.error('Redis connection failed:', err);
    }
  })();
} else {
  console.warn('REDIS_URL not provided - caching disabled');
}

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
    data: Buffer,          // Original image data
    optimizedData: Buffer, // Stores optimized image
    thumbnailData: Buffer, // Stores thumbnail for listings
    contentType: String,
    originalSize: Number,  // Original file size
    optimizedSize: Number  // Optimized file size
  },
  github: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
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
        return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
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
    try {
      await this.processImage();
    } catch (err) {
      console.error('Image processing error:', err);
      return next(err);
    }
  }
  
  next();
});

// Image processing method
projectSchema.methods.processImage = async function() {
  if (!this.image.data) return;

  // Store original size
  this.image.originalSize = this.image.data.length;
  
  try {
    // Create optimized version (max width 1200px, 80% quality)
    this.image.optimizedData = await sharp(this.image.data)
      .resize(1200, null, { withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    // Create thumbnail (300px width)
    this.image.thumbnailData = await sharp(this.image.data)
      .resize(300, null, { withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
      
    this.image.optimizedSize = this.image.optimizedData.length;
  } catch (err) {
    console.error('Sharp image processing failed:', err);
    throw err;
  }
};

// Static method for caching
projectSchema.statics.cache = async function(key, data, ttl = 3600) {
  if (!redisClient) return null;
  
  try {
    await redisClient.set(key, JSON.stringify(data), {
      EX: ttl // Set expiration in seconds
    });
    return true;
  } catch (err) {
    console.error('Redis cache error:', err);
    return false;
  }
};

// Static method for getting cached data
projectSchema.statics.getCached = async function(key) {
  if (!redisClient) return null;
  
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Redis cache error:', err);
    return null;
  }
};

// Graceful shutdown handler
process.on('SIGINT', async () => {
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit(0);
});

module.exports = mongoose.model('Project', projectSchema);