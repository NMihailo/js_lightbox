const pool = require('../config/db');
const redisClient = require('../config/redis');
const fs = require('fs');
const path = require('path');
const uploadMiddleware = require('../middlewares/uploadMiddleware');

const uploadFile = (req, res, next) => {
    uploadMiddleware(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Файл занадто великий. Максимальний розмір — 500 МБ.' });
            }
            if (err.message === 'FORBIDDEN_FILE_TYPE') {
                return res.status(400).json({ error: 'Завантаження програм заборонено з міркувань безпеки.' });
            }
            return next(err);
        }

        try {
            if (!req.file) return res.status(400).json({ error: 'Файл не знайдено або не вибрано.' });

            const userId = req.user.id;
            const [quotaRes] = await pool.query('SELECT total_space, used_space FROM quotas WHERE user_id = ?', [userId]);

            if (quotaRes.length > 0) {
                const { total_space, used_space } = quotaRes[0];
                if (Number(used_space) + req.file.size > Number(total_space)) {
                    fs.unlink(req.file.path, () => { });
                    return res.status(403).json({ error: 'Перевищено ліміт пам\'яті! Зверніться до адміністратора.' });
                }
            }

            const folderId = req.body.folder_id || null;
            const decodedName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
            const sql = 'INSERT INTO files (user_id, folder_id, disk_name, encrypted_original_name, encryption_iv, size_bytes) VALUES (?, ?, ?, ?, ?, ?)';

            await pool.query(sql, [userId, folderId, req.file.filename, decodedName, 'none', req.file.size]);
            await pool.query('UPDATE quotas SET used_space = used_space + ? WHERE user_id = ?', [req.file.size, userId]);
            await redisClient.del(`quota_${userId}`);

            res.status(200).json({ success: true, message: 'Файл успішно завантажено в Lightbox!' });
        } catch (error) {
            next(error);
        }
    });
};

const getFiles = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const folderId = req.query.folder_id || null;

        let folderQuery = 'SELECT * FROM folders WHERE user_id = ? AND parent_id IS NULL AND deleted_at IS NULL';
        let folderParams = [userId];
        if (folderId) {
            folderQuery = 'SELECT * FROM folders WHERE user_id = ? AND parent_id = ? AND deleted_at IS NULL';
            folderParams = [userId, folderId];
        }
        const [folders] = await pool.query(folderQuery, folderParams);

        let filesQuery = 'SELECT * FROM files WHERE user_id = ? AND folder_id IS NULL AND deleted_at IS NULL';
        let filesParams = [userId];
        if (folderId) {
            filesQuery = 'SELECT * FROM files WHERE user_id = ? AND folder_id = ? AND deleted_at IS NULL';
            filesParams = [userId, folderId];
        }
        const [files] = await pool.query(filesQuery, filesParams);

        res.json({ folders, files });
    } catch (error) {
        next(error);
    }
};

const getQuota = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cacheKey = `quota_${userId}`;
        const cachedQuota = await redisClient.get(cacheKey);

        if (cachedQuota) return res.json(JSON.parse(cachedQuota));

        const [quotaRes] = await pool.query('SELECT total_space, used_space FROM quotas WHERE user_id = ?', [userId]);
        if (quotaRes.length === 0) return res.status(404).json({ error: 'Квоту не знайдено' });

        const quotaData = quotaRes[0];
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(quotaData));
        res.json(quotaData);
    } catch (error) {
        next(error);
    }
};

const downloadFile = async (req, res, next) => {
    try {
        const fileName = req.params.filename;
        const [files] = await pool.query('SELECT * FROM files WHERE disk_name = ? AND user_id = ?', [fileName, req.user.id]);
        if (files.length === 0) return res.status(403).json({ error: 'Доступ заборонено або файл не знайдено.' });

        const filePath = path.join(__dirname, '../uploads', fileName);
        res.download(filePath, files[0].encrypted_original_name);
    } catch (error) {
        next(error);
    }
};

const previewFile = async (req, res, next) => {
    try {
        const fileName = req.params.filename;
        const userId = req.user.id;
        const [files] = await pool.query('SELECT * FROM files WHERE disk_name = ? AND user_id = ? AND deleted_at IS NULL', [fileName, userId]);
        if (files.length === 0) return res.status(404).json({ error: 'Файл не знайдено або немає прав' });

        const filePath = path.join(__dirname, '../uploads', fileName);
        res.type(files[0].encrypted_original_name);
        res.sendFile(filePath);
    } catch (error) {
        next(error);
    }
};

const deleteFile = async (req, res, next) => {
    try {
        const fileName = req.params.filename;
        const userId = req.user.id;
        const [files] = await pool.query('SELECT * FROM files WHERE disk_name = ? AND user_id = ? AND deleted_at IS NULL', [fileName, userId]);
        if (files.length === 0) return res.status(403).json({ error: 'Файл не знайдено або він вже у Кошику.' });

        await pool.query('UPDATE files SET deleted_at = CURRENT_TIMESTAMP WHERE disk_name = ?', [fileName]);
        res.json({ success: true, message: 'Файл переміщено в Кошик!' });
    } catch (error) {
        next(error);
    }
};

module.exports = { uploadFile, getFiles, getQuota, downloadFile, previewFile, deleteFile };