// developer.js - Logic for Developer Control Center
let lineChart;
let evtSource;
let isDevReconnecting = false;

// Settings data
let devSettings = {};
let currentRevenue = 0;

document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    const authData = Auth.checkAuth(['Admin']);
    if (!authData || !authData.user || authData.user.isDefaultAdmin !== true) {
        if (typeof UI !== 'undefined' && UI.createPopup) {
            UI.createPopup({
                title: 'Access Denied',
                message: 'This area is restricted to the Default Administrator only.',
                type: 'error',
                onConfirm: () => window.location.href = 'admin-dashboard.html'
            });
        } else {
            alert('Access Denied. Only the Default Administrator can view this page.');
            window.location.href = 'admin-dashboard.html';
        }
        return;
    }

    initSidebarNavigation();
    initChart();
    initHistoryChart();
    await loadSettingsAndCostMap();
    initLiveStream();
    loadVideoStats();
    loadMongoMetrics();
    loadHistoricalData();
    fetchRateLimits();
    fetchActiveUsers();

    // Auto refresh rate limits and active users
    setInterval(fetchRateLimits, 30000); // 30s
    setInterval(fetchActiveUsers, 30000); // 30s

    // Add event listeners for cost inputs to auto-calculate totals
    document.querySelectorAll('.dev-input').forEach(input => {
        input.addEventListener('input', calculateCostSummaries);
    });
});

function initSidebarNavigation() {
    const links = document.querySelectorAll('.dev-nav-link');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            // e.preventDefault();
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

function initChart() {
    const ctx = document.getElementById('liveResChart');
    if (!ctx) return;

    lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'CPU Usage %',
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    data: [],
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'RAM Usage %',
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    data: [],
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: '#334155' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { labels: { color: '#f8fafc' } }
            },
            animation: { duration: 0 } // no animation on live data push for better peformance
        }
    });
}

function updateChart(cpuPct, ramPct) {
    if (!lineChart) return;

    const now = new Date();
    const timeLabel = now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0') + ':' +
        now.getSeconds().toString().padStart(2, '0');

    lineChart.data.labels.push(timeLabel);
    lineChart.data.datasets[0].data.push(cpuPct);
    lineChart.data.datasets[1].data.push(ramPct);

    // Keep only last 20 data points live
    if (lineChart.data.labels.length > 20) {
        lineChart.data.labels.shift();
        lineChart.data.datasets[0].data.shift();
        lineChart.data.datasets[1].data.shift();
    }

    lineChart.update();
}

let historyChart;
function initHistoryChart() {
    const ctx = document.getElementById('historyChart');
    if (!ctx) return;

    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Past CPU Avg %',
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    data: [],
                    tension: 0.1,
                    fill: true,
                    borderWidth: 1,
                    pointRadius: 0
                },
                {
                    label: 'Past RAM Avg %',
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.05)',
                    data: [],
                    tension: 0.1,
                    fill: true,
                    borderWidth: 1,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: '#1e293b' } },
                x: {
                    grid: { display: false },
                    ticks: { maxTicksLimit: 10 }
                }
            },
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            }
        }
    });
}

async function loadHistoricalData() {
    try {
        const res = await fetch(`${Auth.apiBase}/developer/metrics/history`, {
            headers: Auth.getHeaders()
        });
        if (res.ok) {
            const json = await res.json();
            const data = json.data;
            if (!historyChart || data.length === 0) return;

            const labels = [];
            const cpuData = [];
            const ramData = [];

            data.forEach(pt => {
                const date = new Date(pt.timestamp);
                labels.push(`${date.getHours()}:${date.getMinutes()}`);
                cpuData.push(pt.cpuUsagePct);
                ramData.push(pt.ramUsagePct);
            });

            historyChart.data.labels = labels;
            historyChart.data.datasets[0].data = cpuData;
            historyChart.data.datasets[1].data = ramData;
            historyChart.update();
        }
    } catch (e) {
        console.warn('Could not load historical data', e);
    }
}

