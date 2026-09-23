const mongoose = require('mongoose');

const eventRegistrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['REGISTERED', 'CANCELLED'],
      default: 'REGISTERED',
      required: true,
      index: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    cancelledAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring at most one registration document per event + student pair
eventRegistrationSchema.index({ event: 1, student: 1 }, { unique: true });

// Compound indexes for rapid status filtering & querying
eventRegistrationSchema.index({ student: 1, status: 1 });
eventRegistrationSchema.index({ event: 1, status: 1, registeredAt: -1 });

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema);
