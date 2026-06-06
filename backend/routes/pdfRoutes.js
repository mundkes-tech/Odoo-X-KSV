const express = require('express');
const pdfController = require('../controllers/pdfController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/purchase-orders/:id/pdf',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER', 'VENDOR'),
  pdfController.purchaseOrderPdf
);

router.get(
  '/invoices/:id/pdf',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER', 'VENDOR'),
  pdfController.invoicePdf
);

module.exports = router;