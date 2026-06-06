const express = require('express');
const rfqController = require('../controllers/rfqController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/rfqs', authorizeRoles('PROCUREMENT_OFFICER'), rfqController.create);
router.get('/rfqs', authorizeRoles('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'), rfqController.list);
router.get('/rfqs/:id', authorizeRoles('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'), rfqController.getById);
router.put('/rfqs/:id', authorizeRoles('PROCUREMENT_OFFICER'), rfqController.update);
router.delete('/rfqs/:id', authorizeRoles('ADMIN'), rfqController.remove);
router.post('/rfqs/:id/assign-vendors', authorizeRoles('PROCUREMENT_OFFICER'), rfqController.assignVendors);
router.get('/rfqs/:id/vendors', authorizeRoles('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'), rfqController.listVendors);
router.get('/vendors/:vendorId/rfqs', authorizeRoles('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'), rfqController.listVendorRfqs);

module.exports = router;
