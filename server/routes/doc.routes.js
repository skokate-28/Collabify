const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const docController = require('../controllers/doc.controller');
const Doc = require('../models/Doc');
const { verifyToken, verifyWorkspaceRole } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const apiResponse = require('../utils/apiResponse');

router.use(verifyToken);

const injectWorkspaceId = async (req, res, next) => {
  try {
    const { docId } = req.params;
    if (!docId) return next();

    const doc = await Doc.findById(docId);
    if (!doc) {
      return apiResponse.error(res, 'Document not found', 404);
    }
    req.body.workspaceId = doc.workspace.toString();
    next();
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

router.post(
  '/',
  validate([
    body('workspaceId').notEmpty().withMessage('Workspace ID is required').isMongoId(),
  ]),
  verifyWorkspaceRole(['admin', 'member']),
  docController.createDoc
);

router.get(
  '/workspace/:workspaceId',
  verifyWorkspaceRole(['admin', 'member', 'viewer']),
  docController.getWorkspaceDocs
);

router.get(
  '/:docId',
  injectWorkspaceId,
  verifyWorkspaceRole(['admin', 'member', 'viewer']),
  docController.getDocById
);

router.patch(
  '/:docId/move',
  injectWorkspaceId,
  verifyWorkspaceRole(['admin', 'member']),
  docController.moveDoc
);

router.patch(
  '/:docId',
  injectWorkspaceId,
  verifyWorkspaceRole(['admin', 'member']),
  docController.updateDoc
);

router.delete(
  '/:docId',
  injectWorkspaceId,
  verifyWorkspaceRole(['admin']),
  docController.deleteDoc
);

module.exports = router;
