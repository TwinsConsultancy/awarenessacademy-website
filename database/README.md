# InnerSpark Database Seeding

## Quick Start

To populate your database with sample data, run:

```bash
npm run seed
```

## What Gets Created

### Users (9 total)
- **1 Admin**: admin@innerspark.com (password: `admin123`)
- **3 Staff/Mentors**: 
  - swami@innerspark.com (password: `mentor123`)
  - maya@innerspark.com (password: `mentor123`)
  - ananda@innerspark.com (password: `mentor123`)
- **5 Students**: 
  - arjun@example.com (password: `student123`)
  - priya@example.com (password: `student123`)
  - raj@example.com (password: `student123`)
  - ananya@example.com (password: `student123`)
  - vikram@example.com (password: `student123`)

### Courses (6 total)
1. Meditation Fundamentals - $49.99 (Published)
2. Yoga for Inner Balance - $79.99 (Published)
3. Philosophy of the Bhagavad Gita - $59.99 (Published)
4. Mindfulness in Daily Life - $39.99 (Published)
5. Sacred Rituals and Ceremonies - $69.99 (Published)
6. Advanced Pranayama Techniques - $89.99 (Draft)

### Content
- 5 materials per published course (videos and PDFs)
- First two videos have preview durations (30s and 60s)
- All approved by admin

### Enrollments
- Students enrolled in 2-3 courses each
- Successful payment records for all enrollments
- Progress tracking with completion percentages

### Schedules
- Live classes scheduled for published courses
- Jitsi meeting links provided
- Dates starting from Feb 5, 2026

### Other Data
- 5 FAQs (Spiritual, Technical, Payment categories)
- 3 Blog posts
- 3 Upcoming events
- 3 Active coupon codes
- Forum discussions
- Support tickets
- Newsletter subscriptions
- System broadcasts
- Banner advertisements

## Coupon Codes

Test these coupon codes at checkout:
- **GRACE10** - 10% discount (expires Dec 31, 2026)
- **FIRSTPATH20** - 20% discount (expires Jun 30, 2026)
- **NEWYEAR50** - 50% discount (expires Feb 28, 2026)

## Testing Scenarios

### As Student
1. Login as: arjun@example.com / student123
2. View enrolled courses on dashboard
3. Browse marketplace and preview courses
4. Watch course videos with preview restrictions
5. Download ID card
6. Take exams (80% progress required)
7. View payment history
8. Check timetable for live classes
9. Post in course forum
10. Raise support tickets

### As Staff
1. Login as: swami@innerspark.com / mentor123
2. View your courses
3. Upload new content (videos/PDFs)
4. Create exams with questions
5. Schedule live classes
6. View enrolled students
7. Start Jitsi meeting for live class

### As Admin
1. Login as: admin@innerspark.com / admin123
2. Review pending content
3. Approve/reject content and exams
4. View dashboard analytics
5. Check financial ledger
6. Override student enrollments
7. Send broadcast messages
8. Manage banners
9. Create blog posts and events

## Database Structure

All data is stored in MongoDB with the following collections:
- users
- courses
- contents
- schedules
- attendances
- payments
- faqs
- exams
- certificates
- progresses
- results
- enrollments
- tickets
- forums
- broadcasts
- banners
- blogs
- events
- newsletters
- coupons

## Re-seeding

The script will:
1. Clear all existing data
2. Create fresh sample data
3. Generate proper relationships between collections

**Warning**: This will delete ALL existing data in the database!

## Troubleshooting

If seeding fails:
1. Ensure MongoDB is running
2. Check connection string in `.env` or use default: `mongodb://localhost:27017/innerspark`
3. Make sure all dependencies are installed: `npm install`
4. Check console output for specific errors
