const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const User = require('../models/User');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');
const ComplaintFeedback = require('../models/ComplaintFeedback');
const Notice = require('../models/Notice');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const EventAttendance = require('../models/EventAttendance');
const LostFound = require('../models/LostFound');
const Notification = require('../models/Notification');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campusconnect360';

async function seed() {
  console.log('Connecting to database:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Successfully connected to MongoDB.');

  const manifest = {
    generatedAt: new Date().toISOString(),
    database: MONGO_URI,
    summary: {},
    users: [],
    complaints: [],
    feedbacks: [],
    notices: [],
    events: [],
    registrations: [],
    attendances: [],
    lostFound: [],
    notifications: []
  };

  // 1. VERIFY EXISTING ADMIN
  console.log('\n[1/7] Inspecting Admin and Department setup...');
  let admin = await User.findOne({ email: 'admin@gmail.com' });
  if (!admin) {
    admin = await User.findOne({ role: 'admin' });
  }
  if (!admin) {
    throw new Error('No existing admin account found in database. Aborting to protect system integrity.');
  }
  console.log(`Using existing Admin: ${admin.name} (${admin.email}, ID: ${admin._id}) - credentials preserved untouched.`);

  // Verify existing CE and IT departments
  let ceDept = await Department.findOne({ code: 'CE' });
  if (!ceDept) {
    ceDept = await Department.findOne({ name: /computer/i });
  }
  let itDept = await Department.findOne({ code: 'IT01' });
  if (!itDept) {
    itDept = await Department.findOne({ name: /information technology/i });
  }

  if (!ceDept || !itDept) {
    console.warn('Warning: One or more expected departments missing; inspecting all departments:');
    const allDepts = await Department.find();
    console.log(allDepts.map(d => ({ id: d._id, name: d.name, code: d.code })));
    if (!ceDept && allDepts.length > 0) ceDept = allDepts[0];
    if (!itDept && allDepts.length > 1) itDept = allDepts[1];
  }
  console.log(`CE Dept: ${ceDept?.name} (${ceDept?._id})`);
  console.log(`IT Dept: ${itDept?.name} (${itDept?._id})`);

  // Existing CE Department Officer
  let ceDeptUser = await User.findOne({ email: 'department@gmail.com' });
  if (ceDeptUser) {
    console.log(`Reusing existing CE Department account: ${ceDeptUser.email} (ID: ${ceDeptUser._id})`);
  } else {
    ceDeptUser = await User.findOne({ role: 'department' });
  }

  // IT Department Officer
  let itDeptUser = await User.findOne({ email: 'it.dept@example.com' });
  if (!itDeptUser) {
    itDeptUser = new User({
      name: 'Prof. Vikram Joshi',
      email: 'it.dept@example.com',
      password: 'Demo@123',
      role: 'department',
      department: itDept ? itDept._id.toString() : 'Information Technology',
      phone: '+91 98765 43220',
      isActive: true
    });
    await itDeptUser.save();
    console.log(`Created IT Department account: ${itDeptUser.email} (ID: ${itDeptUser._id})`);
  } else {
    console.log(`Reusing existing IT Department account: ${itDeptUser.email} (ID: ${itDeptUser._id})`);
  }
  manifest.users.push({ id: itDeptUser._id.toString(), email: itDeptUser.email, role: itDeptUser.role, name: itDeptUser.name });

  // 2. STUDENT DEMO ACCOUNTS (3 from different departments)
  console.log('\n[2/7] Preparing 3 Student demo accounts...');
  const studentData = [
    {
      name: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      password: 'Demo@123',
      role: 'student',
      branch: 'Computer Engineering',
      department: 'Computer Engineering',
      semester: 5,
      enrollmentNo: 'EN2024CS001',
      phone: '+91 98765 00001',
      gender: 'Male',
      academicYear: '3rd Year',
      division: 'A',
      isActive: true
    },
    {
      name: 'Diya Patel',
      email: 'diya.patel@example.com',
      password: 'Demo@123',
      role: 'student',
      branch: 'Information Technology',
      department: 'Information Technology',
      semester: 3,
      enrollmentNo: 'EN2024IT042',
      phone: '+91 98765 00002',
      gender: 'Female',
      academicYear: '2nd Year',
      division: 'B',
      isActive: true
    },
    {
      name: 'Rohan Verma',
      email: 'rohan.verma@example.com',
      password: 'Demo@123',
      role: 'student',
      branch: 'Mechanical Engineering',
      department: 'Mechanical Engineering',
      semester: 7,
      enrollmentNo: 'EN2024ME088',
      phone: '+91 98765 00003',
      gender: 'Male',
      academicYear: '4th Year',
      division: 'A',
      isActive: true
    }
  ];

  const students = {};
  for (const s of studentData) {
    let student = await User.findOne({ email: s.email });
    if (!student) {
      student = new User(s);
      await student.save();
      console.log(`Created student: ${s.name} (${s.email}, ID: ${student._id})`);
    } else {
      console.log(`Reusing existing student: ${s.name} (${s.email}, ID: ${student._id})`);
    }
    students[s.email] = student;
    manifest.users.push({ id: student._id.toString(), email: student.email, role: student.role, name: student.name });
  }

  // 3. COMPLAINTS (6 realistic complaints across all statuses)
  console.log('\n[3/7] Preparing 6 realistic Complaints...');
  const complaintsData = [
    {
      key: 'pending-projector',
      student: students['aarav.sharma@example.com']._id,
      title: 'Broken Bench and Projector Socket in Seminar Hall B',
      description: 'During the afternoon lecture, the central wall socket for the digital projector stopped delivering power, and row 3 wooden bench mounts are loose.',
      category: 'Infrastructure',
      department: null,
      priority: 'Medium',
      status: 'Pending',
      timeline: [
        {
          eventType: 'COMPLAINT_SUBMITTED',
          title: 'Complaint Submitted',
          description: 'Complaint submitted by Aarav Sharma and logged into the portal.',
          status: 'Pending',
          actor: students['aarav.sharma@example.com']._id,
          actorRole: 'student',
          actorName: 'Aarav Sharma',
          timestamp: new Date(Date.now() - 4 * 3600 * 1000)
        }
      ]
    },
    {
      key: 'inprogress-wifi',
      student: students['diya.patel@example.com']._id,
      title: 'Wi-Fi Signal Drops Frequently in IT Block 3rd Floor Labs',
      description: 'Network connections terminate intermittently during coding lab sessions in Labs 301 and 302. Signal displays full strength but IP assignment times out.',
      category: 'Network & IT',
      department: itDept ? itDept._id : null,
      priority: 'High',
      status: 'In Progress',
      adminRemarks: 'Assigned to IT Department network maintenance team for router firmware check and access point inspection.',
      departmentRemarks: 'Inspected AP-302. Resetting mesh router switch and scheduled line diagnostic for tomorrow.',
      timeline: [
        {
          eventType: 'COMPLAINT_SUBMITTED',
          title: 'Complaint Submitted',
          description: 'Complaint submitted by Diya Patel.',
          status: 'Pending',
          actor: students['diya.patel@example.com']._id,
          actorRole: 'student',
          actorName: 'Diya Patel',
          timestamp: new Date(Date.now() - 28 * 3600 * 1000)
        },
        {
          eventType: 'COMPLAINT_ASSIGNED',
          title: 'Assigned to Information Technology',
          description: 'Complaint reviewed by Admin and routed to IT department.',
          status: 'Pending',
          actor: admin._id,
          actorRole: 'admin',
          actorName: admin.name,
          department: itDept ? itDept._id : null,
          departmentName: itDept ? itDept.name : 'Information Technology',
          timestamp: new Date(Date.now() - 24 * 3600 * 1000)
        },
        {
          eventType: 'COMPLAINT_STATUS_CHANGED',
          title: 'Status changed to In Progress',
          description: 'IT Department technician initiated on-site investigation.',
          status: 'In Progress',
          actor: itDeptUser._id,
          actorRole: 'department',
          actorName: itDeptUser.name,
          timestamp: new Date(Date.now() - 20 * 3600 * 1000)
        },
        {
          eventType: 'COMPLAINT_REMARK_ADDED',
          title: 'Remark Added by Department',
          description: 'Inspected AP-302. Resetting mesh router switch and scheduled line diagnostic for tomorrow.',
          status: 'In Progress',
          actor: itDeptUser._id,
          actorRole: 'department',
          actorName: itDeptUser.name,
          remark: 'Inspected AP-302. Resetting mesh router switch and scheduled line diagnostic for tomorrow.',
          timestamp: new Date(Date.now() - 16 * 3600 * 1000)
        }
      ]
    },
    {
      key: 'inprogress-workstation',
      student: students['aarav.sharma@example.com']._id,
      title: 'Lab 3 High-Performance Workstation OS Kernel Panic',
      description: 'Workstation PC-08 in Computer Lab 3 repeatedly reboots with a kernel panic during heavy GPU rendering and machine learning lab sessions.',
      category: 'Academic Labs',
      department: ceDept ? ceDept._id : null,
      priority: 'Medium',
      status: 'In Progress',
      adminRemarks: 'Forwarded to Computer Engineering hardware technician.',
      departmentRemarks: 'Technician ran memory diagnostic. Reseating DDR5 RAM modules.',
      timeline: [
        {
          eventType: 'COMPLAINT_SUBMITTED',
          title: 'Complaint Submitted',
          description: 'Complaint submitted by Aarav Sharma.',
          status: 'Pending',
          actor: students['aarav.sharma@example.com']._id,
          actorRole: 'student',
          actorName: 'Aarav Sharma',
          timestamp: new Date(Date.now() - 18 * 3600 * 1000)
        },
        {
          eventType: 'COMPLAINT_ASSIGNED',
          title: 'Assigned to Computer Engineering',
          description: 'Forwarded to CE hardware lab assistant.',
          status: 'Pending',
          actor: admin._id,
          actorRole: 'admin',
          actorName: admin.name,
          department: ceDept ? ceDept._id : null,
          departmentName: ceDept ? ceDept.name : 'Computer Engineering',
          timestamp: new Date(Date.now() - 14 * 3600 * 1000)
        },
        {
          eventType: 'COMPLAINT_STATUS_CHANGED',
          title: 'Status changed to In Progress',
          description: 'Hardware lab supervisor commenced diagnostics.',
          status: 'In Progress',
          actor: ceDeptUser ? ceDeptUser._id : admin._id,
          actorRole: 'department',
          actorName: ceDeptUser ? ceDeptUser.name : 'CE Officer',
          timestamp: new Date(Date.now() - 10 * 3600 * 1000)
        }
      ]
    },
    {
      key: 'resolved-dispenser',
      student: students['rohan.verma@example.com']._id,
      title: 'Water Dispenser Sensor Fault in Engineering Block B',
      description: 'The touchless infrared sensor on the cold water dispenser near Room 204 was stuck continuously running, causing floor puddling.',
      category: 'Facilities',
      department: ceDept ? ceDept._id : null,
      priority: 'High',
      status: 'Resolved',
      adminRemarks: 'Urgent facilities maintenance ticket created and routed.',
      departmentRemarks: 'Sensor solenoid valve replaced and calibrated. Verified water flow shutoff.',
      resolvedAt: new Date(Date.now() - 36 * 3600 * 1000),
      timeline: [
        {
          eventType: 'COMPLAINT_SUBMITTED',
          title: 'Complaint Submitted',
          description: 'Submitted by Rohan Verma.',
          status: 'Pending',
          actor: students['rohan.verma@example.com']._id,
          actorRole: 'student',
          actorName: 'Rohan Verma',
          timestamp: new Date(Date.now() - 48 * 3600 * 1000)
        },
        {
          eventType: 'COMPLAINT_ASSIGNED',
          title: 'Assigned to Facilities Maintenance',
          description: 'Routed for immediate plumbing attention.',
          status: 'Pending',
          actor: admin._id,
          actorRole: 'admin',
          actorName: admin.name,
          department: ceDept ? ceDept._id : null,
          departmentName: ceDept ? ceDept.name : 'Computer Engineering',
          timestamp: new Date(Date.now() - 44 * 3600 * 1000)
        },
        {
          eventType: 'COMPLAINT_STATUS_CHANGED',
          title: 'Status changed to In Progress',
          description: 'Plumbing contractor dispatched to Engineering Block B.',
          status: 'In Progress',
          actor: ceDeptUser ? ceDeptUser._id : admin._id,
          actorRole: 'department',
          actorName: ceDeptUser ? ceDeptUser.name : 'CE Officer',
          timestamp: new Date(Date.now() - 40 * 3600 * 1000)
        },
        {
          eventType: 'COMPLAINT_RESOLVED',
          title: 'Complaint Resolved',
          description: 'Sensor solenoid valve replaced and calibrated. Verified water flow shutoff.',
          status: 'Resolved',
          actor: ceDeptUser ? ceDeptUser._id : admin._id,
          actorRole: 'department',
          actorName: ceDeptUser ? ceDeptUser.name : 'CE Officer',
          timestamp: new Date(Date.now() - 36 * 3600 * 1000)
        },
        {
          eventType: 'COMPLAINT_FEEDBACK_SUBMITTED',
          title: 'Feedback Received',
          description: 'Rohan Verma submitted 5-star rating for resolution.',
          status: 'Resolved',
          actor: students['rohan.verma@example.com']._id,
          actorRole: 'student',
          actorName: 'Rohan Verma',
          timestamp: new Date(Date.now() - 30 * 3600 * 1000)
        }
      ]
    },
    {
      key: 'resolved-breaker',
      student: students['aarav.sharma@example.com']._id,
      title: 'Air Conditioning Tripping Circuit Breaker in Computer Lab 1',
      description: 'When both split AC units turn on simultaneously in Lab 1, the sub-distribution breaker trips and shuts down all bench sockets.',
      category: 'Electrical',
      department: ceDept ? ceDept._id : null,
      priority: 'Urgent',
      status: 'Resolved',
      adminRemarks: 'Electrical maintenance team assigned.',
      departmentRemarks: 'Staggered compressor startup timer installed and breaker replaced with 32A C-curve unit.',
      resolvedAt: new Date(Date.now() - 12 * 3600 * 1000),
      timeline: [
        {
          eventType: 'COMPLAINT_SUBMITTED',
          title: 'Complaint Submitted',
          description: 'Submitted by Aarav Sharma.',
          status: 'Pending',
          actor: students['aarav.sharma@example.com']._id,
          actorRole: 'student',
          actorName: 'Aarav Sharma',
          timestamp: new Date(Date.now() - 20 * 3600 * 1000)
        },
        {
          eventType: 'COMPLAINT_ASSIGNED',
          title: 'Assigned to Electrical Department',
          description: 'Complaint routed to electrical engineering technicians.',
          status: 'Pending',
          actor: admin._id,
          actorRole: 'admin',
          actorName: admin.name,
          department: ceDept ? ceDept._id : null,
          departmentName: ceDept ? ceDept.name : 'Computer Engineering',
          timestamp: new Date(Date.now() - 18 * 3600 * 1000)
        },
        {
          eventType: 'COMPLAINT_STATUS_CHANGED',
          title: 'Status changed to In Progress',
          description: 'Electrician checked current draw at sub-distribution panel.',
          status: 'In Progress',
          actor: ceDeptUser ? ceDeptUser._id : admin._id,
          actorRole: 'department',
          actorName: ceDeptUser ? ceDeptUser.name : 'CE Officer',
          timestamp: new Date(Date.now() - 15 * 3600 * 1000)
        },
        {
          eventType: 'COMPLAINT_RESOLVED',
          title: 'Complaint Resolved',
          description: 'Staggered compressor startup timer installed and breaker replaced with 32A C-curve unit.',
          status: 'Resolved',
          actor: ceDeptUser ? ceDeptUser._id : admin._id,
          actorRole: 'department',
          actorName: ceDeptUser ? ceDeptUser.name : 'CE Officer',
          timestamp: new Date(Date.now() - 12 * 3600 * 1000)
        }
      ]
    },
    {
      key: 'rejected-exam',
      student: students['rohan.verma@example.com']._id,
      title: 'Request to Reschedule End-Term Practical Exam Slot',
      description: 'Individual request to take the manufacturing lab practical exam a day earlier due to personal travel plans.',
      category: 'Examination',
      department: null,
      priority: 'Low',
      status: 'Rejected',
      adminRemarks: 'Exam schedule is university-mandated; individual reschedules cannot be entertained without official medical certification per section 4.2 of university bylaws.',
      timeline: [
        {
          eventType: 'COMPLAINT_SUBMITTED',
          title: 'Complaint Submitted',
          description: 'Submitted by Rohan Verma.',
          status: 'Pending',
          actor: students['rohan.verma@example.com']._id,
          actorRole: 'student',
          actorName: 'Rohan Verma',
          timestamp: new Date(Date.now() - 30 * 3600 * 1000)
        },
        {
          eventType: 'COMPLAINT_STATUS_CHANGED',
          title: 'Status changed to Rejected',
          description: 'Exam schedule is university-mandated; individual reschedules cannot be entertained without official medical certification per section 4.2 of university bylaws.',
          status: 'Rejected',
          actor: admin._id,
          actorRole: 'admin',
          actorName: admin.name,
          timestamp: new Date(Date.now() - 26 * 3600 * 1000)
        }
      ]
    }
  ];

  let resolvedDispenserComplaintId = null;

  for (const cData of complaintsData) {
    let complaint = await Complaint.findOne({ title: cData.title, student: cData.student });
    if (!complaint) {
      complaint = new Complaint(cData);
      await complaint.save();
      console.log(`Created complaint [${cData.status}]: "${cData.title}" (ID: ${complaint._id})`);
    } else {
      console.log(`Reusing complaint [${cData.status}]: "${cData.title}" (ID: ${complaint._id})`);
    }
    manifest.complaints.push({ id: complaint._id.toString(), title: complaint.title, status: complaint.status });

    if (cData.key === 'resolved-dispenser') {
      resolvedDispenserComplaintId = complaint._id;
    }
  }

  // 4. COMPLAINT FEEDBACK (for resolved dispenser complaint)
  if (resolvedDispenserComplaintId) {
    let feedback = await ComplaintFeedback.findOne({ complaint: resolvedDispenserComplaintId });
    if (!feedback) {
      feedback = new ComplaintFeedback({
        complaint: resolvedDispenserComplaintId,
        student: students['rohan.verma@example.com']._id,
        department: ceDept ? ceDept._id : null,
        rating: 5,
        resolutionStatus: 'Yes',
        comment: 'Promptly repaired within 4 hours of reporting. Spill cleaned up completely. Great job!'
      });
      await feedback.save();

      // Update feedback reference on complaint
      await Complaint.findByIdAndUpdate(resolvedDispenserComplaintId, { feedback: feedback._id });
      console.log(`Created ComplaintFeedback: 5 stars (ID: ${feedback._id})`);
    } else {
      console.log(`Reusing ComplaintFeedback (ID: ${feedback._id})`);
    }
    manifest.feedbacks.push({ id: feedback._id.toString(), complaintId: resolvedDispenserComplaintId.toString(), rating: feedback.rating });
  }

  // 5. NOTICES (3 campus notices)
  console.log('\n[4/7] Preparing 3 Campus Notices...');
  const noticesData = [
    {
      title: 'Campus Central Library Extended Study Hours for Mid-Term Exams',
      description: 'In preparation for the upcoming mid-semester examinations, the Central Library reading halls on floors 1 and 2 will remain open 24/7 with active security badge access and Wi-Fi services starting this Wednesday.',
      postedBy: admin._id,
      targetAudience: 'All',
      priority: 'Important',
      expiryDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      isActive: true
    },
    {
      title: 'Annual Inter-College Cultural Fest 2026: Auditions Announced',
      description: 'Registrations and open audition slots are now open for music, dance, theater, and fine arts clubs. Interested students can contact their respective club coordinators in the student activity center.',
      postedBy: admin._id,
      targetAudience: 'Students',
      priority: 'Normal',
      expiryDate: new Date(Date.now() + 10 * 24 * 3600 * 1000),
      isActive: true
    },
    {
      title: 'Scheduled Campus Network Infrastructure Maintenance',
      description: 'Core fiber switch upgrades will be conducted this Saturday from 11:00 PM to 3:00 AM. Campus-wide Wi-Fi, LAN, and portal access may experience brief 10-minute intermittent downtime during this maintenance window.',
      postedBy: admin._id,
      targetAudience: 'All',
      priority: 'Urgent',
      expiryDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      isActive: true
    }
  ];

  for (const nData of noticesData) {
    let notice = await Notice.findOne({ title: nData.title });
    if (!notice) {
      notice = new Notice(nData);
      await notice.save();
      console.log(`Created notice [${nData.priority}]: "${nData.title}" (ID: ${notice._id})`);
    } else {
      console.log(`Reusing notice [${nData.priority}]: "${nData.title}" (ID: ${notice._id})`);
    }
    manifest.notices.push({ id: notice._id.toString(), title: notice.title, priority: notice.priority });
  }

  // 6. EVENTS (1 past, 2 upcoming)
  console.log('\n[5/7] Preparing Events, Registrations, and QR Attendance...');
  const eventsData = [
    {
      key: 'past-workshop',
      title: 'Campus Tech Orientation & Git Workshop',
      description: 'Hands-on masterclass on modern Git workflows, branch strategies, pull requests, and collaborative open-source development.',
      eventDate: new Date('2026-10-22T10:00:00.000Z'),
      eventTime: '10:00 AM - 01:00 PM',
      venue: 'Main Auditorium, Academic Block A',
      department: 'Computer Engineering',
      organizer: 'Campus Open Source Community',
      imageUrl: '',
      isActive: true,
      isRegistrationEnabled: true,
      maxParticipants: 100,
      registeredCount: 2
    },
    {
      key: 'upcoming-hackathon',
      title: 'CampusConnect Hackathon 2026: Code Innovations',
      description: '24-hour sprint to build AI-driven solutions for campus sustainability and smart governance. Exciting prizes, industry mentorship, and certification.',
      eventDate: new Date('2026-10-28T09:00:00.000Z'),
      eventTime: '09:00 AM - 05:00 PM',
      venue: 'Innovation Center & Central Computer Labs',
      department: 'Computer Engineering',
      organizer: 'Department of Computer Engineering & Tech Council',
      imageUrl: '',
      isActive: true,
      isRegistrationEnabled: true,
      maxParticipants: 60,
      registeredCount: 1
    },
    {
      key: 'upcoming-robotics',
      title: 'AI & Robotics Symposium: The Future of Automation',
      description: 'Distinguished faculty and keynote industry speakers present latest breakthroughs in computer vision, autonomous navigation, and agentic AI systems.',
      eventDate: new Date('2026-11-04T14:00:00.000Z'),
      eventTime: '02:00 PM - 05:30 PM',
      venue: 'Convention Hall C, Technology Tower',
      department: 'Information Technology',
      organizer: 'Robotics & AI Student Chapter',
      imageUrl: '',
      isActive: true,
      isRegistrationEnabled: true,
      maxParticipants: 150,
      registeredCount: 1
    }
  ];

  const createdEvents = {};
  for (const eData of eventsData) {
    let event = await Event.findOne({ title: eData.title });
    if (!event) {
      event = new Event(eData);
      await event.save();
      console.log(`Created event: "${eData.title}" (ID: ${event._id})`);
    } else {
      console.log(`Reusing event: "${eData.title}" (ID: ${event._id})`);
    }
    createdEvents[eData.key] = event;
    manifest.events.push({ id: event._id.toString(), title: event.title, date: event.eventDate });
  }

  // Registrations:
  // For Past Workshop: Aarav Sharma (Attended) & Diya Patel (Registered only, Absent)
  const workshopEvent = createdEvents['past-workshop'];
  let aaravWorkshopReg = await EventRegistration.findOne({ event: workshopEvent._id, student: students['aarav.sharma@example.com']._id });
  if (!aaravWorkshopReg) {
    aaravWorkshopReg = new EventRegistration({
      event: workshopEvent._id,
      student: students['aarav.sharma@example.com']._id,
      status: 'REGISTERED',
      registeredAt: new Date('2026-10-20T11:00:00.000Z')
    });
    await aaravWorkshopReg.save();
    console.log(`Registered Aarav Sharma for past workshop (Reg ID: ${aaravWorkshopReg._id})`);
  }
  manifest.registrations.push({ id: aaravWorkshopReg._id.toString(), event: 'Workshop', student: 'Aarav' });

  let diyaWorkshopReg = await EventRegistration.findOne({ event: workshopEvent._id, student: students['diya.patel@example.com']._id });
  if (!diyaWorkshopReg) {
    diyaWorkshopReg = new EventRegistration({
      event: workshopEvent._id,
      student: students['diya.patel@example.com']._id,
      status: 'REGISTERED',
      registeredAt: new Date('2026-10-21T14:30:00.000Z')
    });
    await diyaWorkshopReg.save();
    console.log(`Registered Diya Patel for past workshop (Reg ID: ${diyaWorkshopReg._id})`);
  }
  manifest.registrations.push({ id: diyaWorkshopReg._id.toString(), event: 'Workshop', student: 'Diya' });

  // QR Attendance Check-In for Aarav Sharma (Attended via QR scan)
  let aaravAttendance = await EventAttendance.findOne({ registration: aaravWorkshopReg._id });
  if (!aaravAttendance) {
    aaravAttendance = new EventAttendance({
      event: workshopEvent._id,
      registration: aaravWorkshopReg._id,
      student: students['aarav.sharma@example.com']._id,
      checkedIn: true,
      checkedInAt: new Date('2026-10-22T10:14:22.000Z'),
      checkedInBy: admin._id,
      checkInMethod: 'QR_SCAN'
    });
    await aaravAttendance.save();
    console.log(`Marked QR attendance check-in for Aarav Sharma (Attendance ID: ${aaravAttendance._id})`);
  } else {
    console.log(`Reusing QR attendance check-in for Aarav Sharma (Attendance ID: ${aaravAttendance._id})`);
  }
  manifest.attendances.push({ id: aaravAttendance._id.toString(), student: 'Aarav', event: 'Workshop' });

  // For Upcoming Hackathon: Diya Patel is registered. (Aarav and Rohan are UNREGISTERED, ready for live registration in demo!)
  const hackathonEvent = createdEvents['upcoming-hackathon'];
  let diyaHackathonReg = await EventRegistration.findOne({ event: hackathonEvent._id, student: students['diya.patel@example.com']._id });
  if (!diyaHackathonReg) {
    diyaHackathonReg = new EventRegistration({
      event: hackathonEvent._id,
      student: students['diya.patel@example.com']._id,
      status: 'REGISTERED',
      registeredAt: new Date('2026-10-25T16:00:00.000Z')
    });
    await diyaHackathonReg.save();
    console.log(`Registered Diya Patel for upcoming Hackathon (Reg ID: ${diyaHackathonReg._id})`);
  }
  manifest.registrations.push({ id: diyaHackathonReg._id.toString(), event: 'Hackathon', student: 'Diya' });

  // For Upcoming Robotics Symposium: Rohan Verma is registered.
  const roboticsEvent = createdEvents['upcoming-robotics'];
  let rohanRoboticsReg = await EventRegistration.findOne({ event: roboticsEvent._id, student: students['rohan.verma@example.com']._id });
  if (!rohanRoboticsReg) {
    rohanRoboticsReg = new EventRegistration({
      event: roboticsEvent._id,
      student: students['rohan.verma@example.com']._id,
      status: 'REGISTERED',
      registeredAt: new Date('2026-10-25T17:15:00.000Z')
    });
    await rohanRoboticsReg.save();
    console.log(`Registered Rohan Verma for Robotics Symposium (Reg ID: ${rohanRoboticsReg._id})`);
  }
  manifest.registrations.push({ id: rohanRoboticsReg._id.toString(), event: 'Robotics', student: 'Rohan' });

  // Synchronize registeredCount
  await Event.findByIdAndUpdate(workshopEvent._id, { registeredCount: 2 });
  await Event.findByIdAndUpdate(hackathonEvent._id, { registeredCount: 1 });
  await Event.findByIdAndUpdate(roboticsEvent._id, { registeredCount: 1 });

  // 7. LOST & FOUND (4 items, including a high-confidence matching pair)
  console.log('\n[6/7] Preparing 4 Lost & Found items...');
  const lostFoundData = [
    {
      key: 'lost-textbook',
      user: students['aarav.sharma@example.com']._id,
      type: 'Lost',
      itemName: 'Calculus: Early Transcendentals (Stewart 8th Edition)',
      description: 'Hardcover textbook with blue cover, has yellow highlighter notes on chapters 4 and 5, lost in 2nd floor reading section.',
      location: 'Central Library 2nd Floor',
      itemDate: new Date('2026-10-25T14:00:00.000Z'),
      contactInfo: 'aarav.sharma@example.com / +91 98765 00001',
      imageUrl: '',
      status: 'Open'
    },
    {
      key: 'found-textbook',
      user: students['diya.patel@example.com']._id,
      type: 'Found',
      itemName: 'Stewart Calculus 8th Edition Textbook',
      description: 'Found hardcover blue Stewart calculus book left on study desk 14 near the math section on 2nd floor.',
      location: 'Central Library 2nd Floor Reading Room',
      itemDate: new Date('2026-10-25T15:30:00.000Z'),
      contactInfo: 'Library Help Desk / libhelp@example.com',
      imageUrl: '',
      status: 'Open'
    },
    {
      key: 'lost-headphones',
      user: students['rohan.verma@example.com']._id,
      type: 'Lost',
      itemName: 'Boat Rockerz 450 Bluetooth Headphones',
      description: 'Matte black wireless on-ear headphones inside a black zippered mesh pouch. Misplaced near treadmill row.',
      location: 'Sports Complex Gymnasium',
      itemDate: new Date('2026-10-24T18:00:00.000Z'),
      contactInfo: 'rohan.verma@example.com / +91 98765 00003',
      imageUrl: '',
      status: 'Open'
    },
    {
      key: 'found-wallet',
      user: students['aarav.sharma@example.com']._id,
      type: 'Found',
      itemName: 'Brown Leather Wallet with Metro Smart Card',
      description: 'Wildhorn brown bi-fold leather wallet containing student metro pass card. Safely handed over to campus security.',
      location: 'Campus Central Cafeteria',
      itemDate: new Date('2026-10-23T13:10:00.000Z'),
      contactInfo: 'Security Office Main Gate / security@example.com',
      imageUrl: '',
      status: 'Claimed'
    }
  ];

  for (const lfData of lostFoundData) {
    let lf = await LostFound.findOne({ itemName: lfData.itemName, user: lfData.user });
    if (!lf) {
      lf = new LostFound(lfData);
      await lf.save();
      console.log(`Created Lost & Found [${lfData.type} - ${lfData.status}]: "${lfData.itemName}" (ID: ${lf._id})`);
    } else {
      console.log(`Reusing Lost & Found [${lfData.type} - ${lfData.status}]: "${lfData.itemName}" (ID: ${lf._id})`);
    }
    manifest.lostFound.push({ id: lf._id.toString(), type: lf.type, name: lf.itemName, status: lf.status });
  }

  // 8. NOTIFICATIONS (Realistic in-app notifications for demo users)
  console.log('\n[7/7] Preparing In-App Notifications for Demo Accounts...');
  const notifsData = [
    {
      recipient: admin._id,
      type: 'COMPLAINT_CREATED',
      title: 'New Complaint Submitted',
      message: 'New complaint "Broken Bench and Projector Socket in Seminar Hall B" requires review and department assignment.',
      link: '/admin/complaints'
    },
    {
      recipient: itDeptUser._id,
      type: 'COMPLAINT_ASSIGNED',
      title: 'New Complaint Assigned',
      message: 'Complaint "Wi-Fi Signal Drops Frequently in IT Block 3rd Floor Labs" has been assigned to Information Technology.',
      link: '/department/complaints'
    },
    {
      recipient: students['diya.patel@example.com']._id,
      type: 'COMPLAINT_STATUS',
      title: 'Complaint Update',
      message: 'Your complaint "Wi-Fi Signal Drops Frequently in IT Block 3rd Floor Labs" is now In Progress with IT Department.',
      link: '/student/complaints'
    },
    {
      recipient: students['diya.patel@example.com']._id,
      type: 'EVENT_REGISTRATION',
      title: 'Event Registration Confirmed',
      message: 'You have successfully registered for "CampusConnect Hackathon 2026: Code Innovations". View your pass in the portal.',
      link: '/student/events'
    },
    {
      recipient: students['aarav.sharma@example.com']._id,
      type: 'EVENT_ATTENDANCE',
      title: 'Attendance Confirmed',
      message: 'Your attendance was verified via QR Scan for "Campus Tech Orientation & Git Workshop".',
      link: '/student/events'
    },
    {
      recipient: students['aarav.sharma@example.com']._id,
      type: 'COMPLAINT_RESOLVED',
      title: 'Complaint Resolved',
      message: 'Your complaint "Air Conditioning Tripping Circuit Breaker in Computer Lab 1" has been resolved.',
      link: '/student/complaints'
    },
    {
      recipient: students['rohan.verma@example.com']._id,
      type: 'COMPLAINT_RESOLVED',
      title: 'Complaint Resolved',
      message: 'Your complaint "Water Dispenser Sensor Fault in Engineering Block B" has been resolved. Thank you for your feedback!',
      link: '/student/complaints'
    }
  ];

  for (const n of notifsData) {
    let notif = await Notification.findOne({ recipient: n.recipient, title: n.title, message: n.message });
    if (!notif) {
      notif = new Notification(n);
      await notif.save();
      console.log(`Created Notification: "${n.title}" for user ID ${n.recipient}`);
    } else {
      console.log(`Reusing Notification: "${n.title}" for user ID ${n.recipient}`);
    }
    manifest.notifications.push({ id: notif._id.toString(), recipient: n.recipient.toString(), title: n.title });
  }

  // Summary counts
  manifest.summary = {
    demoUsersAddedOrReused: manifest.users.length,
    complaints: manifest.complaints.length,
    feedbacks: manifest.feedbacks.length,
    notices: manifest.notices.length,
    events: manifest.events.length,
    registrations: manifest.registrations.length,
    attendances: manifest.attendances.length,
    lostFoundItems: manifest.lostFound.length,
    notifications: manifest.notifications.length
  };

  // Write manifest file to server/data/demo-manifest.json
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const manifestPath = path.join(dataDir, 'demo-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\nDemo Manifest successfully written to: ${manifestPath}`);

  console.log('\n--- SEED COMPLETED SUCCESSFULLY ---');
  console.log(JSON.stringify(manifest.summary, null, 2));

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed Error:', err);
  process.exit(1);
});
