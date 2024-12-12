const webSocket = new WebSocket("ws://localhost:3000/ws");

const messagesContainer = document.getElementById("messages-container");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const onlineUsersContainer = document.getElementById("online-users");

if (form && input) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    // Determine if we're in a public chatroom or a private chat
    if (window.isPublicChat) {
      webSocket.send(
        JSON.stringify({
          type: "public_message",
          message,
        })
      );
    } else {
      if (!window.recipientUsername) {
        console.error("Recipient is not defined.");
        return;
      }

      webSocket.send(
        JSON.stringify({
          type: "chat_message",
          recipient: window.recipientUsername,
          message,
        })
      );
    }

    input.value = "";
  });
}

webSocket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  // For private messages
  if (data.type === "new_message") {
    displayChatMessage(data.username, data.timestamp, data.message);
  }

  // For public messages
  if (data.type === "public_new_message") {
    displayChatMessage(data.username, data.timestamp, data.message);
  }

  // For user joined
  if (data.type === "user_joined") {
    displayNotification(`${data.username} has joined the chat.`);
  }

  // For user left
  if (data.type === "user_left") {
    displayNotification(`${data.username} has left the chat.`);
  }

  // For updating online users
  if (data.type === "update_online_users") {
    updateOnlineUsersList(data.onlineUsers);
  }
});

/**
 * Displays a chat message in the messages container
 * @param {string} username - The username of the sender
 * @param {string} timestamp - The timestamp of the message
 * @param {string} message - The message text
 */
function displayChatMessage(username, timestamp, message) {
  if (!messagesContainer) return;
  const msgEl = document.createElement("div");
  const time = new Date(timestamp);
  msgEl.textContent = `[${time.toLocaleTimeString()}] ${username}: ${message}`;
  messagesContainer.appendChild(msgEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Displays a notification message in the messages container
 * @param {string} message notification message
 */
function displayNotification(message) {
  if (!messagesContainer) return;
  const notifEl = document.createElement("div");
  notifEl.style.fontStyle = "italic";
  notifEl.style.color = "#FFDD57";
  notifEl.textContent = message;
  messagesContainer.appendChild(notifEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Updates the online users list
 * @param {Array<string>} onlineUsers - List of online usernames
 */
function updateOnlineUsersList(onlineUsers) {
  if (!onlineUsersContainer) return;
  onlineUsersContainer.innerHTML = ""; // Clear existing list

  onlineUsers.forEach((username) => {
    const userEl = document.createElement("li");
    userEl.textContent = username;
    onlineUsersContainer.appendChild(userEl);
  });
}
