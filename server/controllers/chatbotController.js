const ChatbotLog = require('../models/ChatbotLog');

const getChatbotReply = (question) => {
  const lowerQuestion = question.toLowerCase();

  // Real Gemini API integration can be added later using GEMINI_API_KEY.
  if (
    lowerQuestion.includes('track') ||
    lowerQuestion.includes('tracking') ||
    lowerQuestion.includes('status') ||
    lowerQuestion.includes('progress') ||
    lowerQuestion.includes('update') ||
    lowerQuestion.includes('complaint status') ||
    lowerQuestion.includes('my complaint')
  ) {
    return {
      intent: 'complaint_tracking',
      answer:
        'You can track your complaint status from the My Complaints page in your Student Dashboard. There you can see whether your complaint is Pending, In Progress, Resolved, or Rejected.'
    };
  }

  if (
    lowerQuestion.includes('complaint') ||
    lowerQuestion.includes('issue') ||
    lowerQuestion.includes('problem') ||
    lowerQuestion.includes('raise complaint') ||
    lowerQuestion.includes('submit complaint') ||
    lowerQuestion.includes('report issue')
  ) {
    return {
      intent: 'complaint_help',
      answer:
        'You can submit a complaint from the Student Dashboard by opening the Submit Complaint section and filling in the complaint details.'
    };
  }

  if (
    lowerQuestion.includes('notice') ||
    lowerQuestion.includes('notices') ||
    lowerQuestion.includes('announcement') ||
    lowerQuestion.includes('announcements')
  ) {
    return {
      intent: 'notice_help',
      answer: 'You can view college notices and announcements from the Notices section in your dashboard.'
    };
  }

  if (
    lowerQuestion.includes('event') ||
    lowerQuestion.includes('events') ||
    lowerQuestion.includes('workshop') ||
    lowerQuestion.includes('seminar')
  ) {
    return {
      intent: 'event_help',
      answer: 'You can check upcoming college events from the Events section in your dashboard.'
    };
  }

  if (
    lowerQuestion.includes('lost') ||
    lowerQuestion.includes('found') ||
    lowerQuestion.includes('item') ||
    lowerQuestion.includes('lost item') ||
    lowerQuestion.includes('found item')
  ) {
    return {
      intent: 'lost_found_help',
      answer:
        'You can report or search lost and found items from the Lost and Found section in your dashboard.'
    };
  }

  return {
    intent: 'general_help',
    answer:
      'CampusConnect 360 can help you with complaints, complaint tracking, notices, events, lost and found items, and student support.'
  };
};

const askChatbot = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    const { answer, intent } = getChatbotReply(question);

    const chatLog = await ChatbotLog.create({
      user: req.user._id,
      question,
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
