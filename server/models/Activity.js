const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'task-created',
        'task-updated',
        'task-status-changed',
        'task-deleted',
        'comment-added',
        'member-invited',
        'member-removed',
        'member-role-changed',
        'project-updated',
        'task-reassigned',
        'reassignment-requested',
        'reassignment-resolved',
        'query-raised',
        'query-resolved',
        'subtask-created',
        'attachment-added',
        'attachment-removed',
        'link-added',
        'link-removed',
      ],
      required: true,
    },
    message: { type: String, required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);
