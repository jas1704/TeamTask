const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const attachmentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    fileName: { type: String, required: true }, // name on disk
    url: { type: String, required: true }, // path served by the API, e.g. /uploads/tasks/<fileName>
    mimeType: { type: String },
    size: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const queryReplySchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const querySchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    replies: [queryReplySchema],
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

// A pending (or most-recent) reassignment request/action on a task.
// History of past reassignments lives in the Activity log; this field only
// tracks the CURRENT actionable request, if any.
const reassignmentSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    suggestedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, trim: true },
    requestedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { _id: false }
);

// Visibility controls who besides project owner/co-owner can see the task.
//   project           -> everyone with project access (default, current behavior)
//   assignees-only     -> only the assignees + creator
//   selected           -> project + `users` list (in addition to assignees/creator)
//   owner-only         -> only owner/co-owner of the project + creator
const visibilitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['project', 'assignees-only', 'selected', 'owner-only'], default: 'project' },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    status: { type: String, enum: ['todo', 'in-progress', 'completed'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date },

    // Multiple assignees (feature #1). assignedTo is kept as a virtual
    // shim below for any code/UI that still reads a single assignee.
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    links: [linkSchema],
    attachments: [attachmentSchema],
    queries: [querySchema],

    // Subtasks: a subtask is just a Task with parentTask set. It is NOT
    // required to share the parent's assignees.
    parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null, index: true },

    visibility: { type: visibilitySchema, default: () => ({ type: 'project', users: [] }) },

    reassignment: { type: reassignmentSchema, default: () => ({ status: 'none' }) },
  },
  { timestamps: true }
);

taskSchema.index({ title: 'text', description: 'text' });

// Backward-compatible virtual: first assignee, for any old code/UI path
// that expects a single `assignedTo`.
taskSchema.virtual('assignedTo').get(function () {
  return this.assignees && this.assignees.length ? this.assignees[0] : null;
});

taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Task', taskSchema);
