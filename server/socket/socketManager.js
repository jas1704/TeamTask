/**
 * Central Socket.IO manager.
 *
 * Room model (this is the whole mental model — everything else is detail):
 *   user:<userId>      → private channel for one person. Used for notifications.
 *   project:<projectId> → shared channel for everyone currently viewing that project.
 *                          Used for task/comment/activity/presence broadcasts.
 *
 * A socket joins `user:<userId>` automatically on connect (so notifications always
 * reach every open tab), and joins/leaves `project:<projectId>` explicitly, driven
 * by the client mounting/unmounting the ProjectDetail page.
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');

let io = null;

// projectId -> Map<userId, number of open sockets/tabs for that user in that project>
// A ref-count (not a Set of sockets) so that if a user has the project open in two
// tabs, closing one tab doesn't make them look "offline" to their teammates.
const presence = new Map();

const getProjectPresenceMap = (projectId) => {
  if (!presence.has(projectId)) presence.set(projectId, new Map());
  return presence.get(projectId);
};

const getOnlineUserIds = (projectId) => {
  const map = presence.get(projectId);
  if (!map) return [];
  return [...map.entries()].filter(([, count]) => count > 0).map(([userId]) => userId);
};

const broadcastPresence = (projectId) => {
  io.to(`project:${projectId}`).emit('presence:update', {
    projectId,
    onlineUserIds: getOnlineUserIds(projectId),
  });
};

const addPresence = (projectId, userId) => {
  const map = getProjectPresenceMap(projectId);
  map.set(userId, (map.get(userId) || 0) + 1);
  broadcastPresence(projectId);
};

const removePresence = (projectId, userId) => {
  const map = getProjectPresenceMap(projectId);
  if (!map.has(userId)) return;
  const next = (map.get(userId) || 1) - 1;
  if (next <= 0) map.delete(userId);
  else map.set(userId, next);
  broadcastPresence(projectId);
};

function init(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || '*', credentials: true },
  });

  // --- Auth handshake -------------------------------------------------
  // Every socket connection must present the same JWT the REST API uses.
  // This runs once, before 'connection', and rejects the handshake outright
  // (rather than letting an anonymous socket connect and blocking it later).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Not authorized: no token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('Not authorized: user no longer exists'));
      socket.userId = user._id.toString();
      socket.userName = user.name;
      next();
    } catch (err) {
      next(new Error('Not authorized: invalid or expired token'));
    }
  });

  // --- Connection lifecycle -------------------------------------------
  io.on('connection', (socket) => {
    // Personal room for this user — every tab/device they have open joins it.
    socket.join(`user:${socket.userId}`);

    // Track which project rooms THIS socket has joined, so we can clean up
    // presence correctly on disconnect without the client having to tell us.
    socket.joinedProjects = new Set();

    socket.on('project:join', async (projectId) => {
      try {
        if (!projectId || socket.joinedProjects.has(projectId)) return;
        // Verify membership server-side — never trust the client's say-so.
        const project = await Project.findById(projectId).select('members');
        if (!project) return;
        const isMember = project.members.some((m) => m.user.toString() === socket.userId);
        if (!isMember) return;

        socket.join(`project:${projectId}`);
        socket.joinedProjects.add(projectId);
        addPresence(projectId, socket.userId);
      } catch (err) {
        console.error('project:join error', err.message);
      }
    });

    socket.on('project:leave', (projectId) => {
      if (!projectId || !socket.joinedProjects.has(projectId)) return;
      socket.leave(`project:${projectId}`);
      socket.joinedProjects.delete(projectId);
      removePresence(projectId, socket.userId);
    });

    socket.on('disconnect', () => {
      // Leaving a room happens automatically on disconnect, but presence
      // bookkeeping is ours to clean up so teammates see an accurate list.
      for (const projectId of socket.joinedProjects) {
        removePresence(projectId, socket.userId);
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { init, getIO, getOnlineUserIds };
