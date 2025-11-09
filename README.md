# 🎙️ WebRTC Audio Streaming App

Aplicativo de streaming de áudio em tempo real usando WebRTC e Supabase com suporte a **streaming de microfone** e **playlist de MP3**.

## 🚀 Características

- **Streaming de áudio P2P** via WebRTC com baixa latência
- **Sinalização em tempo real** usando Supabase Realtime
- **Dual-mode:** Microfone OU Playlist de MP3
- **Player completo** com controles de playlist
- **Suporte a múltiplos ouvintes** simultâneos
- **Visualizador de áudio** em tempo real
- **Interface moderna** e responsiva

## 🎵 Novidades - Suporte a MP3!

### Modo Microfone
- Transmita sua voz em tempo real
- Ideal para podcasts, conversas, apresentações

### Modo Playlist MP3
- ✨ **Carregue múltiplos arquivos MP3**
- ✨ **Player com controles:** Play/Pause, Próxima, Anterior
- ✨ **Visualização de playlist** com faixas numeradas
- ✨ **Barra de progresso** interativa
- ✨ **Reprodução automática** ao final de cada faixa
- ✨ **Clique na faixa** para tocar instantaneamente

Perfeito para:
- 🎶 Rádios online
- 🎧 DJ sessions
- 🎤 Streaming de música
- 📻 Broadcasting de eventos

## 📋 Pré-requisitos

- Navegador moderno com suporte a WebRTC (Chrome, Firefox, Edge, Safari)
- Conta Supabase (gratuita)
- Servidor HTTP para desenvolvimento local

## 🔧 Configuração

### 1. Configure o Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em `Project Settings` > `API`
4. Copie suas credenciais:
   - `Project URL`
   - `anon/public key`

### 2. Configure o banco de dados

Execute o seguinte SQL no Supabase SQL Editor:

```sql
-- Criar tabela para sinalização WebRTC
CREATE TABLE signaling (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_id TEXT,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE signaling ENABLE ROW LEVEL SECURITY;

-- Política para permitir INSERT
CREATE POLICY "Enable insert for all users" ON signaling
  FOR INSERT
  WITH CHECK (true);

-- Política para permitir SELECT
CREATE POLICY "Enable select for all users" ON signaling
  FOR SELECT
  USING (true);

-- Política para permitir DELETE (cleanup)
CREATE POLICY "Enable delete for all users" ON signaling
  FOR DELETE
  USING (true);

-- Criar índice para melhor performance
CREATE INDEX idx_signaling_room_id ON signaling(room_id, created_at DESC);
```

### 3. Configure as credenciais

Edite o arquivo `config.js` e adicione suas credenciais do Supabase:

```javascript
const SUPABASE_URL = 'sua-url-do-supabase';
const SUPABASE_KEY = 'sua-chave-publica';
```

## 🎮 Como usar

### Iniciar servidor local

```bash
# Opção 1: Python
python -m http.server 8000

# Opção 2: Node.js (http-server)
npx http-server -p 8000

# Opção 3: PHP
php -S localhost:8000
```

### Como Broadcaster (Transmissor)

#### Modo Microfone:
1. Abra `http://localhost:8000`
2. Digite um nome de sala (ex: "podcast-ao-vivo")
3. Selecione **"🎤 Microfone"**
4. Clique em "Start Broadcasting"
5. Permita acesso ao microfone
6. Compartilhe o nome da sala com os ouvintes

#### Modo MP3 Playlist:
1. Abra `http://localhost:8000`
2. Digite um nome de sala (ex: "radio-hits")
3. Selecione **"🎵 Arquivos MP3"**
4. Clique em "Selecionar Arquivos MP3" e escolha suas músicas
5. Veja a playlist aparecer
6. Clique em "Start Broadcasting"
7. Use os controles do player:
   - ⏮️ **Anterior** - Volta para a faixa anterior
   - ▶️/⏸️ **Play/Pause** - Pausa/Retoma a reprodução
   - ⏭️ **Próxima** - Pula para próxima faixa
   - 📊 **Barra de progresso** - Clique para avançar/retroceder
   - 📋 **Lista** - Clique em qualquer faixa para tocar

### Como Listener (Ouvinte)

1. Abra `http://localhost:8000` em outra aba/navegador
2. Digite o **mesmo nome da sala**
3. Clique em "Join as Listener"
4. Aguarde a conexão ser estabelecida
5. Ajuste o volume conforme desejado
6. Ouça o áudio em tempo real!

## 🏗️ Arquitetura

### Fluxo de Conexão

