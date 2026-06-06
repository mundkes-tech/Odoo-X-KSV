const express = require('express');
const quotationController = require('../controllers/quotationController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', authorizeRoles('VENDOR'), quotationController.create);
router.get('/', authorizeRoles('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'), quotationController.list);
router.get('/:id', authorizeRoles('ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'), quotationController.getById);
router.put('/:id', authorizeRoles('VENDOR'), quotationController.update);

module.exports = router;
