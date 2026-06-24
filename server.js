require('dotenv').config();
const express = require('express');
const os = require('os');
const cookieParser = require('cookie-parser');

const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');
const folderRoutes = require('./routes/folderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const trashRoutes = require('./routes/trashRoutes');

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`[Контейнер: ${os.hostname()}] Обробляє запит: ${req.method} ${req.url}`);
    next();
});

app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trash', trashRoutes);
app.use('/api/files', fileRoutes);
app.use('/', folderRoutes);
app.use((err, req, res, next) => {
    console.error('=== ЦЕНТРАЛІЗОВАНА ПОМИЛКА СЕРВЕРА ===');
    console.error(err.stack);
    res.status(500).json({ error: 'Внутрішня помилка сервера. Наші інженери вже розбираються.' });
});

app.listen(port, () => {
    console.log(`Сервер успішно запущено на http://localhost:${port}`);
});