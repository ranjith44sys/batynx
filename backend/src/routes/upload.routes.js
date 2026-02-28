const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const SupabaseService = require('../services/supabase.service');

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure directory exists
        const uploadDir = path.join(__dirname, '../../storage/attachments');
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/upload - Handle file upload
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const fileBuffer = await fs.readFile(filePath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Log to Supabase if batteryId is provided
        const batteryId = req.body.batteryId || req.query.batteryId;
        if (batteryId) {
            await SupabaseService.logDocument(batteryId, {
                type: req.body.documentType || 'General',
                name: req.file.originalname,
                path: req.file.path,
                size: parseFloat((req.file.size / (1024 * 1024)).toFixed(2))
            });
        }

        res.json({
            message: 'File uploaded successfully',
            filename: req.file.filename,
            originalName: req.file.originalname,
            hash: hash,
            url: `/api/upload/view/${req.file.filename}`
        });
    } catch (err) {
        console.error('[Upload] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/upload/view/:filename - Serve the PDF file
router.get('/view/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../../storage/attachments', filename);

        if (await fs.pathExists(filePath)) {
            // Set headers for inline PDF display
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.sendFile(filePath);
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
