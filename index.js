const express = require('express');
const expressWs = require('express-ws');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');

const User = require('./models/User');

const PORT = 3000;
//TODO: Replace with the URI pointing to your own MongoDB setup
const MONGO_URI = 'mongodb://localhost:27017/keyin_test';
const app = express();
expressWs(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(session({
    secret: 'chat-app-secret',
    resave: false,
    saveUninitialized: true
}));

let connectedClients = [];

//Ive added console logs for the websockets for testing purposes just to make sure the ws handling is functioning as intended.

app.ws('/ws', (socket) => {
    console.log('WebSocket connection established');

    socket.on('message', (rawMessage) => {
        
        try {
            const parsedMessage = JSON.parse(rawMessage);
            console.log('Parsed message:', parsedMessage);
        } catch (err) {
            console.error('Error parsing WebSocket message:', err);
        }
    });

    socket.on('close', () => {
        connectedClients = connectedClients.filter(client => client !== socket);
        console.log('WebSocket connection closed. Remaining clients:', connectedClients.length);
    });

    connectedClients.push(socket);
    console.log('New WebSocket client connected. Total clients:', connectedClients.length);
});

// Added some middleware to help with authenicating user.
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        console.log('Authentication failed: No session user ID');
        return res.redirect('/login');
    }
    console.log('Authentication successful for user ID:', req.session.userId);
    next();
}


app.get('/', async (request, response) => {
    response.render('index/unauthenticated');
});

app.get('/login', async (request, response) => {
    res.render('login', { errorMessage: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('login', { errorMessage: "You must fill in all fields." });
    }

    try {
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('login', { errorMessage: "Invalid username or password." });
        }

        req.session.userId = user._id; // Save user in session
        res.redirect('/dashboard'); // Redirect to dashboard
    } catch (err) {
        console.error(err);
        res.render('login', { errorMessage: "An error occurred. Please try again." });
    }
});

app.get('/signup', async (request, response) => {
    return response.render('signup', {errorMessage: null});
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('signup', { errorMessage: "You must fill in all fields" });
    }

    try {
    
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.render('signup', { errorMessage: "Someone already has that name, try again." });
        }

      
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

       
        req.session.userId = newUser._id;
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('signup', { errorMessage: "An error occurred. Please try again." });
    }
});

app.get('/dashboard', async (request, response) => {

    return response.render('index/authenticated');
});

app.get('/profile', requireAuth, (req, res) => {
    res.render('profile'); 
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Could not log out.");
        }
        res.redirect('/');
    });
});
mongoose.connect(MONGO_URI)
    .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
    .catch((err) => console.error('MongoDB connection error:', err));

/**
 * Handles a client disconnecting from the chat server
 * 
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want 
 * to handle the disconnection of clients
 * 
 * @param {string} username The username of the client who disconnected
 */
function onClientDisconnected(username) {
   
}

/**
 * Handles a new client connecting to the chat server
 * 
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want 
 * to handle the connection of clients
 * 
 * @param {WebSocket} newSocket The socket the client has opened with the server
 * @param {string} username The username of the user who connected
 */
function onNewClientConnected(newSocket, username) {
    
}

/**
 * Handles a new chat message being sent from a client
 * 
 * This function isn't necessary and should be deleted if unused. But it's left as a hint to how you might want 
 * to handle new messages
 * 
 * @param {string} message The message being sent
 * @param {string} username The username of the user who sent the message
 * @param {strng} id The ID of the user who sent the message
 */
async function onNewMessage(message, username, id) {
    
}