const { createClient } = require('redis');

const redisClient = createClient({
    url: 'redis://redis:6379'
});

redisClient.on('error', (err) => console.error('Помилка Redis:', err));

redisClient.connect()
    .then(() => console.log('Redis успішно підключено!'))
    .catch(console.error);

module.exports = redisClient;