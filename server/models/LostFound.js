const mongoose = require('mongoose');

const lostFoundSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['Lost', 'Found'],
      required: true
    },
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    itemDate: {
      type: Date,
      required: true
    },
    contactInfo: {
      type: String,
      required: true,
      trim: true
    },
    imageUrl: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Open', 'Claimed', 'Closed'],
      default: 'Open'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for matching candidate queries and sorting
lostFoundSchema.index({ type: 1, status: 1 });
lostFoundSchema.index({ status: 1, createdAt: -1 });
lostFoundSchema.index({ type: 1, itemDate: -1 });

module.exports = mongoose.model('LostFound', lostFoundSchema);
