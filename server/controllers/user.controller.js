const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Task = require('../models/Task');
const { uploadToCloudinary } = require('../config/cloudinary');
const apiResponse = require('../utils/apiResponse');

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const totalWorkspaces = await Workspace.countDocuments({ 'members.user': userId });
    const totalTasksAssigned = await Task.countDocuments({ assignees: userId });

    const tasksDueToday = await Task.countDocuments({
      assignees: userId,
      dueDate: { $gte: startOfToday, $lte: endOfToday },
    });

    const overdueTasksList = await Task.find({
      assignees: userId,
      dueDate: { $lt: new Date() },
    }).populate('board');

    const overdueTasks = overdueTasksList.filter(task => {
      if (!task.board) return true;
      const col = task.board.columns.find(c => c._id.toString() === task.columnId.toString());
      return col ? col.title.toLowerCase() !== 'done' : true;
    }).length;

    return apiResponse.success(
      res,
      {
        totalWorkspaces,
        totalTasksAssigned,
        tasksDueToday,
        overdueTasks,
      },
      'Dashboard stats loaded'
    );
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, bio } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'avatars');
      updateData.avatar = result.secure_url;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    return apiResponse.success(res, user, 'Profile updated successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return apiResponse.error(res, 'New password and confirmation are required', 400);
    }

    if (newPassword !== confirmPassword) {
      return apiResponse.error(res, 'Passwords do not match', 400);
    }

    if (newPassword.length < 6) {
      return apiResponse.error(res, 'Password must be at least 6 characters', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      return apiResponse.error(res, 'User not found', 404);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return apiResponse.success(res, null, 'Password updated successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

module.exports = {
  getDashboardStats,
  updateProfile,
  changePassword,
};
