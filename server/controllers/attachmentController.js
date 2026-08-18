const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { loadTaskForUser, POPULATE } = require('./taskController');
const logActivity = require('../utils/activity');
const { getIO } = require('../socket/socketManager');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'tasks');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

// 20MB per file, 5 files per request — generous enough for screenshots,
// logs, and requirement docs without letting a single upload blow up disk.
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 5 },
});

const broadcast = async (task) => {
  await task.populate(POPULATE);
  getIO()?.to(`project:${task.project._id}`).emit('task:updated', { task });
};

// @route POST /api/tasks/:taskId/attachments  (multipart/form-data, field "files")
const uploadAttachments = async (req, res, next) => {
  try {
    const { task, error, status } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });

    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: 'No files provided' });

    for (const file of files) {
      task.attachments.push({
        originalName: file.originalname,
        fileName: file.filename,
        url: `/uploads/tasks/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: req.user._id,
      });
    }
    await task.save();
    await broadcast(task);

    await logActivity({
      projectId: task.project._id,
      actorId: req.user._id,
      type: 'attachment-added',
      message: `${req.user.name} attached ${files.length} file${files.length > 1 ? 's' : ''} to "${task.title}"`,
      taskId: task._id,
    });

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/tasks/:taskId/attachments/:attachmentId
const deleteAttachment = async (req, res, next) => {
  try {
    const { task, error, status } = await loadTaskForUser(req);
    if (error) return res.status(status).json({ message: error });

    const attachment = task.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    const isUploader = attachment.uploadedBy.toString() === req.user._id.toString();
    const isCreator = (task.createdBy._id || task.createdBy).toString() === req.user._id.toString();
    if (!isUploader && !isCreator) {
      return res.status(403).json({ message: 'Only the uploader or task creator can delete this attachment' });
    }

    const filePath = path.join(UPLOAD_DIR, attachment.fileName);
    fs.unlink(filePath, () => {}); // best-effort; don't block on filesystem errors

    attachment.deleteOne();
    await task.save();
    await broadcast(task);

    await logActivity({
      projectId: task.project._id,
      actorId: req.user._id,
      type: 'attachment-removed',
      message: `${req.user.name} removed an attachment from "${task.title}"`,
      taskId: task._id,
    });

    res.json({ task });
  } catch (err) {
    next(err);
  }
};

module.exports = { upload, uploadAttachments, deleteAttachment };
