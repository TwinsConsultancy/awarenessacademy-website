Build a professional, compact, real-time “Developer Dashboard” page for the platform.

The layout must be:
    Clean
    Data-dense but readable
    Dark mode default
    Professional SaaS style
    Real-time auto updating (WebSocket based, no manual refresh)
    Responsive (desktop priority, tablet optimized)

🧠 SECTION 1: SYSTEM HEALTH SUMMARY (Top Priority)
At the top of the page:
    Title:
        Developer Control Center
    Below the title:
        Display 4 Core Questions in Card Layout (2 rows layout, clean grid):
            Each question must have:
                Question (bold)
                Status indicator (Green / Yellow / Red)
                Short dynamic answer
                Last updated time
                Expandable details dropdown
        1️⃣ Are we safe?
            Display:
                Server uptime
                Error rate %
                Database connection status
                SSL status
                Security alerts count
            Status logic:
                Green: no critical issues
                Yellow: minor warnings
                Red: major system issue
        2️⃣ Are we overloaded?
            Display:
                CPU usage %
                RAM usage %
                Active users
                Avg response time
                Current VPS load
            Color indicator:
                Green < 60%
                Yellow 60–80%
                Red > 80%
        3️⃣ Are we losing money?
            Display:
                Monthly projected cost
                Current revenue
                Razorpay commission total
                Bandwidth overage warnings
                Profit/Loss indicator
        4️⃣ Are users facing issues?
            Display:
                4xx errors
                5xx errors
                Failed video streams
                Slow API endpoints
                Crash logs count
💰 SECTION 2: COST MONITORING
    Title: Infrastructure Cost Monitor
    Layout: 4 Cost Cards + Summary Panel
    Each cost card must allow manual input fields (editable from frontend):
        🔹 Hostinger VPS Cost
            Fields:
                Plan name
                Monthly cost
                Number of instances
                Auto-calculated total
        🔹 MongoDB Cost
            Fields:
                Cluster plan
                Storage used
                Monthly cost
        🔹 Razorpay Commission
            Fields:
                Revenue this month
                Commission %
                Auto calculated commission total
        🔹 R2 Storage Cost
            Fields:
                auto calculate the total Storage used (GB)
                Bandwidth used (GB)
                Storage price per GB
                Bandwidth price per GB
                Auto total
    Summary Panel (Right side)
        Display:
            Total Infra Cost
            Total Revenue
            Commission
            Net Profit
            Cost per Active User
            Cost per Video Stream
        Auto-update in real time.

⚖️ SECTION 3: SCALING + LOAD BALANCING
    Title: Scaling & Load Control
        Display:
            Current instance count
            Max instances allowed
            Current concurrent users
            Scaling threshold
            Auto-scale status (Enabled/Disabled)
            Load balancer health
        Charts:
            Concurrent users (live line chart)
            Instance scaling timeline graph
            Response time graph
    If threshold exceeded:
        Show scaling animation indicator

📊 SECTION 4: LIVE SYSTEM METRICS
    Title: Live System Metrics
    Grid layout:
        Cards:
            CPU usage (live gauge)
            RAM usage (live gauge)
            Disk usage
            Process count
            Server uptime
        Charts:
            CPU 24h graph
            RAM 24h graph
            Disk growth graph
    Must auto refresh every 5 seconds via socket.

🎥 SECTION 5: VIDEO SYSTEM METRICS
    Title: Video Infrastructure
    Display:
        Total videos stored
        Total storage used
        Total video plays today
        Avg streaming time
        Failed stream count
    Charts:
        Most watched videos
        Storage growth over time
        Bandwidth consumption graph
    Include:
        Top 5 most streamed videos table

🌐 SECTION 6: NETWORK + BANDWIDTH
    Title: Network & Bandwidth
    Display:
        Outgoing bandwidth
        Incoming bandwidth
        Requests per minute
        Peak requests
        API latency
    Charts:
        RPM graph (real-time)
        Bandwidth daily graph
        Latency graph

🚨 SECTION 7: ERROR TRACKING
    Title: System Errors & Debug Logs
    Display:
        Recent server errors
        4xx errors count
        5xx errors count
        Slow APIs
        Failed DB queries
    Include:
        Filter by date
        Search logs
        Download logs button
    Table format:
        Timestamp | Endpoint | Status | Response Time | Error Message

⚡ REAL-TIME REQUIREMENTS
    All sections must:
        Update automatically (WebSocket or SSE)
        No manual refresh
        Show "Last updated X seconds ago"
        Smooth animated transitions
        Status colors consistent across dashboard

🎨 DESIGN RULES
    Compact professional layout
    No wasted whitespace
    Rounded cards
    Subtle shadow
    Green / Yellow / Red indicator system
    Clean typography
    Dark mode default
    Responsive grid
    Sticky section navigation sidebar

🧩 EXTRA FEATURES
    Add:
        Export cost report (PDF)
        Export usage report (CSV)
        Manual refresh button (backup)
        Toggle between 24h / 7d / 30d view
        Alert notification bell (top right)