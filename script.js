const socket = new WebSocket('ws://localhost:8080');

const messagesDiv = document.getElementById('messages');
const input = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const onlineList = document.getElementById('online-users');
const offlineList = document.getElementById('offline-users');
const emojiButton = document.getElementById('emojiButton');
const emojiPicker = document.getElementById('emojiPicker');

let username = null;

// Preguntar al usuario su nombre
const customName = prompt("Ingresa tu nombre (dejar vacío para nombre automático):");
if (customName && customName.trim() !== '') username = customName.trim();

socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'setName', username }));
});

// Color por usuario
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
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
input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

// Emoji picker toggle
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

// Recibir mensajes
socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'users') {
        updateUsersList(data.users);
        return;
    }

    if (data.type === 'system') {
        if (!username) username = data.message.match(/¡Bienvenido, (.*)!/)[1];
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

