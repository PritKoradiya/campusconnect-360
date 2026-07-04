const mongoose = require('mongoose');
const LostFound = require('../models/LostFound');

const allowedTypes = ['Lost', 'Found'];
const allowedStatuses = ['Open', 'Claimed', 'Closed'];

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const isOwnerOrAdmin = (user, item) => {
  return user.role === 'admin' || item.user.toString() === user._id.toString();
};

const populateUserFields = (query) => {
  return query.populate('user', 'name email enrollmentNo role');
};

const createLostFoundItem = async (req, res) => {
  try {
    const { type, itemName, description, location, itemDate, contactInfo, imageUrl } = req.body;

    if (!type || !itemName || !description || !location || !itemDate || !contactInfo) {
      return res.status(400).json({
        success: false,
        message: 'Type, itemName, description, location, itemDate, and contactInfo are required'
      });
    }

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be Lost or Found'
      });
    }

    const item = await LostFound.create({
      user: req.user._id,
      type,
      itemName,
      description,
      location,
      itemDate,
      contactInfo,
      imageUrl: imageUrl || '',
      status: 'Open'
    });

    return res.status(201).json({
      success: true,
      message: 'Lost/found item created successfully',
      item
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not create lost/found item',
      error: error.message
    });
  }
};

const getAllActiveLostFoundItems = async (req, res) => {
  try {
    const items = await populateUserFields(
      LostFound.find({ status: { $ne: 'Closed' } }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      message: 'Active lost/found items fetched successfully',
      count: items.length,
      items
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch lost/found items',
      error: error.message
    });
  }
};

const getMyLostFoundItems = async (req, res) => {
  try {
    const items = await LostFound.find({ user: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'My lost/found items fetched successfully',
      count: items.length,
      items
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch my lost/found items',
      error: error.message
    });
  }
};

const getLostFoundItemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lost/found item id'
      });
    }

    const item = await populateUserFields(LostFound.findById(id));

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Lost/found item not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lost/found item fetched successfully',
      item
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch lost/found item',
      error: error.message
    });
  }
};

const updateLostFoundItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, itemName, description, location, itemDate, contactInfo, imageUrl } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lost/found item id'
      });
    }

    if (type !== undefined && !allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be Lost or Found'
      });
    }

    const item = await LostFound.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Lost/found item not found'
      });
    }

    if (!isOwnerOrAdmin(req.user, item)) {
      return res.status(403).json({
        success: false,
        message: 'You can update only your own item'
      });
    }

    if (type !== undefined) item.type = type;
    if (itemName !== undefined) item.itemName = itemName;
    if (description !== undefined) item.description = description;
    if (location !== undefined) item.location = location;
    if (itemDate !== undefined) item.itemDate = itemDate;
    if (contactInfo !== undefined) item.contactInfo = contactInfo;
    if (imageUrl !== undefined) item.imageUrl = imageUrl;

    const updatedItem = await item.save();
    await updatedItem.populate('user', 'name email enrollmentNo role');

    return res.status(200).json({
      success: true,
      message: 'Lost/found item updated successfully',
      item: updatedItem
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not update lost/found item',
      error: error.message
    });
  }
};

const updateLostFoundStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lost/found item id'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Open, Claimed, or Closed'
      });
    }

    const item = await LostFound.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Lost/found item not found'
      });
    }

    if (!isOwnerOrAdmin(req.user, item)) {
      return res.status(403).json({
        success: false,
        message: 'You can update only your own item status'
      });
    }

    item.status = status;

    const updatedItem = await item.save();
    await updatedItem.populate('user', 'name email enrollmentNo role');

    return res.status(200).json({
      success: true,
      message: 'Lost/found item status updated successfully',
      item: updatedItem
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not update lost/found item status',
      error: error.message
    });
  }
};

const closeLostFoundItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lost/found item id'
      });
    }

    const item = await LostFound.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Lost/found item not found'
      });
    }

    if (!isOwnerOrAdmin(req.user, item)) {
      return res.status(403).json({
        success: false,
        message: 'You can close only your own item'
      });
    }

    item.status = 'Closed';
    await item.save();

    return res.status(200).json({
      success: true,
      message: 'Lost/found item closed successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not close lost/found item',
      error: error.message
    });
  }
};

module.exports = {
  createLostFoundItem,
  getAllActiveLostFoundItems,
  getMyLostFoundItems,
  getLostFoundItemById,
  updateLostFoundItem,
  updateLostFoundStatus,
  closeLostFoundItem
};
