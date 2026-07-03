const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    enrollmentNo: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['student', 'admin', 'department'],
      default: 'student'
    },
    branch: {
      type: String,
      trim: true
    },
    semester: {
      type: Number
    },
    department: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    profileImage: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
