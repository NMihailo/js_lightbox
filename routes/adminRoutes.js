const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');

router.get('/users', authenticateToken, isAdmin, adminController.getUsers);
router.put('/users/:id/quota', authenticateToken, isAdmin, adminController.updateQuota);

module.exports = router;