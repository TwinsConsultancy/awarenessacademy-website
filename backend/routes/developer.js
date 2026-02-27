const express = require('express');
const router = express.Router();
const {
    getStreamMetrics,
    getSettings,
    updateSettings,
    getVideoStats,
    getMongoDBStats,
    getConnectionPoolMetrics,
    getQueryPerformance,
    getBackupStatus,
    getHistoricalMetrics,
    getRateLimits,
    getActiveUsers,
    getAtlasClusterMetrics,
    exportMetricsPDF
} = require('../controllers/developerController');
const authorize = require('../middleware/auth');

// Custom middleware to ensure only the default admin can access Developer routes
const defaultAdminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'Admin' && req.user.isDefaultAdmin === true) {
        next();
    } else {
        res.status(403).json({
            status: 'fail',
            message: 'Access denied. Only the default admin can access this area.'
        });
    }
};

// Apply protection to all routes - only Admins
router.use(authorize(['Admin']));
router.use(defaultAdminOnly);

// Route for SSE (Server-Sent Events) live streaming
router.get('/metrics/stream', getStreamMetrics);

// Routes for manual settings (Costs, Scaling)
router.route('/settings')
    .get(getSettings)
    .post(updateSettings);

// Route for static/cached video infrastructure stats
router.get('/video-stats', getVideoStats);

// MongoDB Atlas API Routes
router.get('/mongodb/stats', getMongoDBStats);
router.get('/mongodb/connections', getConnectionPoolMetrics);
router.get('/mongodb/performance', getQueryPerformance);
router.get('/mongodb/backups', getBackupStatus);
router.get('/mongodb/atlas-metrics', getAtlasClusterMetrics);

// Extended Dashboard Routes
router.get('/metrics/history', getHistoricalMetrics);
router.get('/rate-limits', getRateLimits);
router.get('/users/active', getActiveUsers);

// Export Routes
router.get('/export/pdf', exportMetricsPDF);

module.exports = router;
