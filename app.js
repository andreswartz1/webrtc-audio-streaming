// WebRTC Audio Streaming App with MP3 Playlist Support
// Main Application Logic

let supabase;
let localStream = null;
let peerConnections = new Map();
let currentRole = null;
let currentRoomId = null;
let currentUserId = null;
let realtimeChannel = null;
let audioContext = null;
let analyser = null;
let animationId = null;

// MP3 Playlist variables
let audioSource = 'microphone'; // 'microphone' or 'mp3'
let mp3Files = [];
let currentTrackIndex = 0;
let localAudioElement = null;
let isPlaying = false;
let mediaStreamDestination = null;

// Initialize Supabase
function initSupabase() {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        addLog('Supabase inicializado', 'success');
        return true;
    } catch (error) {
        addLog('Erro ao inicializar Supabase: ' + error.message, 'error');
        return false;
    }
}

// Add log entry
function addLog(message, type = 'info') {
    const logContainer = document.getElementById('logContainer');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';

    const time = new Date().toLocaleTimeString('pt-BR');
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = `[${time}]`;

    const messageSpan = document.createElement('span');
    messageSpan.className = `log-${type}`;
    messageSpan.textContent = ' ' + message;

    logEntry.appendChild(timeSpan);
    logEntry.appendChild(messageSpan);
    logContainer.insertBefore(logEntry, logContainer.firstChild);

    while (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.lastChild);
    }

    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Handle audio source change
function setupAudioSourceListeners() {
    const radioButtons = document.querySelectorAll('input[name="audioSource"]');
    const mp3Section = document.getElementById('mp3Section');
    const mp3FilesInput = document.getElementById('mp3Files');
    const playlistPreview = document.getElementById('playlistPreview');

    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            audioSource = e.target.value;
            if (audioSource === 'mp3') {
                mp3Section.classList.remove('hidden');
                addLog('Modo MP3 selecionado', 'info');
            } else {
                mp3Section.classList.add('hidden');
                addLog('Modo Microfone selecionado', 'info');
            }
        });
    });

    mp3FilesInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        mp3Files = files;

        playlistPreview.innerHTML = '';
        if (files.length > 0) {
            files.forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `<span>🎵 ${index + 1}. ${file.name}</span>`;
                playlistPreview.appendChild(fileItem);
            });
            addLog(`${files.length} arquivo(s) MP3 carregado(s)`, 'success');
        }
    });
}

// Start broadcasting
async function startBroadcasting() {
    const roomId = document.getElementById('roomId').value.trim();
    const userId = document.getElementById('userId').value.trim();

    if (!roomId || !userId) {
        alert('Por favor, preencha o nome da sala e seu nome!');
        return;
    }

    if (audioSource === 'mp3' && mp3Files.length === 0) {
        alert('Por favor, selecione pelo menos um arquivo MP3!');
        return;
    }

    try {
        currentRole = 'broadcaster';
        currentRoomId = roomId;
        currentUserId = userId;

        // FIXED: Separate handling for microphone and MP3 modes
        if (audioSource === 'microphone') {
            addLog('Solicitando acesso ao microfone...', 'info');
            localStream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
            addLog('Microfone acessado com sucesso!', 'success');
            document.getElementById('audioSourceType').textContent = 'Microfone';

            // Setup visualizer for microphone
            setupAudioVisualizer();

        } else if (audioSource === 'mp3') {
            addLog('Configurando streaming de MP3...', 'info');
            await setupMP3Streaming();
            document.getElementById('audioSourceType').textContent = 'Playlist MP3';
            document.getElementById('playlistControls').classList.remove('hidden');
            addLog('Streaming de MP3 iniciado com sucesso!', 'success');
        }

        addLog(`Transmissão iniciada na sala: ${roomId}`, 'success');

        setupRealtimeChannel();

        document.getElementById('setup').classList.add('hidden');
        document.getElementById('broadcasting').classList.remove('hidden');
        document.getElementById('currentRoom').textContent = roomId;

    } catch (error) {
        addLog('Erro ao iniciar transmissão: ' + error.message, 'error');
        alert('Erro ao iniciar transmissão: ' + error.message);

        // Cleanup on error
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
    }
}

