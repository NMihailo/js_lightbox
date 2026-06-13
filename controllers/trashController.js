const pool = require('../config/db');
const redisClient = require('../config/redis');
const fs = require('fs');
const path = require('path');

const getTrash = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const [folders] = await pool.query('SELECT * FROM folders WHERE user_id = ? AND deleted_at IS NOT NULL', [userId]);
        const [files] = await pool.query('SELECT * FROM files WHERE user_id = ? AND deleted_at IS NOT NULL', [userId]);
        res.json({ folders, files });
    } catch (error) {
        next(error);
    }
};

const restoreFile = async (req, res, next) => {
    try {
        await pool.query('UPDATE files SET deleted_at = NULL WHERE disk_name = ? AND user_id = ?', [req.params.filename, req.user.id]);
        res.json({ success: true, message: 'Файл відновлено!' });
    } catch (error) {
        next(error);
    }
};

const restoreFolder = async (req, res, next) => {
    try {
        await pool.query('UPDATE folders SET deleted_at = NULL WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'Папку відновлено!' });
    } catch (error) {
        next(error);
    }
};

const hardDeleteFile = async (req, res, next) => {
    try {
        const fileName = req.params.filename;
        const userId = req.user.id;

        const [files] = await pool.query('SELECT * FROM files WHERE disk_name = ? AND user_id = ? AND deleted_at IS NOT NULL', [fileName, userId]);
        if (files.length === 0) return res.status(404).json({ error: 'Файл не знайдено в кошику.' });

        const fileSize = files[0].size_bytes;
        const filePath = path.join(__dirname, '../uploads', fileName);

        fs.unlink(filePath, async (err) => {
            if (err && err.code !== 'ENOENT') console.error(err);

            await pool.query('DELETE FROM files WHERE disk_name = ?', [fileName]);
            await pool.query('UPDATE quotas SET used_space = used_space - ? WHERE user_id = ?', [fileSize, userId]);
            await redisClient.del(`quota_${userId}`);

            res.json({ success: true, message: 'Файл остаточно видалено!' });
        });
    } catch (error) {
        next(error);
    }
};

const hardDeleteFolder = async (req, res, next) => {
    try {
        const folderId = req.params.id;
        const userId = req.user.id;

        const [files] = await pool.query('SELECT disk_name, size_bytes FROM files WHERE folder_id = ? AND user_id = ?', [folderId, userId]);

        let totalFreedSpace = 0;
        files.forEach(file => {
            totalFreedSpace += file.size_bytes;
            fs.unlink(path.join(__dirname, '../uploads', file.disk_name), () => { });
        });

        await pool.query('DELETE FROM folders WHERE id = ? AND user_id = ?', [folderId, userId]);

        if (totalFreedSpace > 0) {
            await pool.query('UPDATE quotas SET used_space = used_space - ? WHERE user_id = ?', [totalFreedSpace, userId]);
            await redisClient.del(`quota_${userId}`);
        }

        res.json({ success: true, message: 'Папку остаточно видалено!' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getTrash, restoreFile, restoreFolder, hardDeleteFile, hardDeleteFolder };