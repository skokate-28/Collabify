const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const workspaceController = require('../controllers/workspace.controller');
const { verifyToken, verifyWorkspaceRole } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.use(verifyToken);

router.post(
  '/',
  validate([
    body('name').notEmpty().withMessage('Workspace name is required').trim(),
  ]),
  workspaceController.createWorkspace
);

router.get('/', workspaceController.getUserWorkspaces);

router.get('/:id', verifyWorkspaceRole(['admin', 'member', 'viewer']), workspaceController.getWorkspaceById);

router.patch(
  '/:id',
  verifyWorkspaceRole(['admin']),
  validate([
    body('name').notEmpty().withMessage('Workspace name is required').trim(),
  ]),
  workspaceController.updateWorkspace
);

router.delete('/:id', verifyWorkspaceRole(['admin']), workspaceController.deleteWorkspace);

router.post(
  '/join',
  validate([
    body('inviteCode').notEmpty().withMessage('Invite code is required').trim(),
  ]),
  workspaceController.joinWorkspace
);

router.patch(
  '/:id/members/:userId/role',
  verifyWorkspaceRole(['admin']),
  validate([
    body('role').isIn(['admin', 'member', 'viewer']).withMessage('Invalid role'),
  ]),
  workspaceController.changeMemberRole
);

router.delete('/:id/members/:userId', verifyWorkspaceRole(['admin']), workspaceController.removeMember);

router.post('/:id/invite/regenerate', verifyWorkspaceRole(['admin']), workspaceController.regenerateInviteCode);

module.exports = router;
