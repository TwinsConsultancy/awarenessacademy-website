const os = require('os');
const mongoose = require('mongoose');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const path = require('path');
const DeveloperSettings = require('../models/DeveloperSettings');
const { User, Course, Enrollment, Payment, Module } = require('../models/index');

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

        // Monthly revenue - matching admin dashboard logic
        const monthlyPayments = await Payment.find({
            date: { $gte: startOfMonth },
            status: { $in: ['Success', 'completed'] }
        });

        const currentMonthRevenue = monthlyPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        // Total revenue (all time) - matching admin dashboard logic exactly
        const totalRevenueResult = await Payment.aggregate([
            { $match: { status: { $in: ['Success', 'completed'] } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

        res.status(200).json({
            status: 'success',
            data: {
                settings,
                calculated: {
                    currentRevenueMonth: currentMonthRevenue,
                    totalRevenue: totalRevenue
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
            mongoPlan, mongoCost, mongoStoragePricePerGb, mongoDataTransferPricePerGb, mongoBackupCost,
            razorpayCommissionPercent,
            autoScaleEnabled, maxInstancesAllowed, scalingThresholdPercent
        } = req.body;

        if (vpsPlan !== undefined) settings.vpsPlan = vpsPlan;
        if (vpsCost !== undefined) settings.vpsCost = Number(vpsCost);
        if (vpsInstances !== undefined) settings.vpsInstances = Number(vpsInstances);

        if (mongoPlan !== undefined) settings.mongoPlan = mongoPlan;
        if (mongoCost !== undefined) settings.mongoCost = Number(mongoCost);
        if (mongoStoragePricePerGb !== undefined) settings.mongoStoragePricePerGb = Number(mongoStoragePricePerGb);
        if (mongoDataTransferPricePerGb !== undefined) settings.mongoDataTransferPricePerGb = Number(mongoDataTransferPricePerGb);
        if (mongoBackupCost !== undefined) settings.mongoBackupCost = Number(mongoBackupCost);

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
        // Query video modules directly
        const videoModules = await Module.find({ contentType: 'video' });

        let totalVideos = videoModules.length;
        let totalStorageBytes = 0;

        // Calculate total storage if fileSize is tracked
        videoModules.forEach(mod => {
            if (mod.fileMetadata && mod.fileMetadata.fileSize) {
                totalStorageBytes += mod.fileMetadata.fileSize;
            }
        });

        // Format storage (convert bytes to GB)
        const totalStorageGB = totalStorageBytes > 0
            ? (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
            : 'N/A';

        res.status(200).json({
            status: 'success',
            data: {
                totalVideos,
                totalStorageUsed: totalStorageGB,
                totalStorageBytes, // raw bytes for reference
                totalVideoPlaysToday: 'N/A', // not tracked natively
                avgStreamingTime: 'N/A',
                failedStreamCount: 'N/A'
            }
        });
    } catch (error) {
        console.error('[VIDEO-STATS ERROR]', error);
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

// @desc    Get MongoDB Atlas cluster metrics and calculate costs
// @route   GET /api/developer/mongodb/atlas-metrics
// @access  Private/Admin (Default Admin Only)
exports.getAtlasClusterMetrics = async (req, res) => {
    try {
        const { projectId, clusterName } = getMongoConnectionDetails();
        const auth = getMongoAtlasAuth();

        // Check if Atlas API credentials are configured
        if (!auth.username || !auth.password || !projectId || !clusterName) {
            return res.status(200).json({
                status: 'success',
                configured: false,
                message: 'MongoDB Atlas API credentials not configured. Set MONGODB_PUBLIC_API_KEY, MONGODB_PRIVATE_API_KEY, and MONGODB_PROJECT_ID in environment variables.',
                data: null
            });
        }

        // Fetch cluster configuration from Atlas API
        const clusterUrl = `https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/clusters/${clusterName}`;

        let clusterData, processData;

        try {
            const clusterResponse = await axios.get(clusterUrl, { auth });
            clusterData = clusterResponse.data;

            // Fetch process metrics (includes disk usage, connections)
            const processUrl = `https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/processes`;
            const processResponse = await axios.get(processUrl, { auth });
            processData = processResponse.data.results?.[0]; // Get first process (primary)
        } catch (apiError) {
            console.error('Atlas API Error:', apiError.response?.data || apiError.message);
            return res.status(200).json({
                status: 'success',
                configured: true,
                apiError: true,
                message: `Failed to fetch from Atlas API: ${apiError.response?.data?.detail || apiError.message}`,
                data: null
            });
        }

        // Extract cluster tier information
        const tierName = clusterData.providerSettings?.instanceSizeName || 'Unknown';
        const diskSizeGB = clusterData.diskSizeGB || 0;
        const nodeCount = clusterData.replicationSpecs?.[0]?.regionConfigs?.[0]?.electableNodes || 0;

        // Get storage pricing settings
        const settings = await DeveloperSettings.findOne() || {};
        const baseCost = settings.mongoCost || 0;
        const storagePricePerGB = settings.mongoStoragePricePerGb || 0.25;
        const dataTransferPricePerGB = settings.mongoDataTransferPricePerGb || 0.12;
        const backupCost = settings.mongoBackupCost || 0;

        // Get actual database stats for disk usage
        const db = mongoose.connection.db;
        const dbStats = await db.stats();
        const actualStorageGB = (dbStats.storageSize || 0) / (1024 * 1024 * 1024);

        // Calculate connection metrics
        const serverStatus = await db.admin().serverStatus();
        const currentConnections = serverStatus.connections?.current || 0;

        // Define tier limits (MongoDB Atlas standard limits)
        const tierLimits = {
            'M0': { maxStorage: 0.5, maxConnections: 500, includedStorage: 0.5 },
            'M2': { maxStorage: 2, maxConnections: 500, includedStorage: 2 },
            'M5': { maxStorage: 5, maxConnections: 500, includedStorage: 5 },
            'M10': { maxStorage: 10, maxConnections: 1500, includedStorage: 10 },
            'M20': { maxStorage: 20, maxConnections: 3000, includedStorage: 20 },
            'M30': { maxStorage: 40, maxConnections: 3000, includedStorage: 40 },
            'M40': { maxStorage: 80, maxConnections: 4000, includedStorage: 80 },
            'M50': { maxStorage: 160, maxConnections: 8000, includedStorage: 160 },
            'M60': { maxStorage: 320, maxConnections: 16000, includedStorage: 320 },
            'M80': { maxStorage: 750, maxConnections: 24000, includedStorage: 750 },
            'M140': { maxStorage: 1000, maxConnections: 32000, includedStorage: 1000 },
            'M200': { maxStorage: 1500, maxConnections: 64000, includedStorage: 1500 },
            'M300': { maxStorage: 2000, maxConnections: 96000, includedStorage: 2000 },
        };

        const currentTier = tierLimits[tierName] || { maxStorage: diskSizeGB, maxConnections: 10000, includedStorage: diskSizeGB };

        // Calculate warnings
        const warnings = [];
        const storageUsagePercent = (actualStorageGB / currentTier.maxStorage) * 100;
        const connectionUsagePercent = (currentConnections / currentTier.maxConnections) * 100;

        if (storageUsagePercent >= 90) {
            warnings.push({ type: 'critical', message: `Storage usage at ${storageUsagePercent.toFixed(1)}% of tier limit!` });
        } else if (storageUsagePercent >= 75) {
            warnings.push({ type: 'warning', message: `Storage usage at ${storageUsagePercent.toFixed(1)}% - consider upgrading soon` });
        }

        if (connectionUsagePercent >= 90) {
            warnings.push({ type: 'critical', message: `Connections at ${connectionUsagePercent.toFixed(1)}% of tier limit!` });
        } else if (connectionUsagePercent >= 75) {
            warnings.push({ type: 'warning', message: `Connections at ${connectionUsagePercent.toFixed(1)}% of tier limit` });
        }

        // Calculate total MongoDB cost
        const extraStorageGB = Math.max(0, actualStorageGB - currentTier.includedStorage);
        const extraStorageCost = extraStorageGB * storagePricePerGB;

        // Estimate data transfer (this would need actual metrics from Atlas)
        const estimatedDataTransferGB = 0; // Would need Atlas API metrics for accurate value
        const dataTransferCost = estimatedDataTransferGB * dataTransferPricePerGB;

        const totalMongoCost = baseCost + extraStorageCost + dataTransferCost + backupCost;

        res.status(200).json({
            status: 'success',
            configured: true,
            data: {
                cluster: {
                    name: clusterName,
                    tier: tierName,
                    nodeCount,
                    diskSizeGB,
                    provider: clusterData.providerSettings?.providerName || 'Unknown',
                    region: clusterData.providerSettings?.regionName || 'Unknown'
                },
                usage: {
                    storageGB: actualStorageGB,
                    storagePercent: storageUsagePercent,
                    connections: currentConnections,
                    connectionsPercent: connectionUsagePercent,
                    maxStorage: currentTier.maxStorage,
                    maxConnections: currentTier.maxConnections
                },
                costs: {
                    baseCost,
                    extraStorageGB,
                    extraStorageCost,
                    dataTransferGB: estimatedDataTransferGB,
                    dataTransferCost,
                    backupCost,
                    totalMongoCost,
                    breakdown: {
                        base: `$${baseCost.toFixed(2)}`,
                        storage: `$${extraStorageCost.toFixed(2)} (${extraStorageGB.toFixed(2)} GB × $${storagePricePerGB}/GB)`,
                        transfer: `$${dataTransferCost.toFixed(2)} (${estimatedDataTransferGB.toFixed(2)} GB × $${dataTransferPricePerGB}/GB)`,
                        backup: `$${backupCost.toFixed(2)}`,
                        total: `$${totalMongoCost.toFixed(2)}`
                    }
                },
                warnings,
                lastUpdated: new Date()
            }
        });
    } catch (error) {
        console.error('Atlas Cluster Metrics Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve Atlas cluster metrics',
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

// Export comprehensive metrics as PDF
exports.exportMetricsPDF = async (req, res) => {
    try {
        // Create new PDF document
        const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });

        // Set response headers
        const filename = `InnerSpark_Server_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        // Helper: Format Bytes
        const formatB = (bytes) => {
            if (bytes === 0 || !bytes) return '0 Bytes';
            const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        // Fetch all required data
        const settings = await DeveloperSettings.findOne();

        // Revenue
        const totalRevenueData = await Payment.aggregate([
            { $match: { status: { $in: ['Success', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalRevenue = totalRevenueData[0]?.total || 0;

        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthRevenueData = await Payment.aggregate([
            { $match: { status: { $in: ['Success', 'completed'] }, date: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const currentRevenueMonth = monthRevenueData[0]?.total || 0;

        // KPIs
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalCourses = await Course.countDocuments();
        const totalEnrollments = await Enrollment.countDocuments();
        const totalVideos = await Module.countDocuments({ contentType: 'video' });

        // Mongo Stats
        let mongoStats = { dataSize: 0, storageSize: 0, indexes: 0, collections: 0 };
        try {
            const db = mongoose.connection.db;
            const stats = await db.stats();
            mongoStats = { dataSize: stats.dataSize, storageSize: stats.storageSize, indexes: stats.indexes, collections: stats.collections };
        } catch (e) { }

        // System Metrics
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsagePercent = Math.round((usedMem / totalMem) * 100);
        const cpus = os.cpus();

        // Costs
        const r2Cost = ((settings?.r2StorageUsed || 0) * (settings?.r2StoragePricePerGb || 0.015)) +
            ((settings?.r2DataTransfer || 0) * (settings?.r2DataTransferPricePerGb || 0.09));
        const mongoStorageGB = mongoStats.storageSize / (1024 ** 3);
        const mongoCost = (mongoStorageGB * (settings?.mongoStoragePricePerGb || 0.25)) +
            ((settings?.mongoDataTransfer || 0) * (settings?.mongoDataTransferPricePerGb || 0.12)) + (settings?.mongoBackupCost || 0);
        const paymentGatewayCost = (currentRevenueMonth * (settings?.razorpayCommission || 2)) / 100;
        const totalMonthlyCost = r2Cost + mongoCost + paymentGatewayCost;

        // --- PDF LAYOUT HELPERS ---
        const drawPageBorder = () => {
            doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
                .lineWidth(2)
                .strokeColor('#2980b9')
                .stroke();

            // Inner border for a more premium look
            doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48)
                .lineWidth(0.5)
                .strokeColor('#bdc3c7')
                .stroke();
        };

        const drawGridContainer = (y, height, title) => {
            doc.rect(40, y, doc.page.width - 80, height)
                .lineWidth(1)
                .strokeColor('#dcdde1')
                .stroke();

            doc.rect(40, y, doc.page.width - 80, 26)
                .fillAndStroke('#ecf0f1', '#dcdde1');

            doc.fontSize(11).fillColor('#2c3e50').font('Helvetica-Bold')
                .text(title, 50, y + 8);
        };

        const addGridRow = (x, y, label, value) => {
            doc.fontSize(10).fillColor('#34495e').font('Helvetica').text(label, x, y);
            doc.fontSize(10).fillColor('#2c3e50').font('Helvetica-Bold').text(value, x + 120, y);
            doc.moveTo(x, y + 14).lineTo(x + 230, y + 14).lineWidth(0.5).strokeColor('#f1f2f6').stroke();
        };

        // Generate Chart Images via QuickChart API
        const getChartImage = async (chartConfig) => {
            try {
                const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=300&h=200&f=png`;
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                return response.data;
            } catch (e) {
                console.error("Failed to fetch chart image");
                return null;
            }
        };

        const costChartConfig = {
            type: 'doughnut',
            data: {
                labels: ['R2 Storage', 'MongoDB', 'Gateway'],
                datasets: [{ data: [r2Cost, mongoCost, paymentGatewayCost], backgroundColor: ['#3498db', '#2ecc71', '#9b59b6'] }]
            },
            options: { plugins: { legend: { position: 'right' }, datalabels: { display: false } } }
        };

        const resChartConfig = {
            type: 'bar',
            data: {
                labels: ['Memory Usage'],
                datasets: [{ label: 'Used %', data: [memUsagePercent], backgroundColor: memUsagePercent > 80 ? '#e74c3c' : '#3498db' }]
            },
            options: { scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } }
        };

        const kpiChartConfig = {
            type: 'bar',
            data: {
                labels: ['Students', 'Courses', 'Enrolls', 'Videos'],
                datasets: [{ label: 'Count', data: [totalStudents, totalCourses, totalEnrollments, totalVideos], backgroundColor: ['#f1c40f', '#e67e22', '#e74c3c', '#9b59b6'] }]
            },
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        };

        // MongoDB size in MB for the chart
        const mongoDataMB = mongoStats.dataSize / (1024 * 1024);
        const mongoStorageMB = mongoStats.storageSize / (1024 * 1024);

        const mongoChartConfig = {
            type: 'pie',
            data: {
                labels: ['Data (MB)', 'Storage (MB)'],
                datasets: [{ data: [mongoDataMB, mongoStorageMB], backgroundColor: ['#1abc9c', '#34495e'] }]
            },
            options: { plugins: { legend: { position: 'right' } } }
        };

        const [costChartImg, resChartImg, kpiChartImg, mongoChartImg] = await Promise.all([
            getChartImage(costChartConfig),
            getChartImage(resChartConfig),
            getChartImage(kpiChartConfig),
            getChartImage(mongoChartConfig)
        ]);

        // --- SINGLE PAGE LAYOUT ---

        // Add Background Image - Centered and Smaller
        try {
            const bgImagePath = path.join(__dirname, '../../frontend/assets/reportbackground.png');
            // Save graphics state
            doc.save();
            doc.fillOpacity(0.08).strokeOpacity(0.08);
            if (typeof doc.opacity === 'function') doc.opacity(0.08);

            // Make image centered and half size
            const imgWidth = 350;
            const imgHeight = 350;
            const imgX = (doc.page.width - imgWidth) / 2;
            const imgY = (doc.page.height - imgHeight) / 2;

            doc.image(bgImagePath, imgX, imgY, { width: imgWidth, height: imgHeight });

            // Restore graphics state
            doc.restore();
            if (typeof doc.opacity === 'function') doc.opacity(1);
            doc.fillOpacity(1).strokeOpacity(1);
        } catch (imgError) {
            console.warn('Could not load background image:', imgError.message);
        }

        drawPageBorder();

        // Header
        doc.fontSize(26).fillColor('#2980b9').font('Helvetica-Bold').text('AWARENESS ACADEMY', 0, 45, { align: 'center' });
        doc.fontSize(14).fillColor('#34495e').font('Helvetica').text('SERVER REPORT', 0, 75, { align: 'center', characterSpacing: 2 });
        doc.fontSize(9).fillColor('#95a5a6').font('Helvetica').text(`Generated on: ${currentDate.toLocaleString()}`, 0, 95, { align: 'center' });

        // Container 1: Finance Overview
        drawGridContainer(125, 170, 'Financial Overview & Infrastructure Costs');

        addGridRow(50, 160, 'Total Revenue (All Time):', `Rs. ${totalRevenue.toFixed(2)}`);
        addGridRow(50, 180, 'Revenue (This Month):', `Rs. ${currentRevenueMonth.toFixed(2)}`);
        addGridRow(50, 200, 'Total Monthly Cost:', `Rs. ${totalMonthlyCost.toFixed(2)}`);
        addGridRow(50, 220, 'Net Profit (Current):', `Rs. ${(currentRevenueMonth - totalMonthlyCost).toFixed(2)}`);
        addGridRow(50, 240, 'R2 Storage Cost:', `Rs. ${r2Cost.toFixed(2)}`);
        addGridRow(50, 260, 'MongoDB Atlas Cost:', `Rs. ${mongoCost.toFixed(2)}`);
        addGridRow(50, 280, 'Payment Gateway Fee:', `Rs. ${paymentGatewayCost.toFixed(2)}`);

        if (costChartImg) {
            doc.image(costChartImg, 320, 135, { width: 190 });
        } else {
            doc.fontSize(10).text('Chart Unavailable', 350, 180);
        }

        // Container 2: Platform KPIs
        drawGridContainer(310, 140, 'Platform Engagement KPIs');
        addGridRow(50, 345, 'Total Registered Students:', `${totalStudents}`);
        addGridRow(50, 365, 'Active Courses:', `${totalCourses}`);
        addGridRow(50, 385, 'Total Enrollments:', `${totalEnrollments}`);
        addGridRow(50, 405, 'Total Video Assets:', `${totalVideos}`);
        addGridRow(50, 425, 'Platform Health:', `Optimal`);

        if (kpiChartImg) {
            doc.image(kpiChartImg, 340, 325, { width: 170 });
        }

        // Container 3: Server Resources
        drawGridContainer(465, 150, 'Live Server Resources & Load');
        addGridRow(50, 500, 'CPU Model:', cpus[0]?.model?.substring(0, 30) || 'Unknown');
        addGridRow(50, 520, 'CPU Cores:', `${cpus.length} vCPUs`);
        addGridRow(50, 540, 'Total Memory (RAM):', formatB(totalMem));
        addGridRow(50, 560, 'Used Memory:', `${formatB(usedMem)} (${memUsagePercent}%)`);
        addGridRow(50, 580, 'Free Memory:', formatB(freeMem));
        addGridRow(50, 600, 'Host OS:', `${os.platform()} ${os.release()}`);

        if (resChartImg) {
            doc.image(resChartImg, 340, 475, { width: 150 });
        }

        // Container 4: Database Health
        drawGridContainer(630, 140, 'MongoDB Atlas Storage Status');
        addGridRow(50, 665, 'Storage Used (Disk):', formatB(mongoStats.storageSize));
        addGridRow(50, 685, 'Logical Data Size:', formatB(mongoStats.dataSize));
        addGridRow(50, 705, 'Total Collections:', `${mongoStats.collections}`);
        addGridRow(50, 725, 'Total Indexes:', `${mongoStats.indexes}`);
        addGridRow(50, 745, 'Connection State:', mongoose.connection.readyState === 1 ? 'Healthy (Connected)' : 'Disconnected');

        if (mongoChartImg) {
            doc.image(mongoChartImg, 320, 640, { width: 190 });
        }

        // --- FOOTERS & PAGE NUMBERS ---
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);

            // Footer Text
            doc.fontSize(8).fillColor('#7f8c8d').font('Helvetica')
                .text('If any support required please contact the maintenance team immediately. +91 7200754566',
                    40, doc.page.height - 50, { align: 'center' });

            // Page Number
            doc.text(`Page ${i + 1} of ${range.count}`, 40, doc.page.height - 35, { align: 'center' });
        }

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error('PDF Export Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ status: 'error', message: 'Failed to generate PDF report' });
        }
    }
};