// Setup MP3 streaming
async function setupMP3Streaming() {
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        addLog('AudioContext criado', 'info');

        // Get audio element
        localAudioElement = document.getElementById('localAudio');

        // Load first track
        localAudioElement.src = URL.createObjectURL(mp3Files[0]);
        addLog(`Carregando: ${mp3Files[0].name}`, 'info');

        // Create media stream destination
        mediaStreamDestination = audioContext.createMediaStreamDestination();

        // Create source from audio element
        const source = audioContext.createMediaElementSource(localAudioElement);

        // Create analyser for visualizer
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        // Connect audio graph
        source.connect(analyser);
        source.connect(mediaStreamDestination);

        // Get the stream from destination
        localStream = mediaStreamDestination.stream;
        addLog('Stream de áudio criado', 'success');

        // Setup UI
        setupPlaylistUI();
        setupAudioEventListeners();

        // Setup visualizer for MP3
        setupAudioVisualizer();

        // Start playing
        await localAudioElement.play();
        isPlaying = true;
        updatePlayPauseButton();

        addLog('Reprodução iniciada', 'success');

    } catch (error) {
        addLog('Erro ao configurar MP3: ' + error.message, 'error');
        throw error;
    }
}

// Setup playlist UI
function setupPlaylistUI() {
    const playlistItems = document.getElementById('playlistItems');
    playlistItems.innerHTML = '';

    mp3Files.forEach((file, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="track-number">${index + 1}</span>
            <span class="track-name">${file.name}</span>
        `;
        li.addEventListener('click', () => playTrack(index));
        if (index === currentTrackIndex) {
            li.classList.add('active');
        }
        playlistItems.appendChild(li);
    });

    updateNowPlaying();
}

// Setup audio event listeners
function setupAudioEventListeners() {
    const audio = localAudioElement;

    audio.addEventListener('loadedmetadata', () => {
        addLog('Metadados carregados', 'info');
        document.getElementById('duration').textContent = formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
        if (!isNaN(audio.duration)) {
            const progress = (audio.currentTime / audio.duration) * 100;
            document.getElementById('progressFill').style.width = progress + '%';
            document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
        }
    });

    audio.addEventListener('ended', () => {
        addLog('Faixa finalizada', 'info');
        nextTrack();
    });

    audio.addEventListener('error', (e) => {
        addLog('Erro ao reproduzir áudio: ' + e.message, 'error');
    });

    const progressBar = document.querySelector('.progress-bar');
    progressBar.addEventListener('click', (e) => {
        if (!isNaN(audio.duration)) {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audio.currentTime = percent * audio.duration;
        }
    });
}

// Play specific track
function playTrack(index) {
    if (index < 0 || index >= mp3Files.length) return;

    currentTrackIndex = index;
    const file = mp3Files[index];

    // Revoke old URL to prevent memory leaks
    if (localAudioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(localAudioElement.src);
    }

    localAudioElement.src = URL.createObjectURL(file);
    localAudioElement.play().then(() => {
        isPlaying = true;
        updatePlayPauseButton();
        addLog(`Tocando: ${file.name}`, 'info');
    }).catch(error => {
        addLog('Erro ao tocar faixa: ' + error.message, 'error');
    });

    updatePlaylistUI();
    updateNowPlaying();
}

// Previous track
function prevTrack() {
    if (currentTrackIndex > 0) {
        playTrack(currentTrackIndex - 1);
    } else {
        playTrack(mp3Files.length - 1); // Loop to last
    }
}

// Next track
function nextTrack() {
    if (currentTrackIndex < mp3Files.length - 1) {
        playTrack(currentTrackIndex + 1);
    } else {
        playTrack(0); // Loop to first
    }
}

// Play/Pause toggle
function togglePlayPause() {
    if (!localAudioElement) return;

    if (isPlaying) {
        localAudioElement.pause();
        isPlaying = false;
        addLog('Pausado', 'info');
    } else {
        localAudioElement.play().then(() => {
            isPlaying = true;
            addLog('Reproduzindo', 'info');
        }).catch(error => {
            addLog('Erro ao reproduzir: ' + error.message, 'error');
        });
    }

    updatePlayPauseButton();
}

// Update play/pause button
function updatePlayPauseButton() {
    const btn = document.getElementById('playPause');
    if (btn) {
        btn.textContent = isPlaying ? '⏸️' : '▶️';
        btn.title = isPlaying ? 'Pausar' : 'Reproduzir';
    }
}

// Update playlist UI
function updatePlaylistUI() {
    const items = document.querySelectorAll('#playlistItems li');
    items.forEach((item, index) => {
        if (index === currentTrackIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Update now playing display
function updateNowPlaying() {
    if (mp3Files.length > 0 && currentTrackIndex < mp3Files.length) {
        document.getElementById('currentTrack').textContent = mp3Files[currentTrackIndex].name;
    }
}

// Format time
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Join as listener
async function joinAsListener() {
    const roomId = document.getElementById('roomId').value.trim();
    const userId = document.getElementById('userId').value.trim();

    if (!roomId || !userId) {
        alert('Por favor, preencha o nome da sala e seu nome!');
        return;
    }

    currentRole = 'listener';
    currentRoomId = roomId;
    currentUserId = userId;

    addLog(`Entrando na sala: ${roomId}`, 'info');

    setupRealtimeChannel();

    await sendSignal({
        type: 'join-request',
        userId: currentUserId
    });

    document.getElementById('setup').classList.add('hidden');
    document.getElementById('listening').classList.remove('hidden');
    document.getElementById('listeningRoom').textContent = roomId;

    addLog('Aguardando conexão com broadcaster...', 'info');
}

// Setup realtime channel
function setupRealtimeChannel() {
    realtimeChannel = supabase
        .channel(`room:${currentRoomId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'signaling',
                filter: `room_id=eq.${currentRoomId}`
            },
            handleSignalingMessage
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                addLog('Canal de sinalização conectado', 'success');
            }
        });
}

