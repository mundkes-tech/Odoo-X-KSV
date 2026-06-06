const express = require('express');
const invoiceController = require('../controllers/invoiceController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// POST /invoices - Generate Invoice (Procurement Officer only)
router.post(
  '/invoices',
  authorizeRoles('PROCUREMENT_OFFICER'),
  invoiceController.create
);

// GET /invoices - View all Invoices (Procurement, Manager, Admin, Vendor)
router.get(
  '/invoices',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER', 'VENDOR'),
  invoiceController.list
);

// GET /invoices/:id - View single Invoice (Procurement, Manager, Admin, Vendor)
router.get(
  '/invoices/:id',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER', 'VENDOR'),
  invoiceController.getById
);

// PATCH /invoices/:id/status - Update Invoice Status (Admin, Manager, Procurement Officer)
router.patch(
  '/invoices/:id/status',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER'),
  invoiceController.updateStatus
);

module.exports = router;
