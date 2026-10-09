const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const Task = require('../models/Task');
const { verifyToken, verifyWorkspaceRole } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const upload = require('../middleware/upload.middleware');
const apiResponse = require('../utils/apiResponse');

router.use(verifyToken);

// Middleware to inject workspaceId from taskId
const injectWorkspaceId = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.body.taskId;
    if (!taskId) return next();
    
    const task = await Task.findById(taskId);
    if (!task) {
      return apiResponse.error(res, 'Task not found', 404);
    }
    req.body.workspaceId = task.workspace.toString();
    next();
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

// Create a task
router.post(
  '/',
  validate([
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('boardId').notEmpty().withMessage('Board ID is required').isMongoId(),
    body('workspaceId').notEmpty().withMessage('Workspace ID is required').isMongoId(),
    body('columnId').notEmpty().withMessage('Column ID is required').isMongoId(),
  ]),
  verifyWorkspaceRole(['admin', 'member']),
  taskController.createTask
);

// Get my tasks
router.get('/my-tasks', taskController.getMyTasks);

// Get workspace tasks
router.get('/workspace/:workspaceId', verifyWorkspaceRole(['admin', 'member', 'viewer']), taskController.getWorkspaceTasks);

// Reorder tasks (drag and drop)
router.patch(
  '/reorder',
  validate([
    body('taskId').notEmpty().withMessage('Task ID is required').isMongoId(),
    body('sourceColumnId').notEmpty().withMessage('Source column ID is required').isMongoId(),
    body('destinationColumnId').notEmpty().withMessage('Destination column ID is required').isMongoId(),
    body('newOrder').isNumeric().withMessage('New order must be a number'),
  ]),
  injectWorkspaceId,
  verifyWorkspaceRole(['admin', 'member']),
  taskController.reorderTask
);

// Get task details
router.get('/:taskId', injectWorkspaceId, verifyWorkspaceRole(['admin', 'member', 'viewer']), taskController.getTaskById);

// Update task
router.patch(
  '/:taskId',
  injectWorkspaceId,
  verifyWorkspaceRole(['admin', 'member']),
  taskController.updateTask
);

// Delete task
router.delete('/:taskId', injectWorkspaceId, verifyWorkspaceRole(['admin', 'member']), taskController.deleteTask);

// Comments
router.post(
  '/:taskId/comments',
  injectWorkspaceId,
  verifyWorkspaceRole(['admin', 'member']),
  validate([
    body('content').notEmpty().withMessage('Comment content cannot be empty').trim(),
  ]),
  taskController.addComment
);

router.delete('/:taskId/comments/:commentId', injectWorkspaceId, verifyWorkspaceRole(['admin', 'member']), taskController.deleteComment);

// Attachments
router.post(
  '/:taskId/attachments',
  upload.single('file'),
  injectWorkspaceId,
  verifyWorkspaceRole(['admin', 'member']),
  taskController.uploadAttachment
);

module.exports = router;
