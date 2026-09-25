const ChatbotLog = require('../models/ChatbotLog');
const { generateAssistantResponse } = require('../services/aiService');
const { checkAiRateLimit } = require('../utils/aiRateLimiter');

/**
 * Handle student AI assistant query.
 * Accepts general programming/academic questions and authenticated campus queries.
 */
const askChatbot = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    const trimmedQuestion = question.trim();

    // 1. Enforce per-user sliding-window rate limit for Gemini API protection
    const rateCheck = checkAiRateLimit(req.user._id.toString());
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: rateCheck.message,
        retryAfterSeconds: rateCheck.retryAfterSeconds
      });
    }

    // 2. Fetch recent conversation history for multi-turn context (last 6 logs)
    const recentLogs = await ChatbotLog.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    // Reverse to chronological order (oldest to newest)
    const recentHistory = recentLogs.reverse().map((log) => ({
      question: log.question,
      answer: log.answer
    }));

    // 3. Generate response using Gemini / Campus context layer
    const { answer, intent } = await generateAssistantResponse({
      question: trimmedQuestion,
      user: req.user,
      recentHistory
    });

    // 4. Save to persistent ChatbotLog
    const chatLog = await ChatbotLog.create({
      user: req.user._id,
      question: trimmedQuestion,
      answer,
      intent
    });

    return res.status(200).json({
      success: true,
      message: 'Chatbot answer generated successfully',
      answer,
      intent,
      chatLog
    });
  } catch (error) {
    console.error('Error in askChatbot:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not generate chatbot answer',
      error: error.message
    });
  }
};

const getChatbotHistory = async (req, res) => {
  try {
    const history = await ChatbotLog.find({ user: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Chatbot history fetched successfully',
      count: history.length,
      history
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch chatbot history',
      error: error.message
    });
  }
};

const deleteChatbotHistory = async (req, res) => {
  try {
    const result = await ChatbotLog.deleteMany({ user: req.user._id });

    return res.status(200).json({
      success: true,
      message: 'Chatbot history deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not delete chatbot history',
      error: error.message
    });
  }
};

module.exports = {
  askChatbot,
  getChatbotHistory,
  deleteChatbotHistory
};
