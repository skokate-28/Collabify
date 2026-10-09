const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const boardController = require('../controllers/board.controller');
const Board = require('../models/Board');
const { verifyToken, verifyWorkspaceRole } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const apiResponse = require('../utils/apiResponse');

router.use(verifyToken);

// Middleware to inject workspaceId from boardId
const injectWorkspaceId = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    if (!boardId) return next();
    
    const board = await Board.findById(boardId);
    if (!board) {
      return apiResponse.error(res, 'Board not found', 404);
    }
    req.body.workspaceId = board.workspace.toString();
    next();
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

// Create a board
router.post(
  '/',
  validate([
    body('name').notEmpty().withMessage('Board name is required').trim(),
    body('workspaceId').notEmpty().withMessage('Workspace ID is required').isMongoId(),
  ]),
  verifyWorkspaceRole(['admin']),
  boardController.createBoard
);

// Get workspace boards
router.get('/workspace/:workspaceId', verifyWorkspaceRole(['admin', 'member', 'viewer']), boardController.getWorkspaceBoards);

// Get specific board details
router.get('/:boardId', injectWorkspaceId, verifyWorkspaceRole(['admin', 'member', 'viewer']), boardController.getBoardById);

// Rename board
router.patch(
  '/:boardId',
  injectWorkspaceId,
  verifyWorkspaceRole(['admin']),
  validate([
    body('name').notEmpty().withMessage('Board name is required').trim(),
  ]),
  boardController.updateBoardName
);

// Delete board
router.delete('/:boardId', injectWorkspaceId, verifyWorkspaceRole(['admin']), boardController.deleteBoard);

// Columns management
router.post(
  '/:boardId/columns',
  injectWorkspaceId,
  verifyWorkspaceRole(['admin']),
  validate([
    body('title').notEmpty().withMessage('Column title is required').trim(),
  ]),
  boardController.addColumn
);

router.patch(
  '/:boardId/columns/:columnId',
  injectWorkspaceId,
  verifyWorkspaceRole(['admin']),
  boardController.updateColumn
);

router.delete('/:boardId/columns/:columnId', injectWorkspaceId, verifyWorkspaceRole(['admin']), boardController.deleteColumn);

router.patch(
  '/:boardId/columns/reorder',
  injectWorkspaceId,
  verifyWorkspaceRole(['admin']),
  validate([
    body('orderedColumnIds').isArray().withMessage('orderedColumnIds must be an array'),
  ]),
  boardController.reorderColumns
);

// AI Summary
router.post('/:boardId/ai-summary', injectWorkspaceId, verifyWorkspaceRole(['admin', 'member', 'viewer']), boardController.getBoardAiSummary);

module.exports = router;
