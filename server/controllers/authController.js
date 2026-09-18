const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const sendUserResponse = (res, statusCode, user, message) => {
  const token = createToken(user._id);

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      name: user.name,
      enrollmentNo: user.enrollmentNo,
      email: user.email,
      role: user.role,
      branch: user.branch,
      semester: user.semester,
      department: user.department,
      phone: user.phone,
      profileImage: user.profileImage,
      isActive: user.isActive
    }
  });
};

const registerUser = async (req, res) => {
  try {
    const {
      name,
      enrollmentNo,
      email,
      password,
      role = 'student',
      branch,
      semester,
      department,
      phone
    } = req.body;

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    const allowedRoles = ['student', 'admin', 'department'];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be student, admin, or department'
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: typeof name === 'string' ? name.trim() : name,
      enrollmentNo: typeof enrollmentNo === 'string' ? enrollmentNo.trim() : enrollmentNo,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      branch,
      semester,
      department,
      phone
    });

    return sendUserResponse(res, 201, user, 'User registered successfully');
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail && !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (role && user.role.toLowerCase() !== role.trim().toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isPasswordMatch = user.matchPassword
      ? await user.matchPassword(password)
      : await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    return sendUserResponse(res, 200, user, 'User logged in successfully');
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Current user fetched successfully',
      user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch current user',
      error: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser
};
