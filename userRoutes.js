// userRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./config/db'); // Підключення до твоєї бази даних

// 1. Маршрут реєстрації
router.post('/register', async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Логін та пароль обов\'язкові' });
        }

        const [existingUser] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Користувач з таким логіном вже існує' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hashedPassword]);

        res.status(201).json({ success: true, message: `Користувача ${username} успішно зареєстровано!` });
    } catch (error) {
        // Замість console.error передаємо помилку далі в глобальний обробник
        next(error);
    }
});

// 2. Маршрут авторизації (Вхід)
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Логін та пароль обов\'язкові!' });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Неправильний логін або пароль' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Неправильний логін або пароль' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        // Відправляємо токен у захищеній куці, а не в тілі відповіді
        res.cookie('lightbox_token', token, {
            httpOnly: true, // Забороняє доступ до куки з JavaScript (захист від XSS)
            secure: false, // Поки стоїть false для localhost. Коли буде HTTPS, змінимо на true
            maxAge: 2 * 60 * 60 * 1000 // Час життя куки - 2 години в мілісекундах
        });

        res.status(200).json({
            success: true,
            message: 'Успішний вхід!'
        });
    } catch (error) {
        next(error); // Передаємо помилку в глобальний обробник
    }
});

// 3. Маршрут виходу (Видалення куки)
router.post('/logout', (req, res) => {
    res.clearCookie('lightbox_token'); // Сервер дає команду браузеру знищити куку
    res.status(200).json({ success: true });
});

module.exports = router;