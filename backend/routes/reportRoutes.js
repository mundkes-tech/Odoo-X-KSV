const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/activity-logs',
  authorizeRoles('ADMIN', 'MANAGER'),
  reportController.activityLogs
);

router.get(
  '/activity-logs/:id',
  authorizeRoles('ADMIN', 'MANAGER'),
  reportController.activityLogById
);

router.get(
  '/reports/vendor-performance',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER'),
  reportController.vendorPerformance
);

router.get(
  '/reports/spending',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER'),
  reportController.spending
);

router.get(
  '/reports/monthly-trends',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER'),
  reportController.monthlyTrends
);

router.get(
  '/reports/dashboard',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER'),
  reportController.dashboard
);

module.exports = router;