const express = require('express');
const {
  askChatbot,
  getChatbotHistory,
  deleteChatbotHistory
} = require('../controllers/chatbotController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/ask', protect, askChatbot);
router.get('/history', protect, getChatbotHistory);
router.delete('/history', protect, deleteChatbotHistory);

module.exports = router;
