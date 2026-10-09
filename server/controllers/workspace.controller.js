const crypto = require('crypto');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Board = require('../models/Board');
const Task = require('../models/Task');
const Doc = require('../models/Doc');
const Folder = require('../models/Folder');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Comment = require('../models/Comment');
const apiResponse = require('../utils/apiResponse');

const generateInviteCode = () => {
  return crypto.randomBytes(4).toString('hex'); // 8 chars unique invite code
};

const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.userId;

    let inviteCode = generateInviteCode();
    let codeExists = await Workspace.findOne({ inviteCode });
    while (codeExists) {
      inviteCode = generateInviteCode();
      codeExists = await Workspace.findOne({ inviteCode });
    }

    const workspace = await Workspace.create({
      name,
      description,
      owner: userId,
      members: [{ user: userId, role: 'admin' }],
      inviteCode,
    });

    // Add to user's workspaces
    await User.findByIdAndUpdate(userId, {
      $push: { workspaces: workspace._id },
    });

    return apiResponse.success(res, workspace, 'Workspace created successfully', 201);
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getUserWorkspaces = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Find all workspaces where the user is a member
    const workspaces = await Workspace.find({ 'members.user': userId })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar bio');

    return apiResponse.success(res, workspaces, 'Workspaces fetched successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const getWorkspaceById = async (req, res) => {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar bio')
      .populate('boards');

    if (!workspace) {
      return apiResponse.error(res, 'Workspace not found', 404);
    }

    return apiResponse.success(res, workspace, 'Workspace fetched successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const updateWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const workspace = await Workspace.findByIdAndUpdate(
      id,
      { name, description },
      { new: true, runValidators: true }
    );

    return apiResponse.success(res, workspace, 'Workspace updated successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id);

    if (!workspace) {
      return apiResponse.error(res, 'Workspace not found', 404);
    }

    // Double check: Owner only!
    if (workspace.owner.toString() !== req.user.userId.toString()) {
      return apiResponse.error(res, 'Only the owner can delete the workspace', 403);
    }

    // Cascade delete: delete boards, tasks, docs, and clean users workspaces array
    await Board.deleteMany({ workspace: id });
    await Task.deleteMany({ workspace: id });
    await Doc.deleteMany({ workspace: id });
    await Folder.deleteMany({ workspace: id });
    const conversations = await Conversation.find({ workspace: id }).select('_id');
    const conversationIds = conversations.map((c) => c._id);
    await Message.deleteMany({ conversation: { $in: conversationIds } });
    await Conversation.deleteMany({ workspace: id });

    // Pull from users
    await User.updateMany({ workspaces: id }, { $pull: { workspaces: id } });

    await Workspace.findByIdAndDelete(id);

    return apiResponse.success(res, null, 'Workspace and all associated contents deleted');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const joinWorkspace = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.userId;

    const workspace = await Workspace.findOne({ inviteCode });
    if (!workspace) {
      return apiResponse.error(res, 'Invalid invite code', 404);
    }

    const isMember = workspace.members.some(m => m.user.toString() === userId.toString());
    if (isMember) {
      return apiResponse.error(res, 'You are already a member of this workspace', 400);
    }

    // Add user as member
    workspace.members.push({ user: userId, role: 'member' });
    await workspace.save();

    // Add to user workspaces
    await User.findByIdAndUpdate(userId, {
      $push: { workspaces: workspace._id },
    });

    const populatedWorkspace = await Workspace.findById(workspace._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar bio');

    return apiResponse.success(res, populatedWorkspace, 'Joined workspace successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const changeMemberRole = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return apiResponse.error(res, 'Invalid role', 400);
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return apiResponse.error(res, 'Workspace not found', 404);
    }

    // Check if target user is workspace owner
    if (workspace.owner.toString() === userId.toString()) {
      return apiResponse.error(res, 'Cannot change role of the owner', 400);
    }

    // Update role
    const member = workspace.members.find(m => m.user.toString() === userId.toString());
    if (!member) {
      return apiResponse.error(res, 'Member not found', 404);
    }

    member.role = role;
    await workspace.save();

    const updated = await Workspace.findById(id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar bio');

    return apiResponse.success(res, updated, 'Member role updated successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return apiResponse.error(res, 'Workspace not found', 404);
    }

    // Check if target user is workspace owner
    if (workspace.owner.toString() === userId.toString()) {
      return apiResponse.error(res, 'Cannot remove the owner of the workspace', 400);
    }

    // Filter member out
    const initialLen = workspace.members.length;
    workspace.members = workspace.members.filter(m => m.user.toString() !== userId.toString());

    if (workspace.members.length === initialLen) {
      return apiResponse.error(res, 'Member not found in workspace', 404);
    }

    await workspace.save();

    // Pull from user workspaces
    await User.findByIdAndUpdate(userId, {
      $pull: { workspaces: id },
    });

    const updated = await Workspace.findById(id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar bio');

    return apiResponse.success(res, updated, 'Member removed successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const regenerateInviteCode = async (req, res) => {
  try {
    const { id } = req.params;

    let inviteCode = generateInviteCode();
    let codeExists = await Workspace.findOne({ inviteCode });
    while (codeExists) {
      inviteCode = generateInviteCode();
      codeExists = await Workspace.findOne({ inviteCode });
    }

    const workspace = await Workspace.findByIdAndUpdate(
      id,
      { inviteCode },
      { new: true }
    );

    return apiResponse.success(res, { inviteCode: workspace.inviteCode }, 'Invite code regenerated');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

module.exports = {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  joinWorkspace,
  changeMemberRole,
  removeMember,
  regenerateInviteCode,
};
