const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium'
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Pending'
    },
    imageUrl: {
      type: String,
      default: ''
    },
    adminRemarks: {
      type: String,
      trim: true
    },
    departmentRemarks: {
      type: String,
      trim: true
    },
    resolvedAt: {
      type: Date
    },
    feedback: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ComplaintFeedback',
      default: null
    },
    timeline: [
      {
        eventType: {
          type: String,
          required: true,
          enum: [
            'COMPLAINT_SUBMITTED',
            'COMPLAINT_ASSIGNED',
            'COMPLAINT_STATUS_CHANGED',
            'COMPLAINT_REMARK_ADDED',
            'COMPLAINT_RESOLVED',
            'COMPLAINT_FEEDBACK_SUBMITTED'
          ]
        },
        title: {
          type: String,
          required: true,
          trim: true
        },
        description: {
          type: String,
          trim: true,
          default: ''
        },
        status: {
          type: String,
          enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
          default: null
        },
        actor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null
        },
        actorRole: {
          type: String,
          enum: ['student', 'admin', 'department', 'system'],
          default: 'system'
        },
        actorName: {
          type: String,
          trim: true,
          default: ''
        },
        department: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Department',
          default: null
        },
        departmentName: {
          type: String,
          trim: true,
          default: ''
        },
        remark: {
          type: String,
          trim: true,
          default: ''
        },
        timestamp: {
          type: Date,
          default: Date.now,
          required: true
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

complaintSchema.index({ student: 1, createdAt: -1 });
complaintSchema.index({ department: 1, status: 1 });
complaintSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
