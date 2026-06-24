const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const redisClient = require('../config/redis');

const authenticateToken = async (req, res, next) => {
    const token = req.cookies.lightbox_token;

    if (!token) {
        return res.status(401).json({ error: 'Доступ заборонено. Будь ласка, авторизуйтесь.' });
    }

    try {
        const isBlacklisted = await redisClient.get(`bl_${token}`);
        if (isBlacklisted) {
            return res.status(403).json({ error: 'Сесія закінчилась (токен заблоковано). Увійдіть знову.' });
        }
    } catch (err) {
        console.error("Помилка перевірки Redis:", err);
    }

    jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
        if (error) {
            return res.status(403).json({ error: 'Сесія закінчилась. Увійдіть знову.' });
        }
        req.user = user;
        next();
    });
};

const isAdmin = async (req, res, next) => {
    try {
        const [users] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0 || users[0].is_admin !== 1) {
            return res.status(403).json({ error: 'Доступ заборонено. Тільки для адміністраторів.' });
        }
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { authenticateToken, isAdmin };