```
Broadcaster                 Supabase                 Listener
    |                          |                         |
    |--- Offer (SDP) --------->|                         |
    |                          |--- Offer (SDP) -------->|
    |                          |<-- Answer (SDP) --------|
    |<-- Answer (SDP) ---------|                         |
    |                          |                         |
    |<========== WebRTC P2P Connection ================>|
    |              (Audio Stream - Mic/MP3)              |
```

### Componentes

- **WebRTC** - Protocolo P2P para streaming de mídia
- **Supabase Realtime** - Sinalização e descoberta de peers
- **MediaStream API** - Captura de áudio do microfone
- **Web Audio API** - Processamento e streaming de MP3
- **HTML5 Audio Element** - Player de arquivos MP3

## 🛠️ Tecnologias

- **WebRTC** - Comunicação peer-to-peer
- **Supabase** - Backend as a Service + Realtime
- **Web Audio API** - Processamento de áudio
- **Vanilla JavaScript** - Sem frameworks, puro e rápido
- **HTML5 + CSS3** - Interface moderna

## 📱 Compatibilidade

- ✅ Chrome/Edge (recomendado)
- ✅ Firefox
- ✅ Safari
- ✅ Opera
- ⚠️ Requer HTTPS em produção

## 🎯 Casos de Uso

### Modo Microfone
- 🎙️ Podcasts ao vivo
- 💬 Conversas em grupo
- 🎤 Apresentações
- 📢 Anúncios

### Modo MP3 Playlist
- 🎶 Rádio online personalizada
- 🎧 DJ sessions remotas
- 🎵 Streaming de música para eventos
- 📻 Broadcasting de áudio pré-gravado

## 🔐 Segurança

- Use HTTPS em produção (obrigatório para WebRTC)
- Configure CORS adequadamente
- Implemente autenticação para produção
- Use TURN servers para NAT traversal em produção
- Valide tipos de arquivo no upload de MP3

## 🐛 Troubleshooting

### Áudio não funciona
- Verifique se o microfone/arquivos MP3 estão permitidos
- Teste em HTTPS (necessário em produção)
- Verifique o console do navegador para erros

### MP3 não toca
- Confirme que os arquivos são .mp3 válidos
- Verifique o codec (MP3/MPEG suportado)
- Teste com arquivos menores primeiro

### Conexão falha
- Confirme as credenciais do Supabase
- Verifique se a tabela `signaling` foi criada
- Verifique as políticas RLS do Supabase

### NAT/Firewall
- Em produção, use um TURN server
- Configure ICE servers adequados

## 📄 Estrutura de Arquivos

```
webrtc-audio-streaming/
├── index.html          # Interface principal
├── styles.css          # Estilos com tema dark
├── app.js              # Lógica WebRTC + Playlist
├── config.js           # Configurações Supabase
├── README.md           # Esta documentação
└── .gitignore          # Arquivos ignorados
```

## 🎨 Interface

- **Tema Dark** moderno e elegante
- **Controles intuitivos** para broadcaster e listener
- **Visualizador de áudio** em tempo real
- **Player de playlist** completo com progress bar
- **Logs em tempo real** para debug
- **Design responsivo** para mobile

## 📚 API WebRTC

O app utiliza:
- `RTCPeerConnection` - Conexões P2P
- `getUserMedia()` - Acesso ao microfone
- `MediaStreamDestination` - Streaming de MP3
- `AudioContext` - Processamento de áudio
- Supabase Realtime - Sinalização

## 🔄 Fluxo de Dados (Modo MP3)

```
Arquivo MP3 → HTML5 Audio → Web Audio API → MediaStream → WebRTC → Listeners
```

## 📄 Licença

MIT License - Sinta-se livre para usar e modificar!

## 🤝 Contribuições

Pull requests são bem-vindos! Para mudanças maiores, abra uma issue primeiro.

## 🎯 Roadmap

- [x] Streaming de microfone
- [x] Streaming de playlist MP3
- [x] Player com controles completos
- [ ] Modo híbrido (Mic + MP3)
- [ ] Efeitos de áudio (equalizer, reverb)
- [ ] Chat de texto integrado
- [ ] Gravação de transmissões
- [ ] Salas privadas com senha
- [ ] Dashboard de estatísticas
- [ ] Suporte a mais formatos (OGG, WAV)

## 📞 Suporte

Para problemas ou dúvidas, abra uma issue no GitHub!

---

**Desenvolvido com ❤️ usando WebRTC + Supabase**

*Streaming de áudio nunca foi tão fácil!* 🎵
