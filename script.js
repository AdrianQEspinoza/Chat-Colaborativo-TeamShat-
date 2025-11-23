// Variables globales
let socket;
let username = null;
let userEmail = null;

// Referencias a elementos del DOM
const loginScreen = document.getElementById('login-screen');
const chatApp = document.getElementById('chat-app');
const userNameSpan = document.getElementById('user-name');
const logoutButton = document.getElementById('logoutButton');

// Función llamada por Google al iniciar sesión
function handleCredentialResponse(response) {
    // Decodificar el token JWT de Google
    const payload = parseJwt(response.credential);
    
    // Obtener información del usuario
    username = payload.name;
    userEmail = payload.email;
    
    console.log('✅ Usuario autenticado:', username, userEmail);
    
    // Mostrar chat y ocultar login
    loginScreen.classList.add('hidden');
    chatApp.classList.remove('hidden');
    userNameSpan.textContent = username;
    
    // Inicializar el chat
    initializeChat();
}

// Decodificar JWT (token de Google)
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Inicializar chat después del login
function initializeChat() {
    socket = new WebSocket('ws://localhost:8080');
    
    const messagesDiv = document.getElementById('messages');
    const input = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const onlineList = document.getElementById('online-users');
    const offlineList = document.getElementById('offline-users');
    const emojiButton = document.getElementById('emojiButton');
    const emojiPicker = document.getElementById('emojiPicker');

    socket.addEventListener('open', () => {
        console.log('🔌 Conectado al servidor WebSocket');
        socket.send(JSON.stringify({ type: 'setName', username }));
    });

    // Generar color único por usuario
    function stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return "#" + "00000".substring(0, 6 - c.length) + c;
    }

    // Enviar mensaje
    function sendMessage() {
        const message = input.value.trim();
        if (!message) return;
        socket.send(JSON.stringify({ type: 'message', message }));
        input.value = '';
    }

    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Toggle emoji picker
    emojiButton.addEventListener('click', () => {
        emojiPicker.classList.toggle('hidden');
    });

    // Insertar emoji
    emojiPicker.querySelectorAll('.emoji').forEach(emoji => {
        emoji.addEventListener('click', () => {
            input.value += emoji.textContent;
            input.focus();
        });
    });

    // Recibir mensajes del servidor
    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'users') {
            updateUsersList(data.users);
            return;
        }

        if (data.type === 'system') {
            const msgEl = document.createElement('div');
            msgEl.className = 'message system-message';
            msgEl.textContent = data.message;
            messagesDiv.appendChild(msgEl);
        }

        if (data.type === 'message') {
            const msgEl = document.createElement('div');
            const isMine = data.user === username;
            msgEl.className = isMine ? 'message my-message' : 'message user-message';

            // Avatar
            const avatar = document.createElement('div');
            avatar.className = 'avatar';
            avatar.style.backgroundColor = stringToColor(data.user);
            avatar.textContent = data.user[0].toUpperCase();

            // Contenido
            const userSpan = document.createElement('span');
            userSpan.style.fontWeight = '600';
            userSpan.textContent = `${data.user}: `;

            const textSpan = document.createElement('span');
            textSpan.innerHTML = data.message;

            msgEl.appendChild(avatar);
            msgEl.appendChild(userSpan);
            msgEl.appendChild(textSpan);

            messagesDiv.appendChild(msgEl);
        }

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    // Actualizar lista de usuarios
    function updateUsersList(users) {
        onlineList.innerHTML = '';
        offlineList.innerHTML = '';

        users.forEach(u => {
            const li = document.createElement('li');
            li.textContent = u.username;
            li.style.backgroundColor = u.online ? stringToColor(u.username) : '#555';
            if (u.online) onlineList.appendChild(li);
            else offlineList.appendChild(li);
        });
    }
}

// Cerrar sesión
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        if (socket) socket.close();
        location.reload();
    });
}

