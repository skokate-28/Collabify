const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const Conversation = require('../models/Conversation');
const { verifyToken, verifyWorkspaceRole } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const apiResponse = require('../utils/apiResponse');

router.use(verifyToken);

const injectWorkspaceFromConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) return next();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return apiResponse.error(res, 'Conversation not found', 404);
    }
    req.body.workspaceId = conversation.workspace.toString();
    next();
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

router.post(
  '/conversations',
  validate([
    body('workspaceId').notEmpty().withMessage('Workspace ID is required').isMongoId(),
    body('recipientId').notEmpty().withMessage('Recipient ID is required').isMongoId(),
  ]),
  verifyWorkspaceRole(['admin', 'member', 'viewer']),
  messageController.getOrCreateConversation
);

router.get(
  '/conversations/workspace/:workspaceId',
  verifyWorkspaceRole(['admin', 'member', 'viewer']),
  messageController.getWorkspaceConversations
);

router.get(
  '/conversations/:conversationId/messages',
  injectWorkspaceFromConversation,
  verifyWorkspaceRole(['admin', 'member', 'viewer']),
  messageController.getMessages
);

router.post(
  '/conversations/:conversationId/messages',
  injectWorkspaceFromConversation,
  verifyWorkspaceRole(['admin', 'member']),
  validate([
    body('content').notEmpty().withMessage('Message content is required').trim(),
  ]),
  messageController.sendMessage
);

router.patch(
  '/conversations/:conversationId/read',
  injectWorkspaceFromConversation,
  verifyWorkspaceRole(['admin', 'member', 'viewer']),
  messageController.markConversationRead
);

module.exports = router;
