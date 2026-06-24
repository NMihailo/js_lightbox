const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const trashController = require('../controllers/trashController');

router.get('/', authenticateToken, trashController.getTrash);

router.delete('/clear', authenticateToken, trashController.clearTrash);
router.put('/restore-file/:filename', authenticateToken, trashController.restoreFile);
router.put('/restore-folder/:id', authenticateToken, trashController.restoreFolder);
router.delete('/hard-delete-file/:filename', authenticateToken, trashController.hardDeleteFile);
router.delete('/hard-delete-folder/:id', authenticateToken, trashController.hardDeleteFolder);

module.exports = router;