async function fetchRateLimits() {
    try {
        const res = await fetch(`${Auth.apiBase}/developer/rate-limits`, {
            headers: Auth.getHeaders()
        });
        if (res.ok) {
            const json = await res.json();
            const d = json.data;
            document.getElementById('rateActiveIPs').textContent = d.activeIPs;
            document.getElementById('rateTotalHits').textContent = d.totalHits;
            document.getElementById('rateMaxHits').textContent = d.maxHits + ' / 15m window';
        }
    } catch (e) {
        console.warn('Could not load rate limit stat', e);
    }
}

async function fetchActiveUsers() {
    try {
        const res = await fetch(`${Auth.apiBase}/developer/users/active`, {
            headers: Auth.getHeaders()
        });
        if (res.ok) {
            const json = await res.json();
            const data = json.data;
            const tbody = document.getElementById('activeUsersTable');
            if (!tbody) return;

            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="padding: 15px; text-align: center; color: var(--dev-text-muted);">No active users in the last 24 hours.</td></tr>`;
                return;
            }

            let html = '';
            data.forEach(user => {
                const date = new Date(user.updatedAt || user.lastLogin);
                const roleBadge = user.role === 'Admin' ? `<span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">Admin</span>` :
                    (user.role === 'Staff' ? `<span style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">Staff</span>` :
                        `<span style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">Student</span>`);

                html += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;">
                        <td style="padding: 12px; font-weight: 500;">${user.firstName} ${user.lastName}</td>
                        <td style="padding: 12px; opacity: 0.8; font-family: monospace;">${user.email}</td>
                        <td style="padding: 12px;">${roleBadge}</td>
                        <td style="padding: 12px; opacity: 0.8;">${date.toLocaleString()}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }
    } catch (e) {
        console.warn('Could not load active users', e);
    }
}

async function loadSettingsAndCostMap() {
    try {
        const res = await fetch(`${Auth.apiBase}/developer/settings`, {
            headers: Auth.getHeaders()
        });

        if (res.ok) {
            const json = await res.json();
            devSettings = json.data.settings;
            currentRevenue = json.data.calculated.currentRevenueMonth;

            // Populate forms
            document.getElementById('vpsPlan').value = devSettings.vpsPlan || '';
            document.getElementById('vpsCost').value = devSettings.vpsCost || 0;
            document.getElementById('vpsInstances').value = devSettings.vpsInstances || 1;

            document.getElementById('mongoPlan').value = devSettings.mongoPlan || '';
            document.getElementById('mongoCost').value = devSettings.mongoCost || 0;

            document.getElementById('rzpPercent').value = devSettings.razorpayCommissionPercent || 2.0;

            // Scaling logic
            document.getElementById('autoScaleToggle').checked = devSettings.autoScaleEnabled;
            document.getElementById('scaleThreshold').value = devSettings.scalingThresholdPercent || 80;
            document.getElementById('maxInstances').value = devSettings.maxInstancesAllowed || 3;

            calculateCostSummaries();
        }
    } catch (e) {
        console.error('Error loading dev settings', e);
    }
}

function calculateCostSummaries() {
    const vCost = parseFloat(document.getElementById('vpsCost').value) || 0;
    const vInst = parseInt(document.getElementById('vpsInstances').value) || 1;
    const mCost = parseFloat(document.getElementById('mongoCost').value) || 0;
    const rPct = parseFloat(document.getElementById('rzpPercent').value) || 0;

    const vTotal = vCost * vInst;
    const estCommission = currentRevenue * (rPct / 100);
    const r2Cost = 0; // Using 0 until detailed mapping exists
    const totalInfra = vTotal + mCost + r2Cost;
    const netProfit = currentRevenue - totalInfra - estCommission;

    // Update individual card totals
    document.getElementById('calcVpsTotal').textContent = vTotal.toFixed(2);
    document.getElementById('calcMongoTotal').textContent = mCost.toFixed(2);
    document.getElementById('calcRzpTotal').textContent = estCommission.toFixed(2);
    document.getElementById('calcR2Total').textContent = r2Cost.toFixed(2);

    // Update Summary Panel
    document.getElementById('sumInfraCost').textContent = '$' + totalInfra.toFixed(2);
    document.getElementById('sumRevenue').textContent = '₹' + currentRevenue.toFixed(2); // assuming revenue is INR typically, but UI mixes $ and generic
    document.getElementById('sumCommission').textContent = '$' + estCommission.toFixed(2);

    const profitEl = document.getElementById('sumProfit');
    profitEl.textContent = '₹' + netProfit.toFixed(2);
    profitEl.className = netProfit >= 0 ? 'text-success' : 'text-error';
}

