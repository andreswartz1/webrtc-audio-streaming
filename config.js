// Configuração do Supabase
// IMPORTANTE: Substitua pelos seus valores reais do Supabase

const SUPABASE_URL = 'https://hnymtcfyvtarhlocrwon.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueW10Y2Z5dnRhcmhsb2Nyd29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTQ3OTQsImV4cCI6MjA3ODM5MDc5NH0.aBhoa36fnWwu98MolqCq2hKOQ8fYtauHK9UMPvbqezU';

// Configuração WebRTC
const RTC_CONFIGURATION = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        },
        {
            urls: 'stun:stun1.l.google.com:19302'
        }
        // Para produção, adicione TURN servers
        // {
        //     urls: 'turn:seu-turn-server.com:3478',
        //     username: 'usuario',
        //     credential: 'senha'
        // }
    ]
};

// Constraints de áudio
const AUDIO_CONSTRAINTS = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
    },
    video: false
};

// Configurações gerais
const CONFIG = {
    // Tempo para limpar mensagens antigas (ms)
    CLEANUP_INTERVAL: 30000,

    // Timeout para conexão (ms)
    CONNECTION_TIMEOUT: 10000,

    // Intervalo de heartbeat (ms)
    HEARTBEAT_INTERVAL: 5000,

    // Número máximo de tentativas de reconexão
    MAX_RECONNECT_ATTEMPTS: 5
};
