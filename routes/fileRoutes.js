const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const fileController = require('../controllers/fileController');

router.post('/upload', authenticateToken, fileController.uploadFile);
router.get('/files', authenticateToken, fileController.getFiles);
router.get('/quota', authenticateToken, fileController.getQuota);
router.get('/download/:filename', authenticateToken, fileController.downloadFile);
router.get('/preview/:filename', authenticateToken, fileController.previewFile);
router.delete('/delete/:filename', authenticateToken, fileController.deleteFile);

module.exports = router;