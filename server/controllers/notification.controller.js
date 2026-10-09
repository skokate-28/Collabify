const Notification = require('../models/Notification');
const apiResponse = require('../utils/apiResponse');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const options = {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: { path: 'sender', select: 'name email avatar' },
    };

    const result = await Notification.paginate({ recipient: userId }, options);

    return apiResponse.success(
      res,
      {
        notifications: result.docs,
        totalDocs: result.totalDocs,
        limit: result.limit,
        page: result.page,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        nextPage: result.nextPage,
        prevPage: result.prevPage,
      },
      'Notifications fetched successfully'
    );
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return apiResponse.error(res, 'Notification not found or access denied', 404);
    }

    return apiResponse.success(res, notification, 'Notification marked as read');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
    return apiResponse.success(res, null, 'All notifications marked as read');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOneAndDelete({ _id: id, recipient: userId });
    if (!notification) {
      return apiResponse.error(res, 'Notification not found or access denied', 404);
    }

    return apiResponse.success(res, null, 'Notification deleted successfully');
  } catch (error) {
    return apiResponse.error(res, error.message, 500);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
