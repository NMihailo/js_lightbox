const pool = require('../config/db');

const createFolder = async (req, res, next) => {
    try {
        const { name, parent_id } = req.body;
        if (!name) return res.status(400).json({ error: 'Назва папки обов\'язкова' });

        const userId = req.user.id;
        const parentIdValue = parent_id ? parent_id : null;

        await pool.query('INSERT INTO folders (user_id, name, parent_id) VALUES (?, ?, ?)', [userId, name, parentIdValue]);
        res.status(201).json({ success: true, message: 'Папку створено!' });
    } catch (error) {
        next(error);
    }
};

const deleteFolder = async (req, res, next) => {
    try {
        const folderId = req.params.id;
        const userId = req.user.id;
        const [result] = await pool.query('UPDATE folders SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [folderId, userId]);

        if (result.affectedRows === 0) return res.status(403).json({ error: 'Папку не знайдено або немає прав' });
        res.json({ success: true, message: 'Папку переміщено в Кошик!' });
    } catch (error) {
        next(error);
    }
};

module.exports = { createFolder, deleteFolder };