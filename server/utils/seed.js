// Optional: populate the database with demo data.
// Run with: npm run seed  (make sure MONGO_URI is set in .env)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Comment = require('../models/Comment');

const run = async () => {
  await connectDB();
  await Promise.all([User.deleteMany(), Project.deleteMany(), Task.deleteMany(), Comment.deleteMany()]);

  const rahul = await User.create({ name: 'Rahul Sharma', email: 'rahul@example.com', password: 'password123', avatarColor: '#14B8A6' });
  const jaspreet = await User.create({ name: 'Jaspreet Kaur', email: 'jaspreet@example.com', password: 'password123', avatarColor: '#F59E0B' });
  const shivanshu = await User.create({ name: 'Shivanshu Gupta', email: 'shivanshu@example.com', password: 'password123', avatarColor: '#6366F1' });
  const bhavesh = await User.create({ name: 'Bhavesh Patel', email: 'bhavesh@example.com', password: 'password123', avatarColor: '#EC4899' });

  const project = await Project.create({
    name: 'Web Development',
    description: 'Rebuild the marketing site and internal tooling.',
    owner: jaspreet._id,
    members: [
      { user: jaspreet._id, role: 'owner' },
      { user: rahul._id, role: 'co-owner' },
      { user: shivanshu._id, role: 'contributor' },
      { user: bhavesh._id, role: 'member' },
    ],
  });

  const parentTask = await Task.create({
    project: project._id,
    title: 'Fix VictoriaLogs Dashboard',
    description: 'Grafana panel showing stale data for the error-rate query.',
    status: 'in-progress',
    priority: 'high',
    dueDate: new Date(Date.now() + 3 * 86400000),
    assignees: [shivanshu._id],
    createdBy: jaspreet._id,
    links: [{ title: 'Grafana dashboard', url: 'https://grafana.example.com/d/logs', addedBy: jaspreet._id }],
    queries: [
      {
        question: 'Which threshold should we use for the error rate?',
        raisedBy: shivanshu._id,
        replies: [{ text: 'Use 5% based on the project requirement.', author: jaspreet._id }],
        status: 'open',
      },
    ],
  });

  await Task.create({
    project: project._id,
    parentTask: parentTask._id,
    title: 'Investigate error rate',
    status: 'in-progress',
    priority: 'medium',
    assignees: [shivanshu._id],
    createdBy: jaspreet._id,
  });
  await Task.create({
    project: project._id,
    parentTask: parentTask._id,
    title: 'Check LogsQL query',
    status: 'todo',
    priority: 'medium',
    assignees: [bhavesh._id], // subtask assignee differs from parent's assignee, by design
    createdBy: jaspreet._id,
  });

  const task2 = await Task.create({
    project: project._id,
    title: 'Fix Dashboard',
    description: 'Shared front-end bug affecting the summary widgets.',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date(Date.now() + 5 * 86400000),
    assignees: [shivanshu._id, bhavesh._id], // multi-assignee example
    createdBy: rahul._id,
  });

  await Task.create({
    project: project._id,
    title: 'Salary discussion',
    description: 'Private note, not visible to the whole team.',
    status: 'todo',
    priority: 'low',
    assignees: [jaspreet._id],
    createdBy: jaspreet._id,
    visibility: { type: 'selected', users: [rahul._id] },
  });

  await Comment.create({ task: task2._id, author: rahul._id, text: "I'll fix this tonight." });
  await Comment.create({ task: task2._id, author: shivanshu._id, text: 'Please deploy before Friday.' });

  console.log('Seed complete.');
  console.log('Logins (all password123): jaspreet@example.com (owner), rahul@example.com (co-owner),');
  console.log('  shivanshu@example.com (contributor), bhavesh@example.com (member)');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