async function saveSettings() {
    try {
        const payload = {
            vpsPlan: document.getElementById('vpsPlan').value,
            vpsCost: document.getElementById('vpsCost').value,
            vpsInstances: document.getElementById('vpsInstances').value,
            mongoPlan: document.getElementById('mongoPlan').value,
            mongoCost: document.getElementById('mongoCost').value,
            razorpayCommissionPercent: document.getElementById('rzpPercent').value,
            autoScaleEnabled: document.getElementById('autoScaleToggle').checked,
            scalingThresholdPercent: document.getElementById('scaleThreshold').value,
            maxInstancesAllowed: document.getElementById('maxInstances').value
        };

        const res = await fetch(`${Auth.apiBase}/developer/settings`, {
            method: 'POST',
            headers: Auth.getHeaders(),
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('Settings saved successfully!');
            await loadSettingsAndCostMap(); // reload latest
        } else {
            alert('Failed to save settings');
        }
    } catch (e) {
        console.error(e);
        alert('Error saving settings');
    }
}

function initLiveStream() {
    // Instead of long-polling fetch, we use our new WebSocket connection
    startWebSocket();
}

function startWebSocket() {
    const connectionStatus = document.getElementById('devConnectionStatus');
    connectionStatus.className = 'status-bar status-connected';
    connectionStatus.innerHTML = '<i class="fas fa-check-circle"></i> Connecting to Live Data WebSocket...';

    // Build ws url based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use the apiBase host or default to current window host
    let host = window.location.host;
    if (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) {
        const urlObj = new URL(CONFIG.API_BASE_URL);
        host = urlObj.host;
    }
    const wsUrl = `${protocol}//${host}/api/developer/metrics/ws`;

    // Connect to WS
    evtSource = new WebSocket(wsUrl);

    evtSource.onopen = () => {
        connectionStatus.className = 'status-bar status-connected';
        connectionStatus.innerHTML = '<i class="fas fa-check-circle"></i> Connected to Live Data Stream';
        setTimeout(() => {
            connectionStatus.style.transform = 'translateY(-100%)';
        }, 3000);
    };

    evtSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            processLiveData(data);
            checkAlertThresholds(data.system);
        } catch (e) {
            console.error('WS Data Parse Error:', e);
        }
    };

    evtSource.onerror = (error) => {
        console.error('WS Error:', error);
    };

    evtSource.onclose = () => {
        connectionStatus.style.transform = 'translateY(0)';
        connectionStatus.className = 'status-bar status-error';
        connectionStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Connection Lost. Reconnecting...';

        // Ensure we trigger the background broadcaster via standard REST endpoint as a fallback activator
        fetch(`${Auth.apiBase}/developer/metrics/stream`, { headers: Auth.getHeaders() }).catch(() => { });

        setTimeout(startWebSocket, 5000);
    };
}

