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

const createRequest = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { description } = req.body;

        if (!description) return res.status(400).json({ error: 'Опис запиту обов’язковий' });

        await pool.query('INSERT INTO quota_requests (user_id, description) VALUES (?, ?)', [userId, description]);
        res.json({ success: true, message: 'Запит успішно відправлено адміністратору!' });
    } catch (error) { next(error); }
};

const getRequests = async (req, res, next) => {
    try {
        const [requests] = await pool.query(`
            SELECT qr.*, u.username 
            FROM quota_requests qr
            JOIN users u ON qr.user_id = u.id
            WHERE qr.status = 'pending'
            ORDER BY qr.created_at DESC
        `);
        res.json(requests);
    } catch (error) { next(error); }
};

const handleRequest = async (req, res, next) => {
    try {
        const { requestId, action } = req.body;


        const [reqRow] = await pool.query('SELECT * FROM quota_requests WHERE id = ?', [requestId]);
        if (reqRow.length === 0) return res.status(404).json({ error: 'Запит не знайдено' });

        const targetUserId = reqRow[0].user_id;

        if (action === 'approve') {
            const extraBytes = 5 * 1024 * 1024 * 1024;
            await pool.query('UPDATE quotas SET total_space = total_space + ? WHERE user_id = ?', [extraBytes, targetUserId]);
            await pool.query('UPDATE quota_requests SET status = "approved" WHERE id = ?', [requestId]);
            await redisClient.del(`quota_${targetUserId}`);
        } else {
            await pool.query('UPDATE quota_requests SET status = "rejected" WHERE id = ?', [requestId]);
        }

        res.json({ success: true, message: `Запит успішно ${action === 'approve' ? 'схвалено (+5 ГБ)' : 'відхилено'}` });
    } catch (error) { next(error); }
};

module.exports = { getUsers, updateQuota, createRequest, getRequests, handleRequest, createRequest, getRequests, handleRequest };