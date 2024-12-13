// index.js

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const Message = require("./models/Message");
const expressWs = require("express-ws");
const adminRoutes = require("./admin"); // Import admin routes

// Initialize Express app
const app = express();

// Hardcoded Admin Code
const ADMIN_CODE = "BEANS"; // Replace with your desired admin code

// Set up session middleware BEFORE using expressWs
const sessionMiddleware = session({
  secret: "chat-app-secret",
  resave: false,
  saveUninitialized: true,
});
app.use(sessionMiddleware);

// Initialize express-ws AFTER session middleware
expressWs(app, null, {
  // Pass the session middleware to WebSocket connections
  // This allows access to session data within WebSocket handlers
  wsOptions: {
    verifyClient: (info, cb) => {
      sessionMiddleware(info.req, {}, () => {
        cb(true);
      });
    },
  },
});

const PORT = 3000;
const MONGO_URI = "mongodb://localhost:27017/keyin_test";

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

let connectedClients = [];

// Middleware to ensure user is authenticated
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    console.log("Authentication failed: No session user ID");
    return res.redirect("/login");
  }
  console.log("Authentication successful for user ID:", req.session.userId);
  next();
}

// Routes
app.get("/", (req, res) => {
  console.log("Rendering unauthenticated index page");
  const onlineCount = connectedClients.length;
  res.render("index/unauthenticated", { onlineCount });
});

app.get("/login", async (req, res) => {
  console.log("Rendering login page");
  res.render("login", { errorMessage: null });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render("login", {
      errorMessage: "You must fill in all fields.",
    });
  }

  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render("login", {
        errorMessage: "Invalid username or password.",
      });
    }

    // Store both userId and username in session
    req.session.userId = user._id;
    req.session.username = user.username;

    // Redirect based on role
    if (user.role === "admin") {
      res.redirect("/admin");
    } else {
      res.redirect("/dashboard");
    }
  } catch (err) {
    console.error(err);
    res.render("login", {
      errorMessage: "An error occurred. Please try again.",
    });
  }
});

app.get("/signup", async (req, res) => {
  return res.render("signup", { errorMessage: null });
});

app.post("/signup", async (req, res) => {
  const { username, email, password, adminCode } = req.body;

  if (!username || !password) {
    return res.render("signup", {
      errorMessage: "You must fill in all required fields.",
    });
  }

  try {
    // Check if username is taken
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render("signup", {
        errorMessage: "Someone already has that name, try again.",
      });
    }

    // If email is provided, check if it's already used
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.render("signup", {
          errorMessage: "Email already in use. Please use a different email.",
        });
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine role based on admin code
    let role = "user";
    if (adminCode && adminCode === ADMIN_CODE) {
      role = "admin";
    }

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
    });
    await newUser.save();

    // Store both userId and username in session
    req.session.userId = newUser._id;
    req.session.username = newUser.username;

    // Redirect based on role
    if (role === "admin") {
      res.redirect("/admin");
    } else {
      res.redirect("/dashboard");
    }
  } catch (err) {
    console.error(err);
    res.render("signup", {
      errorMessage: "An error occurred. Please try again.",
    });
  }
});

app.get("/dashboard", requireAuth, async (req, res) => {
  console.log("Rendering dashboard for user ID:", req.session.userId);

  try {
    const user = await User.findById(req.session.userId).lean();
    if (!user) {
      return res.status(404).send("User not found.");
    }

    res.render("index/authenticated", { user });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).send("An error occurred while loading the dashboard.");
  }
});

app.get("/profile", requireAuth, async (req, res) => {
  console.log("Rendering profile page for user ID:", req.session.userId);

  try {
    const profileUser = await User.findById(req.session.userId).lean();
    if (!profileUser) {
      return res.status(404).send("User not found.");
    }

    res.render("profile", { profileUser });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).send("An error occurred while loading the profile.");
  }
});

app.get("/new-message", requireAuth, async (req, res) => {
  try {
    const users = await User.find({
      username: { $ne: req.session.username },
    }).lean();
    const sender = { username: req.session.username };
    res.render("newMessage", { users, sender });
  } catch (err) {
    console.error("Error fetching users for new message:", err);
    res.status(500).send("Error loading new message page.");
  }
});