// Simple Toast Alert logic
function showDevAlert(title, message, isCritical = false) {
    let container = document.getElementById('devToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'devToastContainer';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.background = isCritical ? 'rgba(239, 68, 68, 0.95)' : 'rgba(245, 158, 11, 0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '15px 20px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.5)';
    toast.style.minWidth = '300px';
    toast.style.borderLeft = `4px solid ${isCritical ? '#991b1b' : '#b45309'}`;
    toast.style.animation = 'slideInRight 0.3s ease forwards';

    toast.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
            <strong style="font-size: 1.1rem;"><i class="fas ${isCritical ? 'fa-exclamation-triangle' : 'fa-bell'}"></i> ${title}</strong>
            <button onclick="this.parentElement.parentElement.remove()" style="background:none; border:none; color:white; cursor:pointer;"><i class="fas fa-times"></i></button>
        </div>
        <p style="margin: 0; font-size: 0.95rem; opacity: 0.9;">${message}</p>
    `;

    container.appendChild(toast);

    // Auto remove after 8 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 8000);
}

// Global state to prevent spamming alerts
let lastAlertTime = {};

function checkAlertThresholds(sys) {
    const now = Date.now();
    const alertCooldown = 30000; // 30 seconds

    if (sys.cpuUsagePct > 90 && (!lastAlertTime['cpu'] || now - lastAlertTime['cpu'] > alertCooldown)) {
        showDevAlert('CRITICAL Load: CPU Overload', `Server CPU usage has reached ${sys.cpuUsagePct}%! Immediate attention required.`, true);
        lastAlertTime['cpu'] = now;
    }

    if (sys.ramUsagePct > 90 && (!lastAlertTime['ram'] || now - lastAlertTime['ram'] > alertCooldown)) {
        showDevAlert('CRITICAL Load: RAM Exhaustion', `Server RAM usage is critically high at ${sys.ramUsagePct}%.`, true);
        lastAlertTime['ram'] = now;
    }

    if (sys.dbStatus === 'Disconnected' && (!lastAlertTime['db'] || now - lastAlertTime['db'] > alertCooldown)) {
        showDevAlert('CRITICAL OUTAGE: Database Offline', `The MongoDB cluster has disconnected. Application is degraded.`, true);
        lastAlertTime['db'] = now;
    }
}

function processLiveData(data) {
    if (!data || !data.system) return;
    const sys = data.system;

    // Last Updated
    document.getElementById('lastUpdatedTime').textContent = new Date().toLocaleTimeString();

    // Section 1: Are We Safe
    document.getElementById('valUptime').textContent = sys.uptimeStr;
    document.getElementById('valDbStatus').textContent = sys.dbStatus;

    const dotSafe = document.getElementById('dotSafe');
    const ansSafe = document.getElementById('ansSafe');
    if (sys.dbStatus === 'Connected') {
        dotSafe.className = 'status-dot status-success';
        ansSafe.textContent = 'Operational';
        ansSafe.style.color = 'var(--dev-success)';
    } else {
        dotSafe.className = 'status-dot status-danger';
        ansSafe.textContent = 'DB Offline';
        ansSafe.style.color = 'var(--dev-danger)';
    }

    // Section 1: Are We Overloaded
    document.getElementById('valCpuHealth').textContent = sys.cpuUsagePct + '%';
    document.getElementById('valRamHealth').textContent = sys.ramUsagePct + '%';
    document.getElementById('valActiveUsers').textContent = sys.activeUsers;

    const dotLoad = document.getElementById('dotLoad');
    const ansLoad = document.getElementById('ansLoad');
    if (sys.cpuUsagePct < 60) {
        dotLoad.className = 'status-dot status-success';
        ansLoad.textContent = 'Stable Load';
        ansLoad.style.color = 'var(--dev-success)';
    } else if (sys.cpuUsagePct < 85) {
        dotLoad.className = 'status-dot status-warning';
        ansLoad.textContent = 'Moderate Load';
        ansLoad.style.color = 'var(--dev-warning)';
    } else {
        dotLoad.className = 'status-dot status-danger';
        ansLoad.textContent = 'High Load';
        ansLoad.style.color = 'var(--dev-danger)';
    }

    // Section 1: Money / Profit indicator setup
    const rPct = parseFloat(document.getElementById('rzpPercent').value) || 2;
    const vCost = parseFloat(document.getElementById('vpsCost').value) || 0;
    const vInst = parseInt(document.getElementById('vpsInstances').value) || 1;
    const mCost = parseFloat(document.getElementById('mongoCost').value) || 0;
    const estCommission = currentRevenue * (rPct / 100);
    const totalInfra = (vCost * vInst) + mCost;
    const netProfit = currentRevenue - totalInfra - estCommission;

    document.getElementById('valTotalCost').textContent = '$' + totalInfra.toFixed(2);
    document.getElementById('valCurrentRev').textContent = '₹' + currentRevenue.toFixed(2);

    const valNetProfit = document.getElementById('valNetProfit');
    valNetProfit.textContent = (netProfit >= 0 ? '+' : '-') + '₹' + Math.abs(netProfit).toFixed(2);
    valNetProfit.className = netProfit >= 0 ? 'text-success' : 'text-error';

    const dotMoney = document.getElementById('dotMoney');
    const ansMoney = document.getElementById('ansMoney');
    if (netProfit > 0) {
        dotMoney.className = 'status-dot status-success';
        ansMoney.textContent = 'Profitable';
        ansMoney.style.color = 'var(--dev-success)';
    } else {
        dotMoney.className = 'status-dot status-warning';
        ansMoney.textContent = 'At Risk / Loss';
        ansMoney.style.color = 'var(--dev-warning)';
    }

    if (sys.activeUsers > 0) {
        document.getElementById('sumCpuUser').textContent = '$' + (totalInfra / sys.activeUsers).toFixed(4);
    }

    // Scaling Section
    document.getElementById('valCurrentInstances').textContent = sys.instances + ' / ' + sys.maxInstances;
    const scaleAlert = document.getElementById('scaleActionIndicator');
    if (sys.isThresholdExceeded && sys.autoScale) {
        scaleAlert.style.display = 'block';
    } else {
        scaleAlert.style.display = 'none';
    }

    // Live Metrics Grids
    document.getElementById('mCpu').textContent = sys.cpuUsagePct + '%';
    document.getElementById('mCpuFill').style.width = sys.cpuUsagePct + '%';
    document.getElementById('mCpuFill').style.background = getUsageColor(sys.cpuUsagePct);

    document.getElementById('mRam').textContent = sys.ramUsagePct + '%';
    document.getElementById('mRamFill').style.width = sys.ramUsagePct + '%';
    document.getElementById('mRamFill').style.background = getUsageColor(sys.ramUsagePct);

    document.getElementById('mRamUsed').textContent = sys.usedMemGb;
    document.getElementById('mRamTotal').textContent = sys.totalMemGb;
    document.getElementById('mDbConn').textContent = sys.dbStatus;

    // Check chart
    updateChart(sys.cpuUsagePct, sys.ramUsagePct);

    // Network
    document.getElementById('valRpm').textContent = sys.rpm;
}

function getUsageColor(pct) {
    if (pct < 60) return 'var(--dev-primary)';
    if (pct < 85) return 'var(--dev-warning)';
    return 'var(--dev-danger)';
}

async function loadVideoStats() {
    try {
        const res = await fetch(`${Auth.apiBase}/developer/video-stats`, {
            headers: Auth.getHeaders()
        });
        if (res.ok) {
            const json = await res.json();
            document.getElementById('kpiTotalVideos').textContent = json.data.totalVideos;
            document.getElementById('kpiStorage').textContent = json.data.totalStorageUsed;
            document.getElementById('kpiAvgStream').textContent = json.data.avgStreamingTime;
            document.getElementById('kpiFailedStream').textContent = json.data.failedStreamCount;
        }
    } catch (e) {
        console.warn('Could not load static video stats', e);
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

// MongoDB Metrics Functions
let mongoMetricsInterval = null;

async function loadMongoMetrics() {
    await Promise.all([
        loadMongoDBStats(),
        loadConnectionPool(),
        loadQueryPerformance(),
        loadBackupStatus()
    ]);

    // Start auto-refresh if not already running
    if (!mongoMetricsInterval) {
        mongoMetricsInterval = setInterval(loadMongoMetrics, 15000); // every 15 seconds
    }
}

async function refreshMongoMetrics() {
    const btn = event.target.closest('button');
    const icon = btn.querySelector('i');
    icon.classList.add('fa-spin');

    await loadMongoMetrics();

    setTimeout(() => {
        icon.classList.remove('fa-spin');
    }, 500);
}

async function loadMongoDBStats() {
    try {
        const res = await fetch(`${Auth.apiBase}/developer/mongodb/stats`, {
            headers: Auth.getHeaders()
        });

        if (res.ok) {
            const json = await res.json();
            const data = json.data;

            document.getElementById('mongoDbName').textContent = data.database;
            document.getElementById('mongoCollections').textContent = data.totalCollections.toLocaleString();
            document.getElementById('mongoDocuments').textContent = data.totalDocuments.toLocaleString();
            document.getElementById('mongoDataSize').textContent = data.dataSize;
            document.getElementById('mongoIndexSize').textContent = data.indexSize;
            document.getElementById('mongoStorageSize').textContent = data.storageSize;
        } else {
            console.error('Failed to load MongoDB stats');
            setMongoError('Storage stats unavailable');
        }
    } catch (error) {
        console.error('Error loading MongoDB stats:', error);
        setMongoError('Storage stats unavailable');
    }
}

async function loadConnectionPool() {
    try {
        const res = await fetch(`${Auth.apiBase}/developer/mongodb/connections`, {
            headers: Auth.getHeaders()
        });

        if (res.ok) {
            const json = await res.json();
            const data = json.data;

            const stateEl = document.getElementById('mongoConnState');
            stateEl.textContent = data.state;
            stateEl.style.color = data.state === 'Connected' ? 'var(--dev-success)' : 'var(--dev-danger)';

            document.getElementById('mongoPoolSize').textContent = data.poolSize;
            document.getElementById('mongoCurrent').textContent = data.current;
            document.getElementById('mongoAvailable').textContent = data.available;
            document.getElementById('mongoNetIn').textContent = data.networkBytes.received;
            document.getElementById('mongoNetOut').textContent = data.networkBytes.sent;
        } else {
            console.error('Failed to load connection pool metrics');
        }
    } catch (error) {
        console.error('Error loading connection pool:', error);
    }
}

async function loadQueryPerformance() {
    try {
        const res = await fetch(`${Auth.apiBase}/developer/mongodb/performance`, {
            headers: Auth.getHeaders()
        });

        if (res.ok) {
            const json = await res.json();
            const data = json.data;
            const opcounters = data.opcounters || {}; // Ensure opcounters is defined

            document.getElementById('mongoActiveQueries').textContent = data.activeQueries.length;
            document.getElementById('mongoAvgQueryTime').textContent = data.avgQueryTime + 'ms';
            document.getElementById('mongoInserts').textContent = opcounters.insert ? opcounters.insert.toLocaleString() : '0';
            document.getElementById('mongoQueries').textContent = opcounters.query ? opcounters.query.toLocaleString() : '0';
            document.getElementById('mongoUpdates').textContent = opcounters.update ? opcounters.update.toLocaleString() : '0';
            document.getElementById('mongoDeletes').textContent = opcounters.delete ? opcounters.delete.toLocaleString() : '0';
            document.getElementById('mongoGets').textContent = opcounters.getmore ? opcounters.getmore.toLocaleString() : '0';
            document.getElementById('mongoCommands').textContent = opcounters.command ? opcounters.command.toLocaleString() : '0';

            // Optional: Map slow queries if we have them
            const tbody = document.getElementById('mongoSlowQueryTable');
            if (tbody) {
                if (data.slowQueries && data.slowQueries.length > 0) {
                    let html = '';
                    data.slowQueries.forEach(q => {
                        const date = new Date(q.timestamp).toLocaleTimeString();
                        html += `
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid var(--dev-border);">${date}</td>
                                <td style="padding: 10px; border-bottom: 1px solid var(--dev-border); font-family: monospace;">${q.namespace || 'N/A'}</td>
                                <td style="padding: 10px; border-bottom: 1px solid var(--dev-border);">${q.operation || 'N/A'}</td>
                                <td style="padding: 10px; border-bottom: 1px solid var(--dev-border); color: var(--dev-warning);">${q.duration || 0}ms</td>
                                <td style="padding: 10px; border-bottom: 1px solid var(--dev-border); font-family: monospace; font-size: 0.75rem;">${q.query || 'N/A'}</td>
                            </tr>
                        `;
                    });
                    tbody.innerHTML = html;
                } else {
                    tbody.innerHTML = `<tr><td colspan="5" style="padding: 10px; text-align: center; color: var(--dev-text-muted);">No slow queries detected recently.</td></tr>`;
                }
            }
        } else {
            console.error('Failed to load query performance');
            document.getElementById('mongoActiveQueries').textContent = 'N/A';
            document.getElementById('mongoAvgQueryTime').textContent = 'N/A';
            document.getElementById('mongoInserts').textContent = 'N/A';
            document.getElementById('mongoQueries').textContent = 'N/A';
            document.getElementById('mongoUpdates').textContent = 'N/A';
            document.getElementById('mongoDeletes').textContent = 'N/A';
            document.getElementById('mongoGets').textContent = 'N/A';
            document.getElementById('mongoCommands').textContent = 'N/A';
            const tbody = document.getElementById('mongoSlowQueryTable');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" style="padding: 10px; text-align: center; color: var(--dev-danger);">Failed to load slow queries.</td></tr>`;
            }
        }
    } catch (error) {
        console.error('Error loading query performance:', error);
        document.getElementById('mongoActiveQueries').textContent = 'N/A';
        document.getElementById('mongoAvgQueryTime').textContent = 'N/A';
        document.getElementById('mongoInserts').textContent = 'N/A';
        document.getElementById('mongoQueries').textContent = 'N/A';
        document.getElementById('mongoUpdates').textContent = 'N/A';
        document.getElementById('mongoDeletes').textContent = 'N/A';
        document.getElementById('mongoGets').textContent = 'N/A';
        document.getElementById('mongoCommands').textContent = 'N/A';
        const tbody = document.getElementById('mongoSlowQueryTable');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 10px; text-align: center; color: var(--dev-danger);">Error loading slow queries: ${error.message}</td></tr>`;
        }
    }
}

