// bot.js - Easypanel үшін арнайы нұсқа
const { WebcastPushConnection } = require('tiktok-live-connector');
const axios = require('axios');

// Айнымалыларды Easypanel-ден оқимыз
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME; 
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

if (!TIKTOK_USERNAME || !N8N_WEBHOOK_URL) {
    console.error("❌ ҚАТЕ: TIKTOK_USERNAME немесе N8N_WEBHOOK_URL енгізілмеген!");
    process.exit(1);
}

console.log(`🚀 Бот іске қосылды! Мақсат: @${TIKTOK_USERNAME}`);

let tiktokLiveConnection = new WebcastPushConnection(TIKTOK_USERNAME);

// Қосылу функциясы (үзіліп қалса қайта қосылу үшін)
function connect() {
    tiktokLiveConnection.connect().then(state => {
        console.info(`✅ @${TIKTOK_USERNAME} стриміне сәтті қосылдық! (Room ID: ${state.roomId})`);
    }).catch(err => {
        console.error('❌ Қосылу сәтсіз, 10 секундтан кейін қайта көреміз...', err.message);
        setTimeout(connect, 10000); // 10 секундтан кейін қайта қосылу
    });
}

connect();

// Чатты ұстап алу
tiktokLiveConnection.on('chat', data => {
    // n8n-ге лақтыру
    axios.post(N8N_WEBHOOK_URL, {
        username: data.uniqueId,
        comment: data.comment,
        userId: data.userId,
        streamer: TIKTOK_USERNAME // Қай клиенттің стримі екенін білу үшін
    }).catch(error => {
        // n8n қатесін елемеу (логты толтырмас үшін)
    });
});

// Стрим аяқталса
tiktokLiveConnection.on('streamEnd', () => {
    console.warn('⚠️ Стрим аяқталды. Күту режимі...');
});