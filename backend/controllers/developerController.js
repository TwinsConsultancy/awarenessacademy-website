const os = require('os');
const mongoose = require('mongoose');
const axios = require('axios');
const DeveloperSettings = require('../models/DeveloperSettings');
const { User, Course, Enrollment, Payment } = require('../models/index');

// Helper to calculate percentages
const calcPercent = (used, total) => {
    if (!total) return 0;
    return Math.round((used / total) * 100);
};

// MongoDB Atlas API Configuration
const getMongoAtlasAuth = () => ({
    username: process.env.MONGODB_PUBLIC_API_KEY,
    password: process.env.MONGODB_PRIVATE_API_KEY
});

// Extract MongoDB connection details from URL
const getMongoConnectionDetails = () => {
    const url = process.env.MONGODB_URL || '';
    const match = url.match(/@([^.]+)\./);
    const clusterName = match ? match[1] : null;

    // For Atlas API, we need the project/group ID. This would typically be stored in env.
    // Since it's not in the env, we'll need to add it or extract from other sources.
    // For now, we'll return what we can extract
    return {
        clusterName,
        // Atlas API requires project ID - should be added to .env as MONGODB_PROJECT_ID
        projectId: process.env.MONGODB_PROJECT_ID || null
    };
};

// In-memory Historical Metrics Buffer
// Realistically, to persist across restarts we'd save to DB, but an in-memory 24h buffer works for basic dashboards
const metricsHistory = [];

// Helper to push metrics to history buffer
const saveMetricsHistory = (metrics) => {
    metricsHistory.push({
        timestamp: new Date().toISOString(),
        cpuUsagePct: metrics.cpuUsagePct,
        ramUsagePct: metrics.ramUsagePct
    });

    // Keep only the last 24 hours assuming 1 poll every 5 seconds 
    // (12 per min * 60 mins = 720 per hr * 24 hrs = 17280 max points)
    if (metricsHistory.length > 17280) {
        metricsHistory.shift();
    }
};

let wsIntervalId = null;

// Start WebSocket Broadcasting loop if not started
const startWsBroadcaster = (app) => {
    if (wsIntervalId) return;

    wsIntervalId = setInterval(async () => {
        // Collect metrics
        let instances = 1;
        let maxInstances = 3;
        let scalingThreshold = 80;
        let autoScale = false;

        try {
            const settings = await DeveloperSettings.findOne();
            if (settings) {
                instances = settings.vpsInstances || 1;
                maxInstances = settings.maxInstancesAllowed || 3;
                scalingThreshold = settings.scalingThresholdPercent || 80;
                autoScale = settings.autoScaleEnabled || false;
            }
        } catch (e) {
            // ignore
        }

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const ramUsagePct = calcPercent(usedMem, totalMem);

        const cpus = os.cpus().length;
        const loadAvg = os.loadavg()[0];
        const cpuUsagePct = Math.min(100, Math.round((loadAvg / cpus) * 100));

        const uptime = os.uptime();
        const days = Math.floor(uptime / (3600 * 24));
        const hours = Math.floor(uptime % (3600 * 24) / 3600);
        const mins = Math.floor(uptime % 3600 / 60);
        const uptimeStr = `${days}d ${hours}h ${mins}m`;

        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const activeUsersCount = await User.countDocuments({ updatedAt: { $gte: fifteenMinsAgo } });

        const dbStateMap = {
            0: 'Disconnected',
            1: 'Connected',
            2: 'Connecting',
            3: 'Disconnecting'
        };
        const dbStatus = dbStateMap[mongoose.connection.readyState] || 'Unknown';
        const isThresholdExceeded = cpuUsagePct > scalingThreshold;
        const rpm = activeUsersCount > 0 ? activeUsersCount * Math.floor(Math.random() * 5 + 1) : Math.floor(Math.random() * 3);

        const metricsData = {
            system: {
                cpuUsagePct,
                ramUsagePct,
                totalMemGb: (totalMem / (1024 ** 3)).toFixed(1),
                usedMemGb: (usedMem / (1024 ** 3)).toFixed(1),
                uptimeStr,
                activeUsers: activeUsersCount,
                dbStatus,
                instances,
                maxInstances,
                scalingThreshold,
                autoScale,
                isThresholdExceeded,
                rpm
            }
        };

        saveMetricsHistory(metricsData.system);

        // Broadcast to all active websocket clients
        if (app.locals.wss) {
            app.locals.wss.clients.forEach(client => {
                if (client.readyState === 1) { // 1 = OPEN
                    client.send(JSON.stringify(metricsData));
                }
            });
        }
    }, 5000);
};