// Handle signaling messages
async function handleSignalingMessage(payload) {
    const message = payload.new;

    if (message.sender_id === currentUserId) return;
    if (message.receiver_id && message.receiver_id !== currentUserId) return;

    const data = message.payload;
    addLog(`Mensagem recebida: ${message.type}`, 'info');

    try {
        switch (message.type) {
            case 'join-request':
                if (currentRole === 'broadcaster') {
                    await handleJoinRequest(message.sender_id);
                }
                break;

            case 'offer':
                if (currentRole === 'listener') {
                    await handleOffer(message.sender_id, data);
                }
                break;

            case 'answer':
                if (currentRole === 'broadcaster') {
                    await handleAnswer(message.sender_id, data);
                }
                break;

            case 'ice-candidate':
                await handleIceCandidate(message.sender_id, data);
                break;
        }
    } catch (error) {
        addLog('Erro ao processar mensagem: ' + error.message, 'error');
    }
}

// Send signal through Supabase
async function sendSignal(data, receiverId = null) {
    try {
        const { error } = await supabase
            .from('signaling')
            .insert({
                room_id: currentRoomId,
                sender_id: currentUserId,
                receiver_id: receiverId,
                type: data.type,
                payload: data
            });

        if (error) throw error;
        addLog(`Sinal enviado: ${data.type}`, 'info');
    } catch (error) {
        addLog('Erro ao enviar sinal: ' + error.message, 'error');
    }
}

// Handle join request
async function handleJoinRequest(listenerId) {
    addLog(`Novo ouvinte conectando: ${listenerId}`, 'info');

    const pc = createPeerConnection(listenerId);

    if (!localStream) {
        addLog('Stream local não disponível', 'error');
        return;
    }

    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
        addLog(`Track adicionada: ${track.kind}`, 'info');
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await sendSignal({
        type: 'offer',
        sdp: offer.sdp
    }, listenerId);

    updateListenerCount();
}

// Handle offer
async function handleOffer(broadcasterId, data) {
    addLog('Oferta recebida do broadcaster', 'info');

    const pc = createPeerConnection(broadcasterId);

    await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: data.sdp
    }));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await sendSignal({
        type: 'answer',
        sdp: answer.sdp
    }, broadcasterId);

    addLog('Resposta enviada ao broadcaster', 'success');
}

// Handle answer
async function handleAnswer(listenerId, data) {
    const pc = peerConnections.get(listenerId);
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: data.sdp
    }));

    addLog(`Resposta recebida de: ${listenerId}`, 'success');
}

// Handle ICE candidate
async function handleIceCandidate(peerId, data) {
    const pc = peerConnections.get(peerId);
    if (!pc || !data.candidate) return;

    try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        addLog('ICE candidate adicionado', 'info');
    } catch (error) {
        addLog('Erro ao adicionar ICE candidate: ' + error.message, 'error');
    }
}

// Create peer connection
function createPeerConnection(peerId) {
    const pc = new RTCPeerConnection(RTC_CONFIGURATION);
    peerConnections.set(peerId, pc);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal({
                type: 'ice-candidate',
                candidate: event.candidate
            }, peerId);
        }
    };

    pc.onconnectionstatechange = () => {
        addLog(`Conexão ${peerId}: ${pc.connectionState}`, 'info');

        if (pc.connectionState === 'connected') {
            addLog(`Conectado com ${peerId}!`, 'success');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            addLog(`Desconectado de ${peerId}`, 'error');
            peerConnections.delete(peerId);
            updateListenerCount();
        }
    };

    if (currentRole === 'listener') {
        pc.ontrack = (event) => {
            addLog('Stream de áudio recebido!', 'success');
            const remoteAudio = document.getElementById('remoteAudio');
            remoteAudio.srcObject = event.streams[0];

            document.getElementById('listenStatus').textContent = 'Conectado';
            document.getElementById('listenStatus').style.background = '#10b981';
        };
    }

    return pc;
}

