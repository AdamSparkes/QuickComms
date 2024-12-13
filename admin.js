const express = require("express");
const router = express.Router();
const User = require("./models/User");

// Middleware
function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  User.findById(req.session.userId)
    .then((user) => {
      if (user && user.role === "admin") {
        next();
      } else {
        res.status(403).send("Access denied.");
      }
    })
    .catch((err) => {
      console.error("Error checking admin role:", err);
      res.status(500).send("Internal server error.");
    });
}

// Admin dashboard  list all users with delete option
router.get("/", requireAdmin, async (req, res) => {
  try {
    const users = await User.find().lean();
    const currentUser = await User.findById(req.session.userId).lean();
    res.render("admin", { users, currentUser });
  } catch (err) {
    console.error("Error fetching users for admin dashboard:", err);
    res.status(500).send("Error loading admin dashboard.");
  }
});

// Delete a user
router.post("/delete/:userId", requireAdmin, async (req, res) => {
  const { userId } = req.params;

  if (userId === req.session.userId) {
    return res.status(400).send("You cannot delete yourself.");
  }

  try {
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).send("User not found.");
    }
    await User.findByIdAndDelete(userId);
    res.redirect("/admin");
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).send("Error deleting user.");
  }
});

module.exports = router;
