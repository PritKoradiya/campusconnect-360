# CampusConnect 360 API Routes List

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Check whether API server is running |
| GET | `/api/db-test` | Public | Check database test route |
| GET | `/api/models-test` | Public | Check available Mongoose models |
| POST | `/api/auth/register` | Public | Register a student, admin, or department user |
| POST | `/api/auth/login` | Public | Login user and receive JWT token |
| GET | `/api/auth/me` | Protected | Get logged-in user details |
| GET | `/api/auth/student-test` | Student | Test student role access |
| GET | `/api/auth/admin-test` | Admin | Test admin role access |
| GET | `/api/auth/department-test` | Department | Test department role access |
| POST | `/api/complaints` | Student | Submit complaint |
| GET | `/api/complaints/my` | Student | Get logged-in student's complaints |
| GET | `/api/complaints` | Admin | Get all complaints |
| GET | `/api/complaints/:id` | Student, Admin, Department | Get single complaint details |
| PUT | `/api/complaints/:id/status` | Admin, Department | Update complaint status |
| PUT | `/api/complaints/:id/assign` | Admin | Assign complaint to department |
| DELETE | `/api/complaints/:id` | Admin | Delete complaint |
| POST | `/api/notices` | Admin | Create notice |
| GET | `/api/notices` | Student, Admin, Department | Get all active notices |
| GET | `/api/notices/:id` | Student, Admin, Department | Get single notice |
| PUT | `/api/notices/:id` | Admin | Update notice |
| DELETE | `/api/notices/:id` | Admin | Soft delete notice |
| POST | `/api/events` | Admin | Create event |
| GET | `/api/events` | Student, Admin, Department | Get all active events |
| GET | `/api/events/:id` | Student, Admin, Department | Get single event |
| PUT | `/api/events/:id` | Admin | Update event |
| DELETE | `/api/events/:id` | Admin | Soft delete event |
| POST | `/api/lost-found` | Student, Admin, Department | Create lost/found item |
| GET | `/api/lost-found` | Student, Admin, Department | Get active lost/found items |
| GET | `/api/lost-found/my` | Student, Admin, Department | Get logged-in user's lost/found items |
| GET | `/api/lost-found/:id` | Student, Admin, Department | Get single lost/found item |
| PUT | `/api/lost-found/:id` | Item Owner, Admin | Update lost/found item |
| PUT | `/api/lost-found/:id/status` | Item Owner, Admin | Update lost/found item status |
| DELETE | `/api/lost-found/:id` | Item Owner, Admin | Soft close lost/found item |
| POST | `/api/chatbot/ask` | Protected | Ask rule-based chatbot |
| GET | `/api/chatbot/history` | Protected | Get logged-in user's chatbot history |
| DELETE | `/api/chatbot/history` | Protected | Delete logged-in user's chatbot history |
| GET | `/api/dashboard/overview` | Student, Admin, Department | Get common dashboard overview |
| GET | `/api/dashboard/student` | Student | Get student dashboard summary |
| GET | `/api/dashboard/admin` | Admin | Get admin dashboard summary |
| GET | `/api/dashboard/department` | Department | Get department dashboard summary |
