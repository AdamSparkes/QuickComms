const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: String, 
        required: true,
        trim: true,
    },
    recipient: {
        type: String, 
        required: true,
        trim: true,
    },
    message: {
        type: String, 
        required: true,
    },
    timestamp: {
        type: Date, 
        default: Date.now, 
    },
});

// Export the model
module.exports = mongoose.model('Message', MessageSchema);