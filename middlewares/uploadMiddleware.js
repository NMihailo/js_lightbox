const multer = require('multer');
const path = require('path');

const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 500 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const forbiddenExts = ['.exe', '.bat', '.cmd', '.sh', '.js', '.php', '.py'];

        if (forbiddenExts.includes(ext)) {
            return cb(new Error('FORBIDDEN_FILE_TYPE'));
        }
        cb(null, true);
    }
});

const moveFile = async (req, res, next) => {
    try {
        const fileName = req.params.filename;
        const targetFolderId = req.body.folder_id || null;
        const userId = req.user.id;

        const [files] = await pool.query('SELECT * FROM files WHERE disk_name = ? AND user_id = ? AND deleted_at IS NULL', [fileName, userId]);
        if (files.length === 0) return res.status(403).json({ error: 'Файл не знайдено' });

        await pool.query('UPDATE files SET folder_id = ? WHERE disk_name = ?', [targetFolderId, fileName]);

        res.json({ success: true, message: 'Файл успішно переміщено!' });
    } catch (error) {
        next(error);
    }
};
module.exports = upload.array('files', 50);