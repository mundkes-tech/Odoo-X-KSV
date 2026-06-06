const express = require('express');
const comparisonController = require('../controllers/comparisonController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// GET /rfqs/:rfqId/comparison — Comparison Access: PROCUREMENT_OFFICER, MANAGER, ADMIN
router.get(
  '/rfqs/:rfqId/comparison',
  authorizeRoles('PROCUREMENT_OFFICER', 'MANAGER', 'ADMIN'),
  comparisonController.comparison
);

// POST /rfqs/:rfqId/select-vendor — Vendor Selection: PROCUREMENT_OFFICER only
router.post(
  '/rfqs/:rfqId/select-vendor',
  authorizeRoles('PROCUREMENT_OFFICER'),
  comparisonController.select
);

module.exports = router;