// Private chat route
app.get("/chat/:recipient", requireAuth, async (req, res) => {
  console.log(
    "Rendering chat page for user:",
    req.session.userId,
    "with recipient:",
    req.params.recipient
  );

  const { recipient } = req.params;
  const sender = req.session.username;

  try {
    const chatHistory = await Message.find({
      $or: [
        { sender, recipient },
        { sender: recipient, recipient: sender },
      ],
    }).sort({ timestamp: 1 });

    res.render("chat", { chatHistory, sender, recipient });
  } catch (err) {
    console.error("Error fetching chat history:", err);
    res.status(500).send("Error loading chat page.");
  }
});

// Public chatroom route
app.get("/chatroom", requireAuth, async (req, res) => {
  console.log("Rendering public chatroom for user:", req.session.userId);
  try {
    // Fetch all public messages
    const chatHistory = await Message.find({ recipient: "public" }).sort({
      timestamp: 1,
    });
    const sender = req.session.username;
    res.render("chatroom", { chatHistory, sender });
  } catch (err) {
    console.error("Error fetching public chat history:", err);
    res.status(500).send("Error loading public chatroom.");
  }
});

// Logout route
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Error logging out.");
    }
    res.redirect("/");
  });
});

// Mount admin routes
app.use("/admin", adminRoutes);

// WebSocket route
app.ws("/ws", (socket, req) => {
  console.log("WebSocket connection established");

  // Access the session data
  const session = req.session;
  const username = session?.username || "Anonymous";

  // Add to connected clients
  connectedClients.push({ socket, username });
  console.log(`User connected via WebSocket: ${username}`);
  console.log(`Total connected clients: ${connectedClients.length}`);

  // Notify all users that a new user has joined
  connectedClients.forEach((client) => {
    if (client.socket.readyState === 1) {
      client.socket.send(
        JSON.stringify({
          type: "user_joined",
          username,
          timestamp: new Date().toISOString(),
        })
      );
    }
  });

  // Broadcast the updated list of online users
  const onlineUsers = connectedClients.map((client) => client.username);
  connectedClients.forEach((client) => {
    if (client.socket.readyState === 1) {
      client.socket.send(
        JSON.stringify({
          type: "update_online_users",
          onlineUsers,
        })
      );
    }
  });

  socket.on("message", async (rawMessage) => {
    console.log("Received WebSocket message:", rawMessage);
    try {
      const parsedMessage = JSON.parse(rawMessage);

      // Handle private chat messages
      if (parsedMessage.type === "chat_message") {
        const { recipient, message } = parsedMessage;
        const newMessage = new Message({
          sender: username,
          recipient,
          message,
        });
        await newMessage.save();

        // Broadcast to sender and recipient
        connectedClients.forEach((client) => {
          // Send to recipient if connected
          if (client.username === recipient && client.socket.readyState === 1) {
            client.socket.send(
              JSON.stringify({
                type: "new_message",
                username,
                timestamp: new Date().toISOString(),
                message,
              })
            );
          }

          // Send to sender as well
          if (client.username === username && client.socket.readyState === 1) {
            client.socket.send(
              JSON.stringify({
                type: "new_message",
                username,
                timestamp: new Date().toISOString(),
                message,
              })
            );
          }
        });
      }

      // Handle public chat messages
      if (parsedMessage.type === "public_message") {
        const { message } = parsedMessage;
        const newMessage = new Message({
          sender: username,
          recipient: "public",
          message,
        });
        await newMessage.save();

        // Broadcast to ALL connected clients
        connectedClients.forEach((client) => {
          if (client.socket.readyState === 1) {
            client.socket.send(
              JSON.stringify({
                type: "public_new_message",
                username,
                timestamp: new Date().toISOString(),
                message,
              })
            );
          }
        });
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  });

  socket.on("close", () => {
    connectedClients = connectedClients.filter(
      (client) => client.socket !== socket
    );
    console.log(`WebSocket connection closed for user: ${username}`);
    console.log(`Remaining connected clients: ${connectedClients.length}`);

    // Notify all users that a user has left
    connectedClients.forEach((client) => {
      if (client.socket.readyState === 1) {
        client.socket.send(
          JSON.stringify({
            type: "user_left",
            username,
            timestamp: new Date().toISOString(),
          })
        );
      }
    });

    // Broadcast the updated list of online users
    const onlineUsers = connectedClients.map((client) => client.username);
    connectedClients.forEach((client) => {
      if (client.socket.readyState === 1) {
        client.socket.send(
          JSON.stringify({
            type: "update_online_users",
            onlineUsers,
          })
        );
      }
    });
  });
});

// Connect to MongoDB and Start Server
mongoose
  .connect(MONGO_URI)
  .then(() =>
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    )
  )
  .catch((err) => console.error("MongoDB connection error:", err));