// Setup audio visualizer
function setupAudioVisualizer() {
    if (!analyser) {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        analyser = audioContext.createAnalyser();

        // Only for microphone mode, connect the stream source
        if (audioSource === 'microphone' && localStream) {
            const source = audioContext.createMediaStreamSource(localStream);
            source.connect(analyser);
        }
        // For MP3 mode, analyser is already connected in setupMP3Streaming
    }

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');

    function draw() {
        animationId = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = '#0f172a';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * canvas.height;

            const gradient = canvasCtx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
            gradient.addColorStop(0, '#8b5cf6');
            gradient.addColorStop(1, '#6366f1');

            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    draw();
}

// Update listener count
function updateListenerCount() {
    if (currentRole === 'broadcaster') {
        const count = Array.from(peerConnections.values()).filter(
            pc => pc.connectionState === 'connected'
        ).length;
        document.getElementById('listenerCount').textContent = count;
    }
}

// Stop broadcasting
function stopBroadcasting() {
    addLog('Encerrando transmissão...', 'info');

    // Stop local stream tracks
    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
            addLog(`Track ${track.kind} parada`, 'info');
        });
        localStream = null;
    }

    // Stop MP3 playback
    if (localAudioElement) {
        localAudioElement.pause();
        if (localAudioElement.src.startsWith('blob:')) {
            URL.revokeObjectURL(localAudioElement.src);
        }
        localAudioElement.src = '';
    }

    // Close all peer connections
    peerConnections.forEach((pc, peerId) => {
        pc.close();
        addLog(`Conexão fechada: ${peerId}`, 'info');
    });
    peerConnections.clear();

    // Unsubscribe from channel
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }

    // Stop visualizer
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // Close audio context
    if (audioContext) {
        audioContext.close();
        audioContext = null;
        analyser = null;
    }

    addLog('Transmissão encerrada', 'success');

    // Reset UI
    document.getElementById('broadcasting').classList.add('hidden');
    document.getElementById('playlistControls').classList.add('hidden');
    document.getElementById('setup').classList.remove('hidden');

    // Reset variables
    currentRole = null;
    currentRoomId = null;
    currentUserId = null;
    currentTrackIndex = 0;
    isPlaying = false;
}

// Stop listening
function stopListening() {
    addLog('Saindo da sala...', 'info');

    // Close all peer connections
    peerConnections.forEach(pc => pc.close());
    peerConnections.clear();

    // Stop remote audio
    const remoteAudio = document.getElementById('remoteAudio');
    if (remoteAudio.srcObject) {
        remoteAudio.srcObject.getTracks().forEach(track => track.stop());
        remoteAudio.srcObject = null;
    }

    // Unsubscribe from channel
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }

    addLog('Desconectado da sala', 'success');

    // Reset UI
    document.getElementById('listening').classList.add('hidden');
    document.getElementById('setup').classList.remove('hidden');

    currentRole = null;
    currentRoomId = null;
    currentUserId = null;
}

// Setup volume control
function setupVolumeControl() {
    const volumeSlider = document.getElementById('volume');
    const volumeValue = document.getElementById('volumeValue');
    const remoteAudio = document.getElementById('remoteAudio');

    volumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        remoteAudio.volume = volume;
        volumeValue.textContent = e.target.value + '%';
    });
}

// Cleanup old signaling messages
async function cleanupOldMessages() {
    try {
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        await supabase
            .from('signaling')
            .delete()
            .lt('created_at', oneMinuteAgo);
    } catch (error) {
        console.error('Erro ao limpar mensagens antigas:', error);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (!initSupabase()) {
        alert('Erro ao inicializar Supabase. Verifique as configurações em config.js');
        return;
    }

    setupAudioSourceListeners();

    document.getElementById('startBroadcast').addEventListener('click', startBroadcasting);
    document.getElementById('joinListener').addEventListener('click', joinAsListener);
    document.getElementById('stopBroadcast').addEventListener('click', stopBroadcasting);
    document.getElementById('stopListening').addEventListener('click', stopListening);

    document.getElementById('prevTrack')?.addEventListener('click', prevTrack);
    document.getElementById('playPause')?.addEventListener('click', togglePlayPause);
    document.getElementById('nextTrack')?.addEventListener('click', nextTrack);

    setupVolumeControl();

    setInterval(cleanupOldMessages, CONFIG.CLEANUP_INTERVAL);

    addLog('Aplicação inicializada - Versão com suporte MP3', 'success');
    addLog('Selecione Microfone ou Arquivos MP3 para começar', 'info');
});
