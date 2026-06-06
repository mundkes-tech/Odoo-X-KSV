const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/activity-logs',
<<<<<<< HEAD
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER', 'VENDOR'),
=======
  // Allow ADMIN, MANAGER and PROCUREMENT_OFFICER to view activity logs
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER'),
>>>>>>> 511d618 (chore: remove plaintext SMTP secrets and document secure env setup)
  reportController.activityLogs
);

router.get(
  '/activity-logs/:id',
<<<<<<< HEAD
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER', 'VENDOR'),
=======
  // Allow ADMIN, MANAGER and PROCUREMENT_OFFICER to view activity logs
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER'),
>>>>>>> 511d618 (chore: remove plaintext SMTP secrets and document secure env setup)
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