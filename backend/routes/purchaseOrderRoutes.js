const express = require('express');
const purchaseOrderController = require('../controllers/purchaseOrderController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// POST /purchase-orders — Generate Purchase Order (Procurement Officer only)
router.post(
  '/purchase-orders',
  authorizeRoles('PROCUREMENT_OFFICER'),
  purchaseOrderController.create
);

// GET /purchase-orders — View all Purchase Orders (Procurement, Manager, Admin, Vendor)
router.get(
  '/purchase-orders',
  authorizeRoles('PROCUREMENT_OFFICER', 'MANAGER', 'ADMIN', 'VENDOR'),
  purchaseOrderController.getAll
);

// GET /purchase-orders/:id — View single PO (Procurement, Manager, Admin, Vendor)
router.get(
  '/purchase-orders/:id',
  authorizeRoles('PROCUREMENT_OFFICER', 'MANAGER', 'ADMIN', 'VENDOR'),
  purchaseOrderController.getById
);

// PATCH /purchase-orders/:id/status — Update PO Status (Procurement, Manager, Vendor)
router.patch(
  '/purchase-orders/:id/status',
  authorizeRoles('PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'),
  purchaseOrderController.updateStatus
);

module.exports = router;
