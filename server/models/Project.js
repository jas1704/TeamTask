const mongoose = require('mongoose');
const { ROLES } = require('../utils/permissions');

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ROLES, default: 'member' },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [memberSchema],
    // Per-role overrides for the actions marked 'configurable' in
    // utils/permissions.js, e.g. { member: { createTask: false } }.
    // Only owner/co-owner can edit this (see manageProjectSettings permission).
    rolePermissions: {
      type: Map,
      of: new mongoose.Schema(
        {
          createTask: { type: Boolean },
          assignTask: { type: Boolean },
          changeTaskStatus: { type: Boolean },
        },
        { _id: false }
      ),
      default: {},
    },
  },
  { timestamps: true }
);

projectSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Project', projectSchema);
