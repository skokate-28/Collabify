const jwt = require('jsonwebtoken');

const getId = (payload, key) => {
  if (payload && typeof payload === 'object') return payload[key];
  return payload;
};

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    console.log(`Socket connected: User ${socket.userId}`);

    socket.on('workspace:join', (payload) => {
      const workspaceId = getId(payload, 'workspaceId');
      socket.join(`workspace:${workspaceId}`);
    });

    socket.on('workspace:leave', (payload) => {
      const workspaceId = getId(payload, 'workspaceId');
      socket.leave(`workspace:${workspaceId}`);
    });

    socket.on('board:join', (payload) => {
      const boardId = getId(payload, 'boardId');
      socket.join(`board:${boardId}`);
    });

    socket.on('board:leave', (payload) => {
      const boardId = getId(payload, 'boardId');
      socket.leave(`board:${boardId}`);
    });

    socket.on('doc:join', (payload) => {
      const docId = getId(payload, 'docId');
      socket.join(`doc:${docId}`);
      socket.to(`doc:${docId}`).emit('doc:collaborator', {
        userId: socket.userId,
        userName: payload?.userName,
        color: payload?.color,
        joined: true,
      });
    });

    socket.on('doc:leave', (payload) => {
      const docId = getId(payload, 'docId');
      socket.leave(`doc:${docId}`);
      socket.to(`doc:${docId}`).emit('doc:collaborator', {
        userId: socket.userId,
        joined: false,
      });
    });

    socket.on('doc:typing', ({ docId, content, cursorPosition, userName, color }) => {
      socket.to(`doc:${docId}`).emit('doc:update', {
        docId,
        content,
        userId: socket.userId,
        lastEditedBy: { name: userName },
      });

      socket.to(`doc:${docId}`).emit('cursor:update', {
        docId,
        userId: socket.userId,
        position: cursorPosition,
        userName,
        color,
      });
    });

    socket.on('cursor:move', ({ docId, position, userName, color }) => {
      socket.to(`doc:${docId}`).emit('cursor:update', {
        docId,
        userId: socket.userId,
        position,
        userName,
        color,
      });
    });

    socket.on('dm:join', (payload) => {
      const conversationId = getId(payload, 'conversationId');
      if (conversationId) socket.join(`conversation:${conversationId}`);
    });

    socket.on('dm:leave', (payload) => {
      const conversationId = getId(payload, 'conversationId');
      if (conversationId) socket.leave(`conversation:${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: User ${socket.userId}`);
    });
  });
};
