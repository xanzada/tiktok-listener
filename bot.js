const { WebcastPushConnection } = require('tiktok-live-connector');
const axios = require('axios');
const http = require('http');

// --- 1. HEALTH CHECK (СЕРВЕРДІ АЛДАУ) ---
// Маңызды: '0.0.0.0' деп көрсету керек, әйтпесе Docker көрмейді
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('TikTok Bot is Alive and Listening! 🚀');
});

const PORT = process.env.PORT || 3000;

// ТҮЗЕТУ: '0.0.0.0' қосылды
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Сервер (Health Check) ${PORT} портында және 0.0.0.0 адресінде қосылды!`);
});

// --- 2. TIKTOK BOT ЛОГИКАСЫ ---
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME; 
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

if (!TIKTOK_USERNAME || !N8N_WEBHOOK_URL) {
    console.error("❌ ҚАТЕ: TIKTOK_USERNAME немесе N8N_WEBHOOK_URL жоқ!");
} else {
    console.log(`🚀 Бот іске қосылуда... Мақсат: @${TIKTOK_USERNAME}`);
    
    let tiktokLiveConnection = new WebcastPushConnection(TIKTOK_USERNAME);

    function connect() {
        tiktokLiveConnection.connect().then(state => {
            console.info(`✅ @${TIKTOK_USERNAME} стриміне қосылдық! (Room ID: ${state.roomId})`);
        }).catch(err => {
            // Егер стрим жоқ болса, бот құлап қалмау керек
            console.error('⚠️ Стрим әзірге жоқ немесе қосыла алмадық. 30 секундтан соң қайталаймыз.');
            setTimeout(connect, 30000); 
        });
    }

    // Қатеден құлап қалмау үшін қорғаныс
    process.on('uncaughtException', (err) => {
        console.log('Күтпеген қате:', err.message);
    });

    connect();

    tiktokLiveConnection.on('chat', data => {
        axios.post(N8N_WEBHOOK_URL, {
            username: data.uniqueId,
            comment: data.comment,
            userId: data.userId,
            streamer: TIKTOK_USERNAME
        }).catch(err => {}); 
    });
}
