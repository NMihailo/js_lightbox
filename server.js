require('dotenv').config();
const express = require('express');
const pool = require('./config/db');
const multer = require('multer');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const userRoutes = require('./userRoutes'); ``

const app = express();
const port = 3000;

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use('/api/users', userRoutes);


// Middleware для перевірки JWT-токена
const authenticateToken = (req, res, next) => {
    // Тепер токен лежить тут, завдяки cookie-parser
    const token = req.cookies.lightbox_token;

    if (!token) {
        return res.status(401).json({ error: 'Доступ заборонено. Будь ласка, авторизуйтесь.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
        if (error) {
            return res.status(403).json({ error: 'Сесія закінчилась. Увійдіть знову.' });
        }
        req.user = user;
        next();
    });
};


// Стало
app.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не знайдено' });
        }

        // Більше ніяких "костилів" (user_id = 1)! 
        // Ми беремо реальний ID того, хто зараз авторизований
        const userId = req.user.id;

        // Далі йде твій старий код збереження в базу...
        const sql = 'INSERT INTO files (user_id, disk_name, encrypted_original_name, encryption_iv, size_bytes) VALUES (?, ?, ?, ?, ?)';

        await pool.query(sql, [userId, req.file.filename, req.file.originalname, 'none', req.file.size]);

        res.status(200).json({
            success: true,
            message: 'Файл успішно завантажено в Lightbox!'
        });
    } catch (error) {
        next(error); // Передаємо помилку в глобальний обробник
    }
});


// 1. Отримання списку ВЛАСНИХ файлів
app.get('/files', authenticateToken, async (req, res, next) => {
    try {
        // Замість читання папки, просимо БД дати файли ТІЛЬКИ цього юзера
        const [files] = await pool.query('SELECT * FROM files WHERE user_id = ?', [req.user.id]);
        res.json(files);
    } catch (error) {
        next(error);
    }
});

// 2. Безпечне скачування файлу
app.get('/download/:filename', authenticateToken, async (req, res, next) => {
    try {
        const fileName = req.params.filename;

        // Шукаємо файл у БД і перевіряємо, чи належить він юзеру
        const [files] = await pool.query('SELECT * FROM files WHERE disk_name = ? AND user_id = ?', [fileName, req.user.id]);

        if (files.length === 0) {
            return res.status(403).json({ error: 'Доступ заборонено або файл не знайдено.' });
        }

        const filePath = __dirname + '/uploads/' + fileName;

        // res.download зручно приймає оригінальну назву файлу другим аргументом!
        res.download(filePath, files[0].encrypted_original_name);
    } catch (error) {
        next(error);
    }
});

// 3. Безпечне видалення файлу
app.delete('/delete/:filename', authenticateToken, async (req, res, next) => {
    try {
        const fileName = req.params.filename;

        // Перевіряємо права на видалення
        const [files] = await pool.query('SELECT * FROM files WHERE disk_name = ? AND user_id = ?', [fileName, req.user.id]);
        if (files.length === 0) {
            return res.status(403).json({ error: 'Файл не знайдено або немає прав.' });
        }

        const filePath = __dirname + '/uploads/' + fileName;

        // 1. Видаляємо фізичний файл з диска
        fs.unlink(filePath, async (err) => {
            if (err && err.code !== 'ENOENT') return next(err); // Пропускаємо помилку, якщо файлу вже нема на диску

            // 2. Видаляємо запис з бази даних
            await pool.query('DELETE FROM files WHERE disk_name = ?', [fileName]);
            res.json({ success: true, message: 'Файл успішно видалено!' });
        });
    } catch (error) {
        next(error);
    }
});


app.use((err, req, res, next) => {
    console.error('=== ЦЕНТРАЛІЗОВАНА ПОМИЛКА СЕРВЕРА ===');
    console.error(err.stack);
    console.error('======================================');
    res.status(500).json({ error: 'Внутрішня помилка сервера. Наші інженери вже розбираються.' });
});


app.listen(port, () => {
    console.log(`Сервер успішно запущено на http://localhost:${port}`);
});