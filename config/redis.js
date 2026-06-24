const { createClient } = require('redis');

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379',
    socket: {
        connectTimeout: 1500,
        reconnectStrategy: (retries) => {
            if (retries > 2) {
                console.error('❌ Redis лежить. Працюємо через MySQL.');
                return false;
            }
            return 500;
        }
    }
});

redisClient.on('error', (err) => console.error('Помилка Redis:', err));

redisClient.connect()
    .then(() => console.log('Redis успішно підключено!'))
    .catch(console.error);

module.exports = redisClient;