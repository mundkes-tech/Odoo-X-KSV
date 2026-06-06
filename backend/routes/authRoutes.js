const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', authMiddleware, authController.profile);

router.get('/admin-only', authMiddleware, authorizeRoles('ADMIN'), authController.adminOnly);
router.get('/manager-only', authMiddleware, authorizeRoles('MANAGER'), authController.managerOnly);
router.get('/vendor-only', authMiddleware, authorizeRoles('VENDOR'), authController.vendorOnly);

module.exports = router;
