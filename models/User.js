const mongoose = require('mongoose');

// Define the schema for users
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true, // Removes extra spaces
        minlength: 3, // Optional: Set a minimum length
    },
    password: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now, // Automatically sets the timestamp
    },
});

// Create and export the model
module.exports = mongoose.model('User', UserSchema);