async function loadBackupStatus() {
    try {
        const res = await fetch(`${Auth.apiBase}/developer/mongodb/backups`, {
            headers: Auth.getHeaders()
        });

        if (res.ok) {
            const json = await res.json();
            const data = json.data;
            const container = document.getElementById('backupStatus');

            if (data.atlasConfigured === false) {
                container.innerHTML = `
                    <div style="padding: 1rem; background: rgba(245, 158, 11, 0.1); border-left: 4px solid var(--dev-warning); border-radius: 8px;">
                        <h4 style="color: var(--dev-warning); margin: 0 0 0.5rem 0;">
                            <i class="fas fa-info-circle"></i> Configuration Required
                        </h4>
                        <p style="margin: 0.5rem 0; color: var(--dev-text);">
                            ${data.message || 'MongoDB Atlas API not configured'}
                        </p>
                        <p style="margin: 0.5rem 0; color: var(--dev-text-muted); font-size: 0.9rem;">
                            ${data.recommendation || 'Add MONGODB_PROJECT_ID to your .env file'}
                        </p>
                        ${data.localInfo ? `
                            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--dev-card-border);">
                                <p style="margin: 0.25rem 0; color: var(--dev-text-muted); font-size: 0.85rem;">
                                    <strong>Cluster:</strong> ${data.localInfo.clusterName || 'Unknown'}
                                </p>
                                <p style="margin: 0.25rem 0; color: var(--dev-text-muted); font-size: 0.85rem;">
                                    <strong>Provider:</strong> ${data.localInfo.provider}
                                </p>
                                <p style="margin: 0.25rem 0; color: var(--dev-text-muted); font-size: 0.85rem;">
                                    <strong>Backup Policy:</strong> ${data.localInfo.backupPolicy}
                                </p>
                            </div>
                        ` : ''}
                    </div>
                `;
            } else if (data.error) {
                container.innerHTML = `
                    <div style="padding: 1rem; background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--dev-danger); border-radius: 8px;">
                        <h4 style="color: var(--dev-danger); margin: 0 0 0.5rem 0;">
                            <i class="fas fa-exclamation-triangle"></i> Atlas API Error
                        </h4>
                        <p style="margin: 0.5rem 0; color: var(--dev-text);">${data.message}</p>
                        ${data.localInfo ? `
                            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--dev-card-border);">
                                <p style="margin: 0.25rem 0; color: var(--dev-text-muted); font-size: 0.85rem;">
                                    <strong>Cluster:</strong> ${data.localInfo.clusterName}
                                </p>
                                <p style="margin: 0.25rem 0; color: var(--dev-text-muted); font-size: 0.85rem;">
                                    <strong>Project ID:</strong> ${data.localInfo.projectId}
                                </p>
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                const latestSnapshot = data.latestSnapshot;
                container.innerHTML = `
                    <div style="padding: 1rem; background: rgba(16, 185, 129, 0.1); border-left: 4px solid var(--dev-success); border-radius: 8px;">
                        <h4 style="color: var(--dev-success); margin: 0 0 0.5rem 0;">
                            <i class="fas fa-check-circle"></i> Backups Active
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                            <div>
                                <p style="margin: 0; color: var(--dev-text-muted); font-size: 0.85rem;">Total Snapshots</p>
                                <p style="margin: 0.25rem 0; color: var(--dev-text); font-size: 1.25rem; font-weight: 600;">
                                    ${data.totalSnapshots}
                                </p>
                            </div>
                            ${latestSnapshot ? `
                                <div>
                                    <p style="margin: 0; color: var(--dev-text-muted); font-size: 0.85rem;">Latest Backup</p>
                                    <p style="margin: 0.25rem 0; color: var(--dev-text); font-size: 0.9rem; font-weight: 600;">
                                        ${new Date(latestSnapshot.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p style="margin: 0; color: var(--dev-text-muted); font-size: 0.85rem;">Status</p>
                                    <p style="margin: 0.25rem 0; color: var(--dev-success); font-size: 0.9rem; font-weight: 600;">
                                        ${latestSnapshot.status}
                                    </p>
                                </div>
                                <div>
                                    <p style="margin: 0; color: var(--dev-text-muted); font-size: 0.85rem;">Type</p>
                                    <p style="margin: 0.25rem 0; color: var(--dev-text); font-size: 0.9rem; font-weight: 600;">
                                        ${latestSnapshot.type}
                                    </p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
        } else {
            console.error('Failed to load backup status');
            document.getElementById('backupStatus').innerHTML = `
                <p style="color: var(--dev-danger);">Unable to load backup status</p>
            `;
        }
    } catch (error) {
        console.error('Error loading backup status:', error);
        document.getElementById('backupStatus').innerHTML = `
            <p style="color: var(--dev-danger);">Error loading backup status: ${error.message}</p>
        `;
    }
}

function setMongoError(message) {
    ['mongoDbName', 'mongoCollections', 'mongoDocuments',
        'mongoDataSize', 'mongoIndexSize', 'mongoStorageSize'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'N/A';
        });
}

