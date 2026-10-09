const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const folderController = require('../controllers/folder.controller');
const Folder = require('../models/Folder');
const { verifyToken, verifyWorkspaceRole } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const apiResponse = require('../utils/apiResponse');

router.use(verifyToken);

const injectWorkspaceFromFolder = async (req, res, next) => {
  try {
    const { folderId } = req.params;
    if (!folderId || folderId === 'root') {
      if (req.query.workspaceId) {
        req.body.workspaceId = req.query.workspaceId;
      }
      return next();
    }

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return apiResponse.error(res, 'Folder not found', 404);
    }
    req.body.workspaceId = folder.workspace.toString();
    next();
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

router.post(
  '/',
  validate([
    body('name').notEmpty().withMessage('Folder name is required').trim(),
    body('workspaceId').notEmpty().withMessage('Workspace ID is required').isMongoId(),
  ]),
  verifyWorkspaceRole(['admin', 'member']),
  folderController.createFolder
);

router.get(
  '/workspace/:workspaceId',
  verifyWorkspaceRole(['admin', 'member', 'viewer']),
  folderController.getWorkspaceFolderTree
);

router.get(
  '/:folderId/contents',
  injectWorkspaceFromFolder,
  verifyWorkspaceRole(['admin', 'member', 'viewer']),
  folderController.getFolderContents
);

router.patch(
  '/:folderId/move',
  injectWorkspaceFromFolder,
  verifyWorkspaceRole(['admin', 'member']),
  folderController.moveFolder
);

router.patch(
  '/:folderId',
  injectWorkspaceFromFolder,
  verifyWorkspaceRole(['admin', 'member']),
  folderController.renameFolder
);

router.delete(
  '/:folderId',
  injectWorkspaceFromFolder,
  verifyWorkspaceRole(['admin']),
  folderController.deleteFolder
);

module.exports = router;
