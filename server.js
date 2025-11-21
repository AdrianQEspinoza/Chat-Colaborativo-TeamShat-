const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
console.log("Servidor WebSocket corriendo en ws://localhost:8080");

// Mapa global de usuarios: username -> { avatar, online, ws }
const allUsers = new Map();

let userCount = 1;
function generateUsername() {
    let name;
    do {
        name = "Usuario" + userCount++;
    } while (allUsers.has(name));
    return name;
}

function generateAvatar(username) {
    return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${username}`;
}

// Enviar lista de usuarios a todos
function broadcastUsers() {
    const users = Array.from(allUsers.values()).map(u => ({
        username: u.username,
        avatar: u.avatar,
        online: u.online
    }));
    const data = JSON.stringify({ type: "users", users });
    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) c.send(data);
    });
}

// Enviar mensaje a todos
function broadcastMessage(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) c.send(msg);
    });
}

wss.on("connection", ws => {
    let username;

    ws.on('message', msg => {
        let data;
        try { data = JSON.parse(msg); } catch { return; }

        if (data.type === "setName") {
            let isReconnected = false;

            if (allUsers.has(data.username)) {
                // Usuario existente reconectado
                username = data.username;
                allUsers.get(username).online = true;
                allUsers.get(username).ws = ws;
                isReconnected = true;
            } else {
                // Usuario nuevo
                username = data.username || generateUsername();
                allUsers.set(username, {
                    username,
                    avatar: generateAvatar(username),
                    online: true,
                    ws
                });
            }

            ws.send(JSON.stringify({
                type: "system",
                message: `¡Bienvenido, ${username}!`
            }));

            // Solo si es reconexión, mostrar que se unió nuevamente
            if (isReconnected) {
                broadcastMessage({
                    type: "system",
                    message: `${username} se unió al chat`
                });
            }

            broadcastUsers();
            return;
        }

        if (data.type === "message") {
            if (!username) return;
            broadcastMessage({
                type: "message",
                user: username,
                avatar: allUsers.get(username).avatar,
                message: data.message
            });
        }

        if (data.type === "typing") {
            if (!username) return;
            broadcastMessage({
                type: "typing",
                user: username
            });
        }
    });

    ws.on("close", () => {
        if (username && allUsers.has(username)) {
            allUsers.get(username).online = false;
            broadcastMessage({
                type: "system",
                message: `${username} salió del chat`
            });
            broadcastUsers();
        }
    });
});


