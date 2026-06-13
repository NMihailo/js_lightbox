const pool = require('../config/db');
const redisClient = require('../config/redis');

const getUsers = async (req, res, next) => {
    try {
        const [users] = await pool.query(`
            SELECT u.id, u.username, u.is_admin, q.total_space, q.used_space 
            FROM users u 
            JOIN quotas q ON u.id = q.user_id
            ORDER BY u.id DESC
        `);
        res.json(users);
    } catch (error) {
        next(error);
    }
};

const updateQuota = async (req, res, next) => {
    try {
        const targetUserId = req.params.id;
        const { new_total_space } = req.body;

        if (!new_total_space) return res.status(400).json({ error: 'Не вказано новий розмір квоти' });

        await pool.query('UPDATE quotas SET total_space = ? WHERE user_id = ?', [new_total_space, targetUserId]);
        await redisClient.del(`quota_${targetUserId}`);

        res.json({ success: true, message: 'Квоту успішно оновлено!' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getUsers, updateQuota };