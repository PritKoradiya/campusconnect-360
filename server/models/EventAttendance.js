const mongoose = require('mongoose');

const eventAttendanceSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventRegistration',
      required: true,
      unique: true, // Guarantees a registration can only ever have at most ONE attendance check-in
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    checkedIn: {
      type: Boolean,
      default: true
    },
    checkedInAt: {
      type: Date,
      default: Date.now
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    checkInMethod: {
      type: String,
      enum: ['QR_SCAN', 'MANUAL'],
      default: 'QR_SCAN'
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring at most one attendance record per event + student pair
eventAttendanceSchema.index({ event: 1, student: 1 }, { unique: true });

// Compound indexes for rapid reporting and filtering
eventAttendanceSchema.index({ event: 1, checkedInAt: -1 });
eventAttendanceSchema.index({ student: 1, event: 1 });

module.exports = mongoose.model('EventAttendance', eventAttendanceSchema);