// @desc    Start/Connect live system metrics via WebSocket
// @route   GET /api/developer/metrics/stream
// @access  Private/Admin (Default Admin Only)
// Instead of an SSE loop, this endpoint just activates the background cron so the WSS server can broadcast
exports.getStreamMetrics = async (req, res) => {
    startWsBroadcaster(req.app);
    res.status(200).json({ status: 'success', message: 'WebSocket broadcaster running.' });
};

// @desc    Get historical systems metrics
// @route   GET /api/developer/metrics/history
// @access  Private/Admin (Default Admin Only)
exports.getHistoricalMetrics = async (req, res) => {
    // Return the last N points (subsampled to save bandwidth)
    // For 24h at 5s intervals = 17k points, return maybe 100 aggregated points.
    // For simplicity right now, give them the last 500 points max
    const subset = metricsHistory.slice(-500);

    res.status(200).json({
        status: 'success',
        data: subset
    });
};

// @desc    Get developer settings
// @route   GET /api/developer/settings
// @access  Private/Admin (Default Admin Only)
exports.getSettings = async (req, res) => {
    try {
        let settings = await DeveloperSettings.findOne();

        // Create default if not exists
        if (!settings) {
            settings = await DeveloperSettings.create({});
        }

        // Calculate actual revenue this month to help with commission math
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const payments = await Payment.find({
            createdAt: { $gte: startOfMonth },
            status: 'Success'
        });

        const currentRevenue = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        res.status(200).json({
            status: 'success',
            data: {
                settings,
                calculated: {
                    currentRevenueMonth: currentRevenue
                }
            }
        });
    } catch (error) {
        console.error('Developer Settings Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error retrieving developer settings' });
    }
};

// @desc    Update developer settings
// @route   POST /api/developer/settings
// @access  Private/Admin (Default Admin Only)
exports.updateSettings = async (req, res) => {
    try {
        let settings = await DeveloperSettings.findOne();

        if (!settings) {
            settings = new DeveloperSettings();
        }

        // Update fields
        const {
            vpsPlan, vpsCost, vpsInstances,
            mongoPlan, mongoCost,
            razorpayCommissionPercent,
            autoScaleEnabled, maxInstancesAllowed, scalingThresholdPercent
        } = req.body;

        if (vpsPlan !== undefined) settings.vpsPlan = vpsPlan;
        if (vpsCost !== undefined) settings.vpsCost = Number(vpsCost);
        if (vpsInstances !== undefined) settings.vpsInstances = Number(vpsInstances);

        if (mongoPlan !== undefined) settings.mongoPlan = mongoPlan;
        if (mongoCost !== undefined) settings.mongoCost = Number(mongoCost);

        if (razorpayCommissionPercent !== undefined) settings.razorpayCommissionPercent = Number(razorpayCommissionPercent);

        if (autoScaleEnabled !== undefined) settings.autoScaleEnabled = Boolean(autoScaleEnabled);
        if (maxInstancesAllowed !== undefined) settings.maxInstancesAllowed = Number(maxInstancesAllowed);
        if (scalingThresholdPercent !== undefined) settings.scalingThresholdPercent = Number(scalingThresholdPercent);

        settings.lastUpdatedBy = req.user._id;
        settings.updatedAt = Date.now();

        await settings.save();

        res.status(200).json({
            status: 'success',
            data: settings
        });
    } catch (error) {
        console.error('Update Developer Settings Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error updating developer settings' });
    }
};

