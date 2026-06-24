const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');

router.get('/users', authenticateToken, isAdmin, adminController.getUsers);
router.put('/users/:id/quota', authenticateToken, isAdmin, adminController.updateQuota);

router.post('/quota-request', authenticateToken, adminController.createRequest);

router.get('/quota-requests', authenticateToken, adminController.getRequests);
router.post('/quota-requests/handle', authenticateToken, adminController.handleRequest);

module.exports = router;