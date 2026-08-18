const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('./email');
const { getIO } = require('../socket/socketManager');

// Only important events are emailed. Normal project activity remains available
// inside TeamTask so users do not get flooded with email for every small change.
const EMAIL_NOTIFICATION_TYPES = new Set([
  'task-assigned',
  'task-completed',
  'new-comment',
  'project-invite',
  'task-reassigned',
  'reassignment-requested',
  'reassignment-resolved',
  'query-raised',
  'query-resolved',
]);

const SUBJECTS = {
  'task-assigned': 'You were assigned a task',
  'task-completed': 'A task was completed',
  'new-comment': 'New comment on a task',
  'project-invite': 'You were added to a project',
  'task-reassigned': 'A task was reassigned',
  'reassignment-requested': 'Task reassignment requested',
  'reassignment-resolved': 'Task reassignment request updated',
  'query-raised': 'New task query',
  'query-resolved': 'Your task query was resolved',
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildEmail = ({ userName, message, projectName, taskTitle }) => {
  const safeMessage = escapeHtml(message);
  const safeProject = escapeHtml(projectName || 'TeamTask');
  const safeTask = escapeHtml(taskTitle);

  const taskBlock = taskTitle
    ? `<p style="margin:0 0 16px;color:#475569;"><strong>Task:</strong> ${safeTask}</p>`
    : '';

  return {
    text: `Hi ${userName || 'there'},\n\n${message}\n\n${projectName ? `Project: ${projectName}\n` : ''}${taskTitle ? `Task: ${taskTitle}\n` : ''}\nOpen TeamTask to view the details.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
        <div style="background:#0f172a;color:white;padding:16px 20px;border-radius:10px 10px 0 0;">
          <strong style="font-size:20px;">TeamTask</strong>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:0;padding:24px;border-radius:0 0 10px 10px;">
          <p style="margin-top:0;">Hi ${escapeHtml(userName || 'there')},</p>
          <p>${safeMessage}</p>
          ${taskBlock}
          <p style="margin:0 0 8px;color:#475569;"><strong>Project:</strong> ${safeProject}</p>
          <p style="margin-top:24px;color:#64748b;font-size:13px;">You received this email because of an important activity in TeamTask.</p>
        </div>
      </div>
    `,
  };
};

/**
 * Creates an in-app notification, pushes it over Socket.IO, and for important
 * notification types also sends an email through the configured SMTP provider.
 * Email failures never prevent the in-app notification from being created.
 */
const notify = async ({ userId, actorId, type, message, project, task }) => {
  if (!userId) return;
  if (actorId && actorId.toString() === userId.toString()) return;

  let notification;

  try {
    notification = await Notification.create({ user: userId, type, message, project, task });
    const populated = await notification.populate([
      { path: 'project', select: 'name' },
      { path: 'task', select: 'title' },
    ]);

    const io = getIO();
    if (io) {
      const unreadCount = await Notification.countDocuments({ user: userId, read: false });
      io.to(`user:${userId}`).emit('notification:new', { notification: populated, unreadCount });
    }

    if (EMAIL_NOTIFICATION_TYPES.has(type)) {
      try {
        const user = await User.findById(userId).select('name email');
        if (user?.email) {
          const email = buildEmail({
            userName: user.name,
            message,
            projectName: populated.project?.name,
            taskTitle: populated.task?.title,
          });

          await sendEmail({
            to: user.email,
            subject: `TeamTask — ${SUBJECTS[type] || 'New notification'}`,
            ...email,
          });
        }
      } catch (emailErr) {
        console.error(`Failed to send ${type} email notification:`, emailErr.message);
      }
    }
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

module.exports = notify;
