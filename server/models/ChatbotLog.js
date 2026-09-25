const mongoose = require('mongoose');

const chatbotLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    question: {
      type: String,
      required: true,
      trim: true
    },
    answer: {
      type: String,
      required: true,
      trim: true
    },
    intent: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

chatbotLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ChatbotLog', chatbotLogSchema);
