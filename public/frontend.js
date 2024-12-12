// frontend.js

// Initialize WebSocket connection
const webSocket = new WebSocket("ws://localhost:3000/ws");

// Select UI elements defined in chat.ejs
const messagesContainer = document.getElementById("messages-container");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");

// Handle form submission (sending a message)
if (form && input) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    if (!window.recipientUsername) {
      console.error("Recipient is not defined.");
      return;
    }

    // Send the message to the server via WebSocket
    webSocket.send(
      JSON.stringify({
        type: "chat_message",
        recipient: window.recipientUsername,
        message,
      })
    );

    // Clear the input field
    input.value = "";
  });
}

// Handle incoming WebSocket messages
webSocket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "new_message") {
    displayChatMessage(data.username, data.timestamp, data.message);
  }
});

// Display a new incoming chat message in the messages container
function displayChatMessage(username, timestamp, message) {
  if (!messagesContainer) return;
  const msgEl = document.createElement("div");
  const time = new Date(timestamp);
  msgEl.textContent = `[${time.toLocaleTimeString()}] ${username}: ${message}`;
  messagesContainer.appendChild(msgEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
