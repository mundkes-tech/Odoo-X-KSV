const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/notifications',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER', 'VENDOR'),
  notificationController.list
);

router.patch(
  '/notifications/:id/read',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER', 'VENDOR'),
  notificationController.markRead
);

router.patch(
  '/notifications/read-all',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER', 'VENDOR'),
  notificationController.markAllRead
);

router.delete(
  '/notifications/clear',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER', 'VENDOR'),
  notificationController.clearAll
);

module.exports = router;