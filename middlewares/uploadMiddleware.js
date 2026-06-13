const multer = require('multer');
const path = require('path');

const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 500 * 1024 * 1024 // 500 МБ
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

// Експортуємо одразу налаштований middleware для одного файлу
module.exports = upload.single('file');