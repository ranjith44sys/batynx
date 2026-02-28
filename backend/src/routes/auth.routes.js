const express = require("express");
const router = express.Router();
const UserService = require("../services/UserService");

/**
 * @route POST /api/auth/signup
 * @desc Register a new user
 */
router.post("/signup", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const user = await UserService.createUser({ name, email, phone, password });
        res.status(201).json(user);
    } catch (error) {
        console.error("Signup error:", error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and return profile
 */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await UserService.validateUser(email, password);
        res.status(200).json(user);
    } catch (error) {
        console.error("Login error:", error);
        res.status(401).json({ error: error.message });
    }
});

module.exports = router;
