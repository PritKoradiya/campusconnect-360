const mongoose = require('mongoose');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const LostFound = require('../models/LostFound');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/users - Fetch all users with safe fields (Admin only)
const getUsers = async (req, res) => {
  try {
    const { role, department, status, search } = req.query;
    const filter = {};

    if (role && role !== 'All') {
      filter.role = role.toLowerCase();
    }

    if (department && department !== 'All') {
      filter.department = department;
    }

    if (status && status !== 'All') {
      filter.isActive = status === 'Active' || status === 'true';
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { enrollmentNo: searchRegex },
        { department: searchRegex }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      count: users.length,
      users
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch users',
      error: error.message
    });
  }
};

// GET /api/users/:id - Fetch single user details (Admin only)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id'
      });
    }

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User details fetched successfully',
      user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch user details',
      error: error.message
    });
  }
};

// PUT /api/users/:id/status - Toggle user active status (Admin only)
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id'
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive boolean field is required'
      });
    }

    // Safety check: prevent currently logged in admin from deactivating their own account
    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id;
    if (currentUserId === id.toString() && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive;
    const updatedUser = await user.save();

    const safeUser = updatedUser.toObject();
    delete safeUser.password;

    return res.status(200).json({
      success: true,
      message: `User status updated to ${isActive ? 'active' : 'inactive'} successfully`,
      user: safeUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not update user status',
      error: error.message
    });
  }
};

// DELETE /api/users/:id - Delete a user safely (Admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id'
      });
    }

    // Safety check: prevent currently logged in admin from deleting their own account
    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id;
    if (currentUserId === id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Safe deletion checks: ensure no active dependent records exist
    const complaintCount = await Complaint.countDocuments({ student: id });
    if (complaintCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete user: This user has ${complaintCount} associated complaint(s). Consider deactivating the account instead.`
      });
    }

    const lostFoundCount = await LostFound.countDocuments({ user: id });
    if (lostFoundCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete user: This user has ${lostFoundCount} associated lost & found item(s). Consider deactivating the account instead.`
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not delete user',
      error: error.message
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser
};