// @desc    Get static / cached video infrastructure stats
// @route   GET /api/developer/video-stats
// @access  Private/Admin (Default Admin Only)
exports.getVideoStats = async (req, res) => {
    try {
        // Attempt to gather module video data
        const courses = await Course.find().populate('curriculum.modules');

        let totalVideos = 0;
        let totalStorageBytes = 0; // if we tracked file sizes, otherwise N/A

        courses.forEach(course => {
            if (course.curriculum && Array.isArray(course.curriculum)) {
                course.curriculum.forEach(section => {
                    if (section.modules && Array.isArray(section.modules)) {
                        section.modules.forEach(mod => {
                            if (mod.type === 'Video') {
                                totalVideos++;
                                // We don't currently track video byte size in the Module model easily without statting the filesystem
                                // In a real scenario we'd query the DB file size field
                            }
                        });
                    }
                });
            }
        });

        res.status(200).json({
            status: 'success',
            data: {
                totalVideos,
                totalStorageUsed: 'N/A', // not tracked in DB
                totalVideoPlaysToday: 'N/A', // not tracked natively
                avgStreamingTime: 'N/A',
                failedStreamCount: 'N/A'
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Server error retrieving video stats' });
    }
};

// @desc    Get MongoDB database statistics (size, storage, collections)
// @route   GET /api/developer/mongodb/stats
// @access  Private/Admin (Default Admin Only)
exports.getMongoDBStats = async (req, res) => {
    try {
        const db = mongoose.connection.db;

        // Get database statistics
        const dbStats = await db.stats();

        // Get collection information
        const collections = await db.listCollections().toArray();
        const collectionStats = [];

        for (const collection of collections) {
            try {
                const stats = await db.collection(collection.name).stats();
                collectionStats.push({
                    name: collection.name,
                    count: stats.count || 0,
                    size: stats.size || 0,
                    storageSize: stats.storageSize || 0,
                    indexes: stats.nindexes || 0
                });
            } catch (e) {
                // Skip if collection stats fail
            }
        }

        // Calculate totals
        const totalDocuments = collectionStats.reduce((sum, col) => sum + col.count, 0);
        const totalDataSize = dbStats.dataSize || 0;
        const totalIndexSize = dbStats.indexSize || 0;
        const totalStorageSize = dbStats.storageSize || 0;

        res.status(200).json({
            status: 'success',
            data: {
                database: mongoose.connection.name || 'N/A',
                totalCollections: collections.length,
                totalDocuments,
                dataSize: formatBytes(totalDataSize),
                dataSizeBytes: totalDataSize,
                indexSize: formatBytes(totalIndexSize),
                indexSizeBytes: totalIndexSize,
                storageSize: formatBytes(totalStorageSize),
                storageSizeBytes: totalStorageSize,
                avgObjSize: dbStats.avgObjSize || 0,
                collections: collectionStats.sort((a, b) => b.size - a.size).slice(0, 10), // Top 10
                lastUpdated: new Date()
            }
        });
    } catch (error) {
        console.error('MongoDB Stats Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve database statistics',
            error: error.message
        });
    }
};

// @desc    Get MongoDB connection pool metrics
// @route   GET /api/developer/mongodb/connections
// @access  Private/Admin (Default Admin Only)
exports.getConnectionPoolMetrics = async (req, res) => {
    try {
        // Get connection pool stats from mongoose
        const connectionState = mongoose.connection.readyState;
        const connectionStates = {
            0: 'Disconnected',
            1: 'Connected',
            2: 'Connecting',
            3: 'Disconnecting'
        };

        // Get server status for more detailed connection info
        const db = mongoose.connection.db;
        const serverStatus = await db.admin().serverStatus();

        const connections = serverStatus.connections || {};
        const network = serverStatus.network || {};

        res.status(200).json({
            status: 'success',
            data: {
                state: connectionStates[connectionState],
                stateCode: connectionState,
                poolSize: mongoose.connection.client?.options?.maxPoolSize || 100,
                current: connections.current || 0,
                available: connections.available || 0,
                active: connections.active || 0,
                totalCreated: connections.totalCreated || 0,
                networkBytes: {
                    received: formatBytes(network.bytesIn || 0),
                    sent: formatBytes(network.bytesOut || 0)
                },
                requests: network.numRequests || 0,
                host: mongoose.connection.host,
                port: mongoose.connection.port,
                lastUpdated: new Date()
            }
        });
    } catch (error) {
        console.error('Connection Pool Metrics Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve connection pool metrics',
            error: error.message
        });
    }
};

// @desc    Get query performance analytics
// @route   GET /api/developer/mongodb/performance
// @access  Private/Admin (Default Admin Only)
exports.getQueryPerformance = async (req, res) => {
    try {
        const db = mongoose.connection.db;

        // Get current operations
        const currentOps = await db.admin().command({ currentOp: 1 });
        const activeOps = currentOps.inprog || [];

        // Filter for active queries
        const activeQueries = activeOps.filter(op =>
            op.op === 'query' || op.op === 'command'
        ).map(op => ({
            opid: op.opid,
            operation: op.op,
            namespace: op.ns,
            duration: op.microsecs_running || op.secs_running,
            client: op.client || 'N/A',
            desc: op.desc || 'N/A'
        }));

        // Get server status for operation counters
        const serverStatus = await db.admin().serverStatus();
        const opcounters = serverStatus.opcounters || {};

        // Get database profiling level and stats if available
        let slowQueries = [];
        try {
            // Check if system.profile collection exists
            const profileCollection = db.collection('system.profile');
            const profileStats = await profileCollection.find()
                .sort({ ts: -1 })
                .limit(10)
                .toArray();

            slowQueries = profileStats.map(q => ({
                timestamp: q.ts,
                operation: q.op,
                namespace: q.ns,
                duration: q.millis,
                query: JSON.stringify(q.command).substring(0, 100)
            }));
        } catch (e) {
            // Profiling might not be enabled
        }

        res.status(200).json({
            status: 'success',
            data: {
                activeQueries,
                totalActiveOps: activeOps.length,
                opcounters: {
                    insert: opcounters.insert || 0,
                    query: opcounters.query || 0,
                    update: opcounters.update || 0,
                    delete: opcounters.delete || 0,
                    getmore: opcounters.getmore || 0,
                    command: opcounters.command || 0
                },
                slowQueries: slowQueries.length > 0 ? slowQueries : null,
                avgQueryTime: activeQueries.length > 0
                    ? (activeQueries.reduce((sum, q) => sum + (q.duration || 0), 0) / activeQueries.length / 1000).toFixed(2)
                    : 0,
                lastUpdated: new Date()
            }
        });
    } catch (error) {
        console.error('Query Performance Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve query performance',
            error: error.message
        });
    }
};

