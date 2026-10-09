const jwt = require('jsonwebtoken');
const Workspace = require('../models/Workspace');
const apiResponse = require('../utils/apiResponse');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return apiResponse.error(res, 'Access token missing or invalid', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // Contains userId and potentially other details signed
    next();
  } catch (error) {
    return apiResponse.error(res, 'Unauthorized, token expired or invalid', 401);
  }
};

// Middleware to verify user role in a workspace
// Can verify if user is owner, or has role in roles array (e.g. ['admin', 'member'])
const verifyWorkspaceRole = (roles = [], allowOwner = true) => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.id || req.params.workspaceId || req.body.workspaceId;
      if (!workspaceId) {
        return apiResponse.error(res, 'Workspace ID required', 400);
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return apiResponse.error(res, 'Workspace not found', 404);
      }

      const userId = req.user.userId;

      // Check if owner
      const isOwner = workspace.owner.toString() === userId.toString();
      if (allowOwner && isOwner) {
        req.workspace = workspace;
        req.userWorkspaceRole = 'admin'; // Owner is implicit admin
        return next();
      }

      // Check member role
      const member = workspace.members.find(m => m.user.toString() === userId.toString());
      if (!member) {
        return apiResponse.error(res, 'You are not a member of this workspace', 403);
      }

      if (roles.length > 0 && !roles.includes(member.role)) {
        return apiResponse.error(res, 'Forbidden: Insufficient permissions', 403);
      }

      req.workspace = workspace;
      req.userWorkspaceRole = member.role;
      next();
    } catch (error) {
      return apiResponse.error(res, error.message, 500);
    }
  };
};

module.exports = {
  verifyToken,
  verifyWorkspaceRole,
};
