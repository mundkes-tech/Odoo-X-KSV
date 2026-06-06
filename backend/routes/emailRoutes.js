const express = require('express');
const emailController = require('../controllers/emailController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post(
  '/emails/send-invoice',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER'),
  emailController.invoice
);

router.post(
  '/emails/send-purchase-order',
  authorizeRoles('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER'),
  emailController.purchaseOrder
);

module.exports = router;