const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');

const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = http.createServer(app);

// Socket.io initialization
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

app.set('io', io);
require('./socket/socket.handler')(io);

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/workspaces', require('./routes/workspace.routes'));
app.use('/api/boards', require('./routes/board.routes'));
app.use('/api/tasks', require('./routes/task.routes'));
app.use('/api/docs', require('./routes/doc.routes'));
app.use('/api/folders', require('./routes/folder.routes'));
app.use('/api/messages', require('./routes/message.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/users', require('./routes/user.routes'));

// Dev-only route to manually fire cron job
app.get('/api/dev/trigger-reminders', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Production environment',
    });
  }
  const { runReminderJob } = require('./jobs/reminder.job');
  runReminderJob(io);
  return res.json({
    success: true,
    message: 'Cron job manual run triggered successfully',
  });
});

// Root check endpoint
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Collabify API is running smoothly' });
});

// Daily Cron Job (runs at 9:00 AM every day)
const { runReminderJob } = require('./jobs/reminder.job');
cron.schedule('0 9 * * *', () => {
  runReminderJob(io);
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };
