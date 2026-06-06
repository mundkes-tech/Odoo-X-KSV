const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../services/notificationService');

async function list(req, res, next) {
  try {
    const result = await getNotifications(req.query || {}, req.user);

    return res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function markRead(req, res, next) {
  try {
    const result = await markNotificationRead(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function markAllRead(req, res, next) {
  try {
    const result = await markAllNotificationsRead(req.user);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  markRead,
  markAllRead,
};