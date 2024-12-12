// frontend.js

const webSocket = new WebSocket("ws://localhost:3000/ws");

const messagesContainer = document.getElementById("messages-container");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");

// This handler runs when the user submits the form to send a message.
if (form && input) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    // Determine if we're in a public chatroom or a private chat
    if (window.isPublicChat) {
      // Public chat message
      webSocket.send(
        JSON.stringify({
          type: "public_message",
          message,
        })
      );
    } else {
      // Private chat message
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

// This handler runs whenever a message is received from the server.
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
