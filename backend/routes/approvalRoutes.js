const express = require('express');
const approvalController = require('../controllers/approvalController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// POST /approvals — Create Approval Request (Procurement Officer only)
router.post(
  '/approvals',
  authorizeRoles('PROCUREMENT_OFFICER'),
  approvalController.create
);

// PATCH /approvals/:id/approve — Approve Request (Manager only)
router.patch(
  '/approvals/:id/approve',
  authorizeRoles('MANAGER'),
  approvalController.approve
);

// PATCH /approvals/:id/reject — Reject Request (Manager only)
router.patch(
  '/approvals/:id/reject',
  authorizeRoles('MANAGER'),
  approvalController.reject
);

// GET /approvals/:id — View Approval details (Manager, Procurement Officer, Admin)
router.get(
  '/approvals/:id',
  authorizeRoles('MANAGER', 'PROCUREMENT_OFFICER', 'ADMIN'),
  approvalController.getById
);

module.exports = router;
