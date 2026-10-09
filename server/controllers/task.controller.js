const Task = require('../models/Task');
const Board = require('../models/Board');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadToCloudinary } = require('../config/cloudinary');
const apiResponse = require('../utils/apiResponse');

const createTask = async (req, res) => {
  try {
    const { title, description, boardId, workspaceId, columnId, priority, dueDate, tags } = req.body;
    const userId = req.user.userId;

    // Find current max order in column
    const tasksInCol = await Task.find({ board: boardId, columnId });
    const maxOrder = tasksInCol.reduce((max, t) => (t.order > max ? t.order : max), -1);
    const order = maxOrder + 1;

    const task = await Task.create({
      title,
      description,
      board: boardId,
      workspace: workspaceId,
      columnId,
      priority: priority || 'medium',
      dueDate: dueDate || null,
      tags: tags || [],
      order,
      createdBy: userId,
    });

    const populatedTask = await Task.findById(task._id).populate('assignees', 'name email avatar');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('task:created', { task: populatedTask });
    }

    return apiResponse.success(res, populatedTask, 'Task created successfully', 201);
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getWorkspaceTasks = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const search = (req.query.search || req.query.q || '').trim();
    const filter = { workspace: workspaceId };
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const tasks = await Task.find(filter)
      .populate('assignees', 'name email avatar')
      .populate('board', 'name columns')
      .sort({ updatedAt: -1 })
      .limit(100);
    return apiResponse.success(res, tasks, 'Workspace tasks fetched');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getMyTasks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;

    const tasks = await Task.find({ assignees: userId })
      .populate('assignees', 'name email avatar')
      .populate('board', 'name')
      .limit(limit)
      .sort({ dueDate: 1 });

    return apiResponse.success(res, tasks, 'My tasks fetched');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name email avatar',
        },
      });

    if (!task) {
      return apiResponse.error(res, 'Task not found', 404);
    }

    return apiResponse.success(res, task, 'Task details fetched');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;
    const currentUserId = req.user.userId;

    const task = await Task.findById(taskId);
    if (!task) {
      return apiResponse.error(res, 'Task not found', 404);
    }

    // Keep track of assignees before update to detect new ones
    const previousAssignees = task.assignees.map(id => id.toString());

    // Update fields
    const allowedFields = ['title', 'description', 'priority', 'dueDate', 'tags', 'assignees', 'columnId'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        task[field] = updateData[field];
      }
    });

    await task.save();

    // Fetch user details for notification
    const currentUser = await User.findById(currentUserId);

    // Check for newly added assignees
    const currentAssignees = task.assignees.map(id => id.toString());
    const newAssignees = currentAssignees.filter(id => !previousAssignees.includes(id));

    const io = req.app.get('io');

    for (const assigneeId of newAssignees) {
      if (assigneeId !== currentUserId) {
        const notif = await Notification.create({
          recipient: assigneeId,
          sender: currentUserId,
          type: 'task_assigned',
          message: `"${currentUser.name}" assigned you to the task "${task.title}"`,
          link: `/dashboard/workspace/${task.workspace}/boards/${task.board}`,
        });

        if (io) {
          io.to(`user:${assigneeId}`).emit('notification:new', notif);
        }
      }
    }

    const populatedTask = await Task.findById(taskId)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name email avatar',
        },
      });

    if (io) {
      io.to(`board:${task.board}`).emit('task:updated', { task: populatedTask });
    }

    return apiResponse.success(res, populatedTask, 'Task updated successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) {
      return apiResponse.error(res, 'Task not found', 404);
    }

    // Delete associated comments
    await Comment.deleteMany({ task: taskId });
    await Task.findByIdAndDelete(taskId);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`board:${task.board}`).emit('task:deleted', { taskId, boardId: task.board });
    }

    return apiResponse.success(res, null, 'Task deleted successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const reorderTask = async (req, res) => {
  try {
    const { taskId, sourceColumnId, destinationColumnId, newOrder } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return apiResponse.error(res, 'Task not found', 404);
    }

    const boardId = task.board;

    if (sourceColumnId === destinationColumnId) {
      // Reordering inside the same column
      const tasks = await Task.find({ board: boardId, columnId: sourceColumnId }).sort({ order: 1 });
      const targetIndex = tasks.findIndex(t => t._id.toString() === taskId);
      
      if (targetIndex !== -1) {
        tasks.splice(targetIndex, 1);
        tasks.splice(newOrder, 0, task);
        
        // Save new orders
        for (let i = 0; i < tasks.length; i++) {
          tasks[i].order = i;
          await tasks[i].save();
        }
      }
    } else {
      // Reordering to a different column
      // 1. Re-index source column
      const srcTasks = await Task.find({ board: boardId, columnId: sourceColumnId }).sort({ order: 1 });
      const targetIndex = srcTasks.findIndex(t => t._id.toString() === taskId);
      if (targetIndex !== -1) {
        srcTasks.splice(targetIndex, 1);
      }
      for (let i = 0; i < srcTasks.length; i++) {
        srcTasks[i].order = i;
        await srcTasks[i].save();
      }

      // 2. Insert into destination column
      const destTasks = await Task.find({ board: boardId, columnId: destinationColumnId }).sort({ order: 1 });
      task.columnId = destinationColumnId;
      destTasks.splice(newOrder, 0, task);
      for (let i = 0; i < destTasks.length; i++) {
        destTasks[i].order = i;
        await destTasks[i].save();
      }
    }

    // Emit board update
    const io = req.app.get('io');
    if (io) {
      io.to(`board:${boardId}`).emit('board:updated', { boardId });
    }

    return apiResponse.success(res, null, 'Task reordered successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const addComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content, mentions } = req.body; // mentions: array of user IDs
    const currentUserId = req.user.userId;

    const task = await Task.findById(taskId);
    if (!task) {
      return apiResponse.error(res, 'Task not found', 404);
    }

    const comment = await Comment.create({
      content,
      author: currentUserId,
      task: taskId,
      mentions: mentions || [],
    });

    task.comments.push(comment._id);
    await task.save();

    // Notify mentioned users
    const author = await User.findById(currentUserId);
    const io = req.app.get('io');

    if (mentions && mentions.length > 0) {
      for (const mentionedId of mentions) {
        if (mentionedId !== currentUserId) {
          const notif = await Notification.create({
            recipient: mentionedId,
            sender: currentUserId,
            type: 'mention',
            message: `"${author.name}" mentioned you in a comment on "${task.title}"`,
            link: `/dashboard/workspace/${task.workspace}/boards/${task.board}`,
          });

          if (io) {
            io.to(`user:${mentionedId}`).emit('notification:new', notif);
          }
        }
      }
    }

    // Notify other assignees (who are not the commenter and not already mentioned)
    const assigneesToNotify = task.assignees.filter(
      assigneeId =>
        assigneeId.toString() !== currentUserId &&
        (!mentions || !mentions.includes(assigneeId.toString()))
    );

    for (const assigneeId of assigneesToNotify) {
      const notif = await Notification.create({
        recipient: assigneeId,
        sender: currentUserId,
        type: 'comment_added',
        message: `"${author.name}" commented on "${task.title}"`,
        link: `/dashboard/workspace/${task.workspace}/boards/${task.board}`,
      });

      if (io) {
        io.to(`user:${assigneeId.toString()}`).emit('notification:new', notif);
      }
    }

    const populatedComment = await Comment.findById(comment._id).populate('author', 'name email avatar');

    const populatedTask = await Task.findById(taskId)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name email avatar',
        },
      });

    if (io) {
      io.to(`board:${task.board}`).emit('task:updated', { task: populatedTask });
    }

    return apiResponse.success(res, populatedComment, 'Comment added successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const deleteComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const currentUserId = req.user.userId;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return apiResponse.error(res, 'Comment not found', 404);
    }

    // Check author
    if (comment.author.toString() !== currentUserId) {
      return apiResponse.error(res, 'Only the author can delete this comment', 403);
    }

    await Comment.findByIdAndDelete(commentId);
    await Task.findByIdAndUpdate(taskId, {
      $pull: { comments: commentId },
    });

    const populatedTask = await Task.findById(taskId)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name email avatar',
        },
      });

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${populatedTask.board}`).emit('task:updated', { task: populatedTask });
    }

    return apiResponse.success(res, null, 'Comment deleted successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const uploadAttachment = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!req.file) {
      return apiResponse.error(res, 'No file uploaded', 400);
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return apiResponse.error(res, 'Task not found', 404);
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'attachments');
    
    const attachment = {
      url: result.secure_url,
      name: req.file.originalname,
      uploadedAt: new Date(),
    };

    task.attachments.push(attachment);
    await task.save();

    const populatedTask = await Task.findById(taskId)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name email avatar',
        },
      });

    const io = req.app.get('io');
    if (io) {
      io.to(`board:${task.board}`).emit('task:updated', { task: populatedTask });
    }

    return apiResponse.success(res, attachment, 'Attachment uploaded successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

module.exports = {
  createTask,
  getWorkspaceTasks,
  getMyTasks,
  getTaskById,
  updateTask,
  deleteTask,
  reorderTask,
  addComment,
  deleteComment,
  uploadAttachment,
};
