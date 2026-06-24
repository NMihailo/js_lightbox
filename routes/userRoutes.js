const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const pool = require('../config/db');
const redisClient = require('../config/redis');

router.post('/register', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Логін та пароль обов\'язкові' });

        const [existingUser] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) return res.status(400).json({ error: 'Користувач з таким логіном вже існує' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hashedPassword]);

        const [newUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        const user = newUsers[0];

        await pool.query('INSERT INTO quotas (user_id) VALUES (?)', [user.id]);

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '2h' });

        res.cookie('lightbox_token', token, { httpOnly: true, secure: false, maxAge: 2 * 60 * 60 * 1000 });
        res.status(201).json({ success: true, message: `Акаунт створено! Заходимо в систему...` });
    } catch (error) {
        next(error);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Логін та пароль обов\'язкові!' });

        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ error: 'Неправильний логін або пароль' });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Неправильний логін або пароль' });

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '2h' });

        res.cookie('lightbox_token', token, { httpOnly: true, secure: false, maxAge: 2 * 60 * 60 * 1000 });
        res.status(200).json({ success: true, message: 'Успішний вхід!' });
    } catch (error) {
        next(error);
    }
});

router.get('/me', (req, res) => {
    const token = req.cookies.lightbox_token;

    if (!token) {
        return res.status(401).json({ error: 'Не авторизовано' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.status(200).json({ username: decoded.username });
    } catch (error) {
        res.status(401).json({ error: 'Недійсний токен' });
    }
});

router.post('/logout', async (req, res) => {
    const token = req.cookies.lightbox_token;
    if (token) {
        try {
            await redisClient.setEx(`bl_${token}`, 7200, 'blacklisted');
        } catch (err) {
            console.error("Помилка при додаванні в чорний список:", err);
        }
    }
    res.clearCookie('lightbox_token');
    res.status(200).json({ success: true });
});

module.exports = router;