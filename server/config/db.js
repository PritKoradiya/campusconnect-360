const dns = require('dns');
const mongoose = require('mongoose');
const repairStudentPassword = require('../utils/repairStudentPassword');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected Successfully');
    await repairStudentPassword();
  } catch (error) {
    console.error(`MongoDB Connection Failed: ${error.message}`);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
