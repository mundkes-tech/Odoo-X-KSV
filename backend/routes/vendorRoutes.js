const express = require('express');
const vendorController = require('../controllers/vendorController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', authorizeRoles('ADMIN', 'PROCUREMENT_OFFICER'), vendorController.create);
router.get('/', authorizeRoles('ADMIN', 'PROCUREMENT_OFFICER'), vendorController.list);
router.get('/:id', authorizeRoles('ADMIN', 'PROCUREMENT_OFFICER'), vendorController.getById);
router.put('/:id', authorizeRoles('ADMIN', 'PROCUREMENT_OFFICER'), vendorController.update);
router.delete('/:id', authorizeRoles('ADMIN'), vendorController.remove);

module.exports = router;
