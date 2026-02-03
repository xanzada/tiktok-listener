/**
 * TIKTOK LISTENER BOT - PROFESSIONAL VERSION (SaaS Ready)
 * * Бұл код кез келген жүктемеге шыдайды және стрим үзілсе автоматты түрде қайта қосылады.
 * Клиенттер үшін идеалды шешім.
 */

const { WebcastPushConnection } = require('tiktok-live-connector');
const axios = require('axios');
const http = require('http');

// --- 1. CONFIGURATION (Баптаулар) ---
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME; 
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// --- 2. HEALTH CHECK SERVER (Easypanel "өлтірмеуі" үшін) ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`TikTok Bot Service is Running for @${TIKTOK_USERNAME || 'Unknown'}\nStatus: Active 🟢`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ SERVER: Денсаулық тексеру модулі ${PORT} портында қосылды.`);
});

// --- 3. BOT LOGIC (Боттың миы) ---

if (!TIKTOK_USERNAME || !N8N_WEBHOOK_URL) {
    console.error("❌ CRITICAL ERROR: TIKTOK_USERNAME немесе N8N_WEBHOOK_URL енгізілмеген!");
    // Сервер құламас үшін process.exit жасамаймыз, тек ескертеміз
}

// TikTok қосылу параметрлері (Оңтайландырылған)
let tiktokConnection = new WebcastPushConnection(TIKTOK_USERNAME, {
    processInitialData: false,      // Стримге дейінгі ескі чатты оқымау (жылдамдық үшін)
    enableExtendedGiftInfo: false,  // Сыйлықтар туралы артық ақпаратты алмау
    clientParams: {
        app_language: 'ru-RU',
        device_platform: 'web'
    }
});

// Қосылу функциясы (Рекурсивті)
function connectToStream() {
    console.log(`🔄 @${TIKTOK_USERNAME} стриміне қосылуда...`);

    tiktokConnection.connect()
        .then(state => {
            console.info(`✅ SÄTTI QOSYLDUQ! (Room ID: ${state.roomId})`);
            console.info(`🚀 Чатты тыңдап отырмыз...`);
        })
        .catch(err => {
            console.error(`⚠️ Қосыла алмадық (Стрим жоқ болуы мүмкін). 30 секундтан соң қайталаймыз.`);
            // Шексіз қайталау (30 секунд сайын)
            setTimeout(connectToStream, 30000);
        });
}

// --- 4. EVENT HANDLERS (Оқиғаларды ұстау) ---

// А) ЧАТ КЕЛГЕНДЕ
tiktokConnection.on('chat', data => {
    // 1. Логқа шығару (Серверде көру үшін)
    console.log(`💬 ${data.uniqueId}: ${data.comment}`);

    // 2. n8n-ге жіберу (Қате шықса бот тоқтамайды)
    axios.post(N8N_WEBHOOK_URL, {
        username: data.uniqueId,
        comment: data.comment,
        userId: data.userId,
        streamer: TIKTOK_USERNAME, // Қай клиент екенін білу үшін
        timestamp: Date.now()
    }).catch(error => {
        // n8n істемей тұрса да, бот жұмысын жалғастыра береді
        console.error(`⚠️ n8n-ге жіберу қатесі: ${error.message}`);
    });
});

// Ә) СТРИМ АЯҚТАЛҒАНДА
tiktokConnection.on('streamEnd', () => {
    console.warn(`🛑 Стрим аяқталды. Бот ұйқы режиміне өтті (Күтуде...)`);
    // 1 минуттан соң қайта тексеруді бастау
    setTimeout(connectToStream, 60000);
});

// Б) БАЙЛАНЫС ҮЗІЛГЕНДЕ (Disconnection)
tiktokConnection.on('disconnected', () => {
    console.warn(`⚠️ TikTok серверімен байланыс үзілді. Қайта қосылуда...`);
    setTimeout(connectToStream, 5000);
});

// В) ҚАТЕЛЕР (Error Handling)
tiktokConnection.on('error', err => {
    // Ұсақ-түйек қателерді елемеу
    if (err.message && !err.message.includes('WebcastResponseError')) {
        console.error('❌ TikTok Connection Error:', err);
    }
});

// Ботты іске қосу
connectToStream();
