/**
 * Secure File Service Routes
 * Handles authenticated access to protected content (videos, PDFs)
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const authorize = require('../middleware/auth');
const secureFileController = require('../controllers/secureFileController');

// ============================================================
// PRIMARY ROUTE: Serve secure file by module ID
// Used by DRMProtection.fetchSecureFile(moduleId) in the frontend
// Supports: enrolled students, Staff, and Admins
// GET /api/secure-files/:moduleId
// ============================================================
router.get('/:moduleId', authorize(), secureFileController.serveSecureFile);

module.exports = router;
