const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const fileController = require('../controllers/fileController');

router.post('/upload', authenticateToken, fileController.uploadFile);
router.put('/move/:filename', authenticateToken, fileController.moveFile);

router.get('/', authenticateToken, fileController.getFiles);
router.get('/quota', authenticateToken, fileController.getQuota);
router.get('/recent', authenticateToken, fileController.getRecentFiles);

router.get('/download/:filename', authenticateToken, fileController.downloadFile);
router.get('/preview/:filename', authenticateToken, fileController.previewFile);

router.delete('/delete/:filename', authenticateToken, fileController.deleteFile);

module.exports = router;