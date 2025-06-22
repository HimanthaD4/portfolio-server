const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  console.log('Running pre-save for user:', this.username);
  try {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    console.log('Password hashed for user:', this.username);
    next();
  } catch (err) {
    console.error('Password hashing error:', err.message);
    next(err);
  }
});

// Password verification method
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  console.log('Verifying password for user:', this.username);
  try {
    return await bcrypt.compare(candidatePassword, userPassword);
  } catch (err) {
    console.error('Password comparison error:', err.message);
    return false;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;