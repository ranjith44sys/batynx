const express = require('express');
const router = express.Router();
const LogService = require('../services/log.service');

// Get all chain logs
router.get('/all', async (req, res) => {
    try {
        const logs = await LogService.getLogs();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
