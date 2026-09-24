const mongoose = require('mongoose');

const complaintFeedbackSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      unique: true // Strictly one feedback per complaint
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer rating'
      }
    },
    resolutionStatus: {
      type: String,
      required: true,
      enum: ['Yes', 'Partially', 'No']
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast lookup and aggregation
complaintFeedbackSchema.index({ student: 1 });
complaintFeedbackSchema.index({ department: 1 });
complaintFeedbackSchema.index({ rating: 1 });
complaintFeedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ComplaintFeedback', complaintFeedbackSchema);
