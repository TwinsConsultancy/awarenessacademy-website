# Product Requirements Document (PRD) – InnerSpark v1.0

## 1. Document Overview
*   **Product Name:** InnerSpark
*   **Version:** 1.0
*   **Status:** Finalized for Development
*   **Theme:** Spiritual, Motivational, Educational
*   **Primary Colors:** Saffron (#FF9933), Golden Yellow (#FFC300), Warm White (#FFF5E1)

---

## 2. Vision & Goals
**Vision:** To provide a digital sanctuary that bridges the gap between ancient wisdom and modern technology, allowing users to grow spiritually and motivationally through a structured, calm, and interactive environment.

**Goals:**
*   Provide a seamless video learning experience (Live + Recorded).
*   Implement a rigorous content quality control system via Admin approval.
*   Establish a professional identity for students via unique IDs and downloadable cards.
*   Maintain a high-performance, mobile-first web application using a Node.js/MongoDB stack.

---

## 3. Target User Personas

| Role | Description | Key Motivations |
| :--- | :--- | :--- |
| **Student** | Seekers of spiritual/personal growth. | Easy access to content, tracking progress, attending live sessions. |
| **Staff (Mentor)** | Content creators and spiritual guides. | Sharing knowledge, managing student queries, hosting live interactions. |
| **Admin** | System controllers/Organizers. | Ensuring content quality, managing revenue, and platform moderation. |

---

## 4. Enhanced Functional Requirements

### 4.1 Public Landing Website (The "Sanctuary" Entry)
*   **Hero Section:** Dynamic "Daily Spark" (Rotating motivational quotes) and a high-quality background video/image.
*   **Course Discovery:** Filterable marketplace (Categories: Meditation, Philosophy, Motivation, Rituals).
    *   **The "Viewer Tracking" Engine**
        *   The system will now silently monitor every "Play" event on preview videos across the Landing Page and the Student Marketplace.
        *   **Viewer Categorization:**
            *   **Unknown Viewer:** Any user not logged in. Tracked via Session ID / IP (displayed as "Guest/Unknown").
            *   **Known Student:** A registered student who has not yet purchased this specific course but is watching the preview.
        *   **Data Points Captured:**
            *   Timestamp: Exact date and time of the view.
            *   Watch Duration: Total seconds/minutes the preview was played.
            *   Frequency: How many times this specific user has returned to watch this preview.
            *    Course & Video ID: Which specific content is attracting attention.
*   **The "Inner Circle" Blog:** A public-facing section for staff-written articles to drive SEO and engagement.
*   **Events Calendar:** A public view of upcoming free/premium live webinars.
*   **Dynamic Footer:** Social media links, newsletter signup, and quick links.

### 4.2 Authentication & Identity
*   **Smart Registration:**
    *   Input: Full Name, Email, Phone, Gender, DOB, Address.
    *   **Auto-Generation:** System assigns a unique ID. (for student: STU-YYYY-XXXX, for staff: STF-YYYY-XXXX, for admin: ADM-YYYY-XXXX)
    *   **ID Card Engine:** A dynamic PDF generator that creates a branded ID card with the student’s photo (optional), ID, and Join Date.
*   **Login:** Supports both Email or Unique Student ID.

### 4.3 Student Features (The Learning Hub)
*   **My Journey (Dashboard):** Progress bars showing % of course completion.
*   **Mindfulness Toolkit:** A built-in "Focus Timer" or "Meditation Music Player" (Static files) accessible to all logged-in students.
*   **Course Player:** High-quality video player with "Mark as Complete" and "Download Notes" features.
*   **Q&A Forum:** Course-specific comment section to ask mentors questions.
*   **Payment History:** Section to view invoices and pending payments.
*   **Attendance Sheet:**
    *   A visual calendar/grid view showing days attended.
    *   Live Class Attendance: Automatically marked when a student clicks "Join Class" and stays for a minimum duration.
    *   Video Attendance: Marked as "Present" for a module once the video reaches 90% completion.
*   **Smart Timetable:**
    *   A dynamic weekly/monthly view.
    *   Logic: It pulls data only from courses the student has paid for.
    *   Features: Color-coded slots (Live vs. Recorded Release), "Join Now" shortcut buttons, and countdown timers for the next session.
*   **Preview & Freemium Access (Public & Marketplace)**
    *   **Dynamic Video Preview:** Unregistered viewers and students browsing the Marketplace can watch a "teaser" of course videos.
    *   **Custom Duration:** Staff defines the preview length (e.g., first 30 seconds or 2 minutes) for each video individually during upload.
    *   **Approval Workflow:** Admin must approve both the video content and the specified preview duration before it goes live.
    *   **UX Implementation:** A "Watch Preview" button on course cards that opens a modal with a restricted player.
*   **Examination & Certification System**
    *   **Eligibility Logic:** Staff sets a "Course Progress Threshold" (e.g., 80% completion).
    *   **The "Take Exam" button remains locked until the student meets this threshold.
    *   **Exam Creator (Staff):** Staff creates Multiple Choice Questions (MCQs) for their specific courses.
    *   **Staff sets the "Passing Percentage."
*   **Automated Certification:**
    *   Upon scoring above the passing mark, the system triggers the Certificate Engine.
    *   **PDF Generation:** A branded certificate including Student Name, Course Name, Date of Completion, and a Unique Certificate ID.
    *   **Download:** Available immediately on the Student Dashboard.
        Upon scoring above the passing mark, the system triggers the Certificate Engine.
        PDF Generation: A branded certificate including Student Name, Course Name, Date of Completion, and a Unique Certificate ID.
            Download: Available immediately on the Student Dashboard.

### 4.4 Staff Features (The Mentor Suite)
*   **Content Workshop:** 
    *   Upload Video (MP4/Link).
    *   Includes a field for previewDuration (in seconds).
    *   **Assessment Builder:**
        *   Interface to add/edit/delete MCQ questions.
        *   Set examActivationThreshold (percentage of course completion required).
        *   Set passingScore (percentage required to earn certificate).
    *   Upload Attachments (PDF/eBooks).
    *   Drafting mode (Save and edit before submitting to Admin).
*   **Live Classroom:** Integration with Jitsi/Zoom/WebRTC for "One-Click Start" sessions.
*   **Student Insight:** View list of students enrolled in *their* courses only (Names & Progress).
    
### 4.5 Admin Features (The Command Center)
*   **Content Review Queue:** A "Watch & Approve" workflow for all staff uploads.
*   **Financial Ledger:** 
    *   Gross Revenue tracking.
    *   Manual Payment Overrides (for offline cash/bank transfers).
*   **Global Broadcast:** Send a "System Announcement" appearing as a scrolling ticker on Student/Staff dashboards.
*   **Banner Management:** Upload new images for the landing page hero section.
*   **Student Metrics:**
    *   Average completion rate per course.
    *   Drop-off points (which video is being skipped the most).
    *   Active vs. Inactive students per course.
*   **Payment Analysis:**
    *   Total revenue per course.
    *   Pending vs. Successful transactions.
    *   Monthly growth charts (Revenue & Enrollment).
*   **Validation Panel:**
    *   Review and approve previewDuration for videos.
    *   Audit Exam questions to ensure quality and relevance.
    *   **Certificate Management:** Ability to revoke or manually issue certificates if needed.
*   **Marketplace Analytics** tab for the Admin to measure interest:
    *   **Reach Metric:** Total "Unknown" views vs. "Student" views.
        *   **Conversion Potential:** A list of Registered Students who have watched a preview multiple times (indicating high intent to buy).
        *   **Engagement Heatmap:** Which videos are being watched until the very end of the preview duration vs. which are being closed immediately.
---

## 5. Course & Payment Logic
*   **Pricing Models:** One-time purchase per course.
*   **Access Control:** 
    *   *Locked:* Video thumbnails are visible but only specified preview duration is allowed to watch.
    *   *Unlocked:* Full access upon "Payment Confirmed" status in MongoDB.
*   **Coupons:** Admin can create "GRACE10" style discount codes.

---

## 6. Detailed Technical Architecture

### 6.1 Frontend (Vanilla UI)
*   **Framework:** Pure HTML5/CSS3 and Vanilla JavaScript.
*   **Styling:** Custom CSS Variables for the Yellow-Orange theme.
*   **Responsiveness:** Mobile-first approach using CSS Grid and Flexbox.
*   **PDF Generation:** `jsPDF` or `html2pdf.js` for ID Cards.

### 6.2 Backend (The Engine)
*   **Environment:** Node.js with Express.js.
*   **Authentication:** Role based access control.
*   **File Handling:** `Multer` for handling video/PDF uploads.

---

## 7. UI/UX Aesthetic Guidelines
*   **Atmosphere:** Clean, airy, and professional. Use plenty of whitespace.
*   **Typography:** 
    *   *Headings:* 'Playfair Display' (Serif) for a spiritual, timeless feel.
    *   *Body:* 'Poppins' (Sans-serif) for modern readability.
*   **Components:** 
    *   Glassmorphism effects on dashboard cards.
    *   Soft rounded corners (`border-radius: 15px`).
    *   Orange buttons with subtle golden gradients.
    *   **Exam Interface:** A clean, distraction-free "Zen Mode" UI with a soft yellow background to reduce test anxiety.
    *   **Preview Overlay:** When a preview ends, a soft orange gradient overlay appears with a "Continue Learning - Enroll Now" call-to-action.
    *   **Certificate Design:** Incorporate a gold-foil digital seal and the InnerSpark logo.

---

## 8. New Feature Additions
1.  **Daily Affirmation:** A pop-up modal when a student logs in for the first time each day.
2.  **Attendance Logs:** Automatically log when a student joins a Live Class link.
3.  **Support Tickets:** A simple "Raise a Concern" form in the dashboard that goes to the Admin.
4.  **Course Expiry (Optional):** Admin can set access duration (e.g., 1 Year access).

---

## 9. Security & Validation
*   **Input Sanitization:** Protect against XSS and SQL Injection (even for NoSQL).
*   **Route Guards:** Middleware to ensure Students cannot access `/admin` or `/staff` routes.
*   **Video Protection:** Disable right-click on video elements alone to prevent easy "Save As" downloads.

---

## 10. Success Metrics
*   **Onboarding:** Successful ID card generation for 100% of new users.
*   **Engagement:** Average time spent in the "Mindfulness Toolkit."
*   **Efficiency:** Time taken for Admin to approve content (Target: <24 hours).

---
## 11. Smart Chatbot (AI Assistant)
*   **Capabilities:**
    *   Course Discovery: "Show me courses on Meditation" -> Returns list with prices.
    *   Personalized Info: "When is my next class?" -> Checks student's timetable and returns date/time.
    *   Price Inquiry: Provides current pricing and active discount codes.
    *   Doubt Clearing: Uses a pre-defined FAQ database to answer common questions about content or technical issues.
    *   Lead Gen: For guests, it collects Email/Phone if they show interest in a course.

---

## 12. Database Schema (MongoDB Collections)
*   **To build this, you will need the following 7 primary collections. Here is the breakdown of what goes inside each:**
    *   Users
        *   Stores all identity and profile data.
        *   _id: ObjectID
        *   studentID: String (Unique, e.g., IS-2024-001)
        *   role: String (Student / Staff / Admin)
        *   name, email, password: String
        *   phone, address, dob: String
        *   profilePic: String (URL)
        *   enrolledCourses: Array [CourseIDs]
        *   createdAt: Timestamp
    *   Courses
        *   Stores the structure of what is being sold.
        *   _id: ObjectID
        *   title, description: String
        *   category: String (Meditation/Motivation/etc.)
        *   price: Number
        *   mentorID: ObjectID (Ref: Users)
        *   thumbnail: String (URL)
        *   status: String (Draft / Published / Inactive)
        *   totalLessons: Number
    *   Schedules
        *   Powers the Smart Timetable.
        *   _id: ObjectID
        *   courseID: ObjectID (Ref: Courses)
        *   staffID: ObjectID (Ref: Users)
        *   title: String (e.g., "Morning Zen Session")
        *   startTime: DateTime
        *   endTime: DateTime
        *   meetingLink: String (Jitsi/Zoom/GMeet)
        *   type: String (Live / Recorded Release)
    *   Attendance
        *   Tracks student engagement.
        *   _id: ObjectID
        *   studentID: ObjectID (Ref: Users)
        *   courseID: ObjectID (Ref: Courses)
        *   scheduleID: ObjectID (Ref: Schedules)
        *   status: String (Present / Absent)
        *   timestamp: DateTime
    *   Payments
        *   Powers Admin Analytics.
        *   _id: ObjectID
        *   transactionID: String
        *   studentID: ObjectID (Ref: Users)
        *   courseID: ObjectID (Ref: Courses)
        *   amount: Number
        *   paymentMethod: String (UPI / Card / Manual)
        *   status: String (Pending / Success / Failed)
        *   date: DateTime
    *   Content
        *   Stores the actual learning material.
        *   _id: ObjectID
        *   courseID: ObjectID (Ref: Courses)
        *   uploadedBy: ObjectID (Ref: Users)
        *   type: String (Video / PDF / Note)
        *   fileUrl: String
        *   previewDuration: Number (Seconds allowed for non-paid viewing)
        *   approvalStatus: String (Pending / Approved / Rejected)
        *   adminRemarks: String (Feedback for staff)
    *   Chatbot/FAQ
        *   Powers the Chatbot logic.
        *   _id: ObjectID
        *   question: String (Keywords/Tags)
        *   answer: String
        *   category: String (Technical / Spiritual / Payment)
        *   adminRemarks: String (Feedback for staff)
    *    Exams
        *   _id: ObjectID
        *   courseID: ObjectID (Ref: Courses)
        *   questions: Array
        *   [ { questionText, options: [], correctOptionIndex } ]
        *   passingScore: Number (e.g., 70)
        *   activationThreshold: Number (e.g., 85% progress required)
        *   status: String (Draft / Published)
    *   Certificates/Results
        *   _id: ObjectID
        *   studentID: ObjectID (Ref: Users)
        *   courseID: ObjectID (Ref: Courses)
        *   examScore: Number
        *   issueDate: DateTime
        *   certificateURL: String (Path to generated PDF)
        *   uniqueCertID: String (e.g., CERT-<courseID>-12345)
    *   Impressions
        *   _id: ObjectID
        *   courseID: ObjectID (Ref: Courses)
        *   videoID: ObjectID (Ref: Content)
        *   viewerType: String ("Unknown" | "Registered Student")
        *   viewerIdentity: ObjectID (Ref: Users, Null if Unknown) or String (SessionID for Unknowns)
        *   watchDuration: Number (Seconds watched in this session)
        *   totalVideoDuration: Number (The total length of that specific preview)
        *   timestamp: DateTime
        *   ipAddress: String (Optional, for tracking unique guest frequency)

    Summary of Data Connections
    Collection	            Connects To	                Purpose
    Users	                Payments, Attendance, Impressions	Identify who is learning/viewing.
    Courses	                Content, Exams, Schedules	Central hub for all learning material.
    Impressions	            Users, Courses, Content	Tracks marketing reach and video interest.
    Exams	                Courses, Certificates	Manages the path to graduation.
    Attendance	            Users, Schedules	Tracks daily discipline and live class participation.

**End of PRD v1.0**