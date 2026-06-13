const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const folderController = require('../controllers/folderController');

router.post('/folders', authenticateToken, folderController.createFolder);
router.delete('/folders/:id', authenticateToken, folderController.deleteFolder);

module.exports = router;