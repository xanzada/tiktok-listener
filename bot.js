// bot.js - Easypanel Fix (Health Check қосылған)
const { WebcastPushConnection } = require('tiktok-live-connector');
const axios = require('axios');
const http = require('http'); // Серверді алдау үшін керек

// --- 1. HEALTH CHECK (Серверге "Мен тірімін" деп айту) ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('TikTok Bot is Running! 🚀');
});

// Easypanel әдетте 3000 портты күтеді
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Сервер (Health Check) ${PORT} портында қосылды!`);
});

// --- 2. TIKTOK BOT (Негізгі жұмыс) ---
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME; 
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

if (!TIKTOK_USERNAME || !N8N_WEBHOOK_URL) {
    console.error("❌ ҚАТЕ: TIKTOK_USERNAME немесе N8N_WEBHOOK_URL жоқ!");
} else {
    console.log(`🚀 Бот іске қосылуда! Мақсат: @${TIKTOK_USERNAME}`);
    
    let tiktokLiveConnection = new WebcastPushConnection(TIKTOK_USERNAME);

    function connect() {
        tiktokLiveConnection.connect().then(state => {
            console.info(`✅ @${TIKTOK_USERNAME} стриміне қосылдық! (Room ID: ${state.roomId})`);
        }).catch(err => {
            console.error('❌ Қосылу сәтсіз (Стрим жоқ болуы мүмкін), 30 секундтан соң қайталаймыз...');
            setTimeout(connect, 30000); 
        });
    }

    connect();

    tiktokLiveConnection.on('chat', data => {
        axios.post(N8N_WEBHOOK_URL, {
            username: data.uniqueId,
            comment: data.comment,
            userId: data.userId,
            streamer: TIKTOK_USERNAME
        }).catch(err => {}); // Қате болса үндемейміз
    });
    
    tiktokLiveConnection.on('streamEnd', () => {
        console.warn('⚠️ Стрим аяқталды.');
    });
}

