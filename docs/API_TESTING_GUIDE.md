# CampusConnect 360 API Testing Guide

Use this guide to test the CampusConnect 360 backend in Postman.

## 1. Start Backend

Open terminal:

```bash
cd server
npm run dev
```

Base URL:

```txt
http://localhost:5000
```

For protected APIs, add this header:

```txt
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

## 2. Basic APIs

### Health API

Method: `GET`

URL:

```txt
http://localhost:5000/api/health
```

Expected: API running message.

### DB Test API

Method: `GET`

URL:

```txt
http://localhost:5000/api/db-test
```

Expected: Database connection route working message.

### Models Test API

Method: `GET`

URL:

```txt
http://localhost:5000/api/models-test
```

Expected: List of all backend models.

## 3. Auth APIs

### Register Student

Method: `POST`

URL:

```txt
http://localhost:5000/api/auth/register
```

Body:

```json
{
  "name": "Student One",
  "enrollmentNo": "ENR001",
  "email": "student@test.com",
  "password": "123456",
  "role": "student",
  "branch": "Computer Engineering",
  "semester": 6,
  "phone": "9876543210"
}
```

Copy the returned token as `studentToken`.

### Register Admin

Method: `POST`

URL:

```txt
http://localhost:5000/api/auth/register
```

Body:

```json
{
  "name": "Admin One",
  "email": "admin@test.com",
  "password": "123456",
  "role": "admin"
}
```

Copy the returned token as `adminToken`.

### Register Department User

Method: `POST`

URL:

```txt
http://localhost:5000/api/auth/register
```

Body:

```json
{
  "name": "Maintenance Staff",
  "email": "dept@test.com",
  "password": "123456",
  "role": "department",
  "department": "MAINT"
}
```

Copy the returned token as `departmentToken`.

### Login

Method: `POST`

URL:

```txt
http://localhost:5000/api/auth/login
```

Body:

```json
{
  "email": "student@test.com",
  "password": "123456"
}
```

Use the same endpoint for admin and department users by changing email and password.

### Auth Me

Method: `GET`

URL:

```txt
http://localhost:5000/api/auth/me
```

Header:

```txt
Authorization: Bearer studentToken
```

### Role Test Routes

Student only:

```txt
GET http://localhost:5000/api/auth/student-test
Authorization: Bearer studentToken
```

Admin only:

```txt
GET http://localhost:5000/api/auth/admin-test
Authorization: Bearer adminToken
```

Department only:

```txt
GET http://localhost:5000/api/auth/department-test
Authorization: Bearer departmentToken
```

## 4. Complaint APIs

Before testing complaints, create a Department document in MongoDB Compass if one does not exist:

```json
{
  "name": "Maintenance Department",
  "code": "MAINT",
  "description": "Campus maintenance",
  "isActive": true
}
```

Copy the Department `_id`.

### Submit Complaint

Method: `POST`

URL:

```txt
http://localhost:5000/api/complaints
```

Access: student

Body:

```json
{
  "title": "Fan not working",
  "description": "The fan in classroom B-204 is not working.",
  "category": "Maintenance",
  "department": "PASTE_DEPARTMENT_ID",
  "priority": "High",
  "imageUrl": "https://example.com/fan.jpg"
}
```

Copy the returned complaint `_id`.

### Get My Complaints

```txt
GET http://localhost:5000/api/complaints/my
Authorization: Bearer studentToken
```

### Get All Complaints

```txt
GET http://localhost:5000/api/complaints
Authorization: Bearer adminToken
```

### Get Single Complaint

```txt
GET http://localhost:5000/api/complaints/PASTE_COMPLAINT_ID
Authorization: Bearer studentToken
```

Admin can view any complaint. Department users can view complaints assigned to their department.

### Update Complaint Status

Method: `PUT`

URL:

```txt
http://localhost:5000/api/complaints/PASTE_COMPLAINT_ID/status
```

Access: admin or department

Body:

```json
{
  "status": "Resolved",
  "adminRemarks": "Checked and approved",
  "departmentRemarks": "Fan repaired"
}
```

Allowed status values: `Pending`, `In Progress`, `Resolved`, `Rejected`.

### Assign Complaint to Department

Method: `PUT`

URL:

```txt
http://localhost:5000/api/complaints/PASTE_COMPLAINT_ID/assign
```

Access: admin

Body:

```json
{
  "department": "PASTE_DEPARTMENT_ID"
}
```

### Delete Complaint

```txt
DELETE http://localhost:5000/api/complaints/PASTE_COMPLAINT_ID
Authorization: Bearer adminToken
```

## 5. Notice APIs

### Create Notice

Method: `POST`

URL:

```txt
http://localhost:5000/api/notices
```

Access: admin

Body:

```json
{
  "title": "Exam Form Notice",
  "description": "Students must submit exam forms before the deadline.",
  "targetAudience": "Students",
  "priority": "Important",
  "expiryDate": "2026-08-15"
}
```

Copy the notice `_id`.

### Get Active Notices

```txt
GET http://localhost:5000/api/notices
Authorization: Bearer studentToken
```

### Get Single Notice

```txt
GET http://localhost:5000/api/notices/PASTE_NOTICE_ID
Authorization: Bearer studentToken
```

### Update Notice

Method: `PUT`

URL:

```txt
http://localhost:5000/api/notices/PASTE_NOTICE_ID
```

Access: admin

Body:

```json
{
  "title": "Updated Exam Form Notice",
  "description": "Exam form deadline has been extended.",
  "targetAudience": "All",
  "priority": "Urgent",
  "expiryDate": "2026-08-20",
  "isActive": true
}
```

### Soft Delete Notice

```txt
DELETE http://localhost:5000/api/notices/PASTE_NOTICE_ID
Authorization: Bearer adminToken
```

This sets `isActive` to `false`.

## 6. Event APIs

### Create Event

Method: `POST`

URL:

```txt
http://localhost:5000/api/events
```

Access: admin

Body:

```json
{
  "title": "Tech Fest 2026",
  "description": "Annual college technical festival.",
  "eventDate": "2026-09-10",
  "eventTime": "10:00 AM",
  "venue": "Main Auditorium",
  "department": "Computer Engineering",
  "organizer": "CampusConnect Committee",
  "imageUrl": "https://example.com/event.jpg"
}
```

Copy the event `_id`.

### Get Active Events

```txt
GET http://localhost:5000/api/events
Authorization: Bearer studentToken
```

### Get Single Event

```txt
GET http://localhost:5000/api/events/PASTE_EVENT_ID
Authorization: Bearer studentToken
```

### Update Event

Method: `PUT`

URL:

```txt
http://localhost:5000/api/events/PASTE_EVENT_ID
```

Access: admin

Body:

```json
{
  "title": "Updated Tech Fest 2026",
  "description": "Updated event description.",
  "eventDate": "2026-09-12",
  "eventTime": "11:00 AM",
  "venue": "Seminar Hall",
  "department": "Computer Engineering",
  "organizer": "Student Council",
  "imageUrl": "https://example.com/updated-event.jpg",
  "isActive": true
}
```

### Soft Delete Event

```txt
DELETE http://localhost:5000/api/events/PASTE_EVENT_ID
Authorization: Bearer adminToken
```

This sets `isActive` to `false`.

## 7. Lost and Found APIs

### Create Lost/Found Item

Method: `POST`

URL:

```txt
http://localhost:5000/api/lost-found
```

Access: student, admin, department

Body:

```json
{
  "type": "Lost",
  "itemName": "Black Wallet",
  "description": "Lost near library. Contains student ID card.",
  "location": "Library",
  "itemDate": "2026-07-04",
  "contactInfo": "student@test.com / 9876543210",
  "imageUrl": "https://example.com/wallet.jpg"
}
```

Copy the item `_id`.

### Get Active Lost/Found Items

```txt
GET http://localhost:5000/api/lost-found
Authorization: Bearer studentToken
```

### Get My Lost/Found Items

```txt
GET http://localhost:5000/api/lost-found/my
Authorization: Bearer studentToken
```

### Get Single Lost/Found Item

```txt
GET http://localhost:5000/api/lost-found/PASTE_ITEM_ID
Authorization: Bearer studentToken
```

### Update Lost/Found Item

Method: `PUT`

URL:

```txt
http://localhost:5000/api/lost-found/PASTE_ITEM_ID
```

Access: item owner or admin

Body:

```json
{
  "type": "Lost",
  "itemName": "Black Leather Wallet",
  "description": "Updated description. Lost near central library.",
  "location": "Central Library",
  "itemDate": "2026-07-04",
  "contactInfo": "student@test.com / 9876543210",
  "imageUrl": "https://example.com/updated-wallet.jpg"
}
```

### Update Lost/Found Status

Method: `PUT`

URL:

```txt
http://localhost:5000/api/lost-found/PASTE_ITEM_ID/status
```

Access: item owner or admin

Body:

```json
{
  "status": "Claimed"
}
```

Allowed status values: `Open`, `Claimed`, `Closed`.

### Close Lost/Found Item

```txt
DELETE http://localhost:5000/api/lost-found/PASTE_ITEM_ID
Authorization: Bearer studentToken
```

This sets `status` to `Closed`.

## 8. Chatbot APIs

### Ask Chatbot

Method: `POST`

URL:

```txt
http://localhost:5000/api/chatbot/ask
```

Access: logged-in users

Body:

```json
{
  "question": "How can I track my complaint status?"
}
```

Expected intent: `complaint_tracking`.

Other questions to test:

```json
{ "question": "How can I submit a complaint?" }
```

```json
{ "question": "Where can I see notices and announcements?" }
```

```json
{ "question": "Where can I check campus events?" }
```

```json
{ "question": "I lost my ID card. What should I do?" }
```

### Get Chatbot History

```txt
GET http://localhost:5000/api/chatbot/history
Authorization: Bearer studentToken
```

### Delete Chatbot History

```txt
DELETE http://localhost:5000/api/chatbot/history
Authorization: Bearer studentToken
```

## 9. Dashboard APIs

### Dashboard Overview

```txt
GET http://localhost:5000/api/dashboard/overview
Authorization: Bearer studentToken
```

Works with student, admin, and department tokens.

### Student Dashboard

```txt
GET http://localhost:5000/api/dashboard/student
Authorization: Bearer studentToken
```

### Admin Dashboard

```txt
GET http://localhost:5000/api/dashboard/admin
Authorization: Bearer adminToken
```

### Department Dashboard

```txt
GET http://localhost:5000/api/dashboard/department
Authorization: Bearer departmentToken
```

If the department user has no department assigned, the response returns zero counts with this message:

```txt
Department is not assigned to this user yet.
```

## 10. Recommended First Test Order

1. `GET /api/health`
2. `GET /api/db-test`
3. `GET /api/models-test`
4. Register or login student, admin, and department users.
5. Test `GET /api/auth/me`.
6. Test role routes.
7. Create sample notice, event, complaint, lost/found item, and chatbot question.
8. Test dashboard summaries.
