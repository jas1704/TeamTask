const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'task-assigned',
        'task-completed',
        'new-comment',
        'project-invite',
        'task-reassigned',
        'reassignment-requested',
        'reassignment-resolved',
        'query-raised',
        'query-resolved',
        'task-status-changed',
        'task-updated',
        'task-deleted',
        'member-invited',
        'member-removed',
        'member-role-changed',
        'attachment-added',
        'attachment-removed',
        'link-added',
        'link-removed',
        'project',
      ],
      required: true,
    },
    message: { type: String, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