// Export Functionality
function exportMetricsJSON() {
    const activeDashboardData = {
        timestamp: new Date().toISOString(),
        cpuUsage: document.getElementById('valCpuHealth')?.textContent,
        ramUsage: document.getElementById('valRamHealth')?.textContent,
        activeUsers: document.getElementById('valActiveUsers')?.textContent,
        avgRpm: document.getElementById('valRpm')?.textContent,
        databaseStatus: document.getElementById('valDbStatus')?.textContent,
        totalCost: document.getElementById('valTotalCost')?.textContent,
        currentRev: document.getElementById('valCurrentRev')?.textContent,
        netProfit: document.getElementById('valNetProfit')?.textContent,
        rateLimits: {
            activeIPs: document.getElementById('rateActiveIPs')?.textContent,
            totalHits: document.getElementById('rateTotalHits')?.textContent,
        }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeDashboardData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `dev-dashboard-metrics-${Date.now()}.json`);
    dlAnchorElem.click();
}

function exportMetricsCSV() {
    const csvContent = [];
    csvContent.push("Metric,Value");

    const fields = [
        ["CPU Usage", document.getElementById('valCpuHealth')?.textContent],
        ["RAM Usage", document.getElementById('valRamHealth')?.textContent],
        ["Active Users", document.getElementById('valActiveUsers')?.textContent],
        ["Estimated RPM", document.getElementById('valRpm')?.textContent],
        ["Database Status", document.getElementById('valDbStatus')?.textContent],
        ["Total VPS Cost", document.getElementById('calcVpsTotal')?.textContent],
        ["Total MongoDB Cost", document.getElementById('calcMongoTotal')?.textContent],
        ["Hardware Summary Profit", document.getElementById('sumProfit')?.textContent]
    ];

    fields.forEach(row => {
        csvContent.push(`"${row[0]}","${row[1]}"`);
    });

    const dataString = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", dataString);
    link.setAttribute("download", `dev-dashboard-metrics-${Date.now()}.csv`);
    link.click();
}
