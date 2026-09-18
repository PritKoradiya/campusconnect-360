const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const repairStudentPassword = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campusconnect360';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const User = require('../models/User');
    const student = await User.findOne({ email: 'student@gmail.com' });

    if (!student) {
      console.log('Student user student@gmail.com not found.');
      return;
    }

    // Check if password is already a valid bcrypt hash ($2a$, $2b$, $2y$)
    if (/^\$2[aby]\$\d{2}\$/.test(student.password)) {
      console.log('Student password is already securely hashed with bcrypt.');
      return;
    }

    // Hash the plain text password securely with bcrypt
    const hashedPassword = await bcrypt.hash(student.password, 10);
    student.password = hashedPassword;
    await student.save();

    console.log('Student password has been securely hashed with bcrypt.');
  } catch (error) {
    console.error('Failed to update student password:', error.message);
  } finally {
    if (require.main === module && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

if (require.main === module) {
  repairStudentPassword();
}

module.exports = repairStudentPassword;