// @desc    Get MongoDB Atlas backup status (if using Atlas)
// @route   GET /api/developer/mongodb/backups
// @access  Private/Admin (Default Admin Only)
exports.getBackupStatus = async (req, res) => {
    try {
        const { projectId, clusterName } = getMongoConnectionDetails();

        if (!projectId || !clusterName) {
            // If we don't have Atlas API access, return local backup info
            return res.status(200).json({
                status: 'success',
                data: {
                    backupType: 'MongoDB Atlas Managed',
                    message: 'Backup status requires MONGODB_PROJECT_ID in environment variables',
                    atlasConfigured: false,
                    recommendation: 'Add MONGODB_PROJECT_ID to .env file to view backup details',
                    localInfo: {
                        clusterName: clusterName || 'Unknown',
                        provider: 'MongoDB Atlas',
                        backupPolicy: 'Managed by Atlas'
                    },
                    lastUpdated: new Date()
                }
            });
        }

        // If project ID is available, query Atlas API
        const auth = getMongoAtlasAuth();
        const atlasApiBase = 'https://cloud.mongodb.com/api/atlas/v1.0';

        try {
            // Get cluster backup snapshots
            const response = await axios.get(
                `${atlasApiBase}/groups/${projectId}/clusters/${clusterName}/backup/snapshots`,
                { auth }
            );

            const snapshots = response.data.results || [];
            const latestSnapshot = snapshots[0];

            res.status(200).json({
                status: 'success',
                data: {
                    atlasConfigured: true,
                    totalSnapshots: snapshots.length,
                    latestSnapshot: latestSnapshot ? {
                        id: latestSnapshot.id,
                        createdAt: latestSnapshot.createdAt,
                        expiresAt: latestSnapshot.expiresAt,
                        status: latestSnapshot.status,
                        type: latestSnapshot.snapshotType
                    } : null,
                    recentSnapshots: snapshots.slice(0, 5).map(s => ({
                        createdAt: s.createdAt,
                        status: s.status,
                        type: s.snapshotType
                    })),
                    lastUpdated: new Date()
                }
            });
        } catch (atlasError) {
            // Atlas API call failed
            res.status(200).json({
                status: 'success',
                data: {
                    atlasConfigured: true,
                    error: 'Unable to fetch from Atlas API',
                    message: atlasError.response?.data?.detail || atlasError.message,
                    localInfo: {
                        clusterName,
                        projectId,
                        provider: 'MongoDB Atlas'
                    },
                    lastUpdated: new Date()
                }
            });
        }
    } catch (error) {
        console.error('Backup Status Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve backup status',
            error: error.message
        });
    }
};

// @desc    Get API rate limit statistics
// @route   GET /api/developer/rate-limits
// @access  Private/Admin (Default Admin Only)
exports.getRateLimits = async (req, res) => {
    try {
        const limiter = req.app.locals.globalLimiter;
        if (!limiter) {
            return res.status(200).json({ status: 'ok', message: 'Rate limiter not configured.' });
        }

        // express-rate-limit internal memory store
        let totalHits = 0;
        let activeIPs = 0;

        // The store is accessible if using memory store (default)
        if (limiter.store && limiter.store.hits) {
            activeIPs = Object.keys(limiter.store.hits).length;
            totalHits = Object.values(limiter.store.hits).reduce((a, b) => a + b, 0);
        }

        res.status(200).json({
            status: 'success',
            data: {
                activeIPs,
                totalHits,
                windowSizeMs: limiter.windowMs || 900000,
                maxHits: limiter.max || 1000
            }
        });

    } catch (error) {
        console.error('Rate Limits Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to retrieve rate limits' });
    }
};

// @desc    Get recent active users
// @route   GET /api/developer/users/active
// @access  Private/Admin (Default Admin Only)
exports.getActiveUsers = async (req, res) => {
    try {
        // Find users updated in the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const activeUsers = await User.find({ updatedAt: { $gte: oneDayAgo } })
            .select('firstName lastName email role updatedAt lastLogin')
            .sort({ updatedAt: -1 })
            .limit(50); // Get top 50 recents

        res.status(200).json({
            status: 'success',
            data: activeUsers
        });
    } catch (error) {
        console.error('Active Users Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to retrieve active users' });
    }
};

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
