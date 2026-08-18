require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const socketManager = require('./socket/socketManager');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskDetailRoutes = require('./routes/taskDetailRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

connectDB();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());

// Serves uploaded task attachments (feature #3). Files live on local disk
// under server/uploads — fine for a single-instance deployment; swap for S3
// (or similar) if this ever needs to scale horizontally.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'TeamTask API' }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskDetailRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

const httpServer = http.createServer(app);
socketManager.init(httpServer);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`TeamTask API + Socket.IO running on port ${PORT}`));
