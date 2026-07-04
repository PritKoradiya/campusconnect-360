const ChatbotLog = require('../models/ChatbotLog');

const getChatbotReply = (question) => {
  const lowerQuestion = question.toLowerCase();

  // Real Gemini API integration can be added later using GEMINI_API_KEY.
  if (
    lowerQuestion.includes('complaint') ||
    lowerQuestion.includes('issue') ||
    lowerQuestion.includes('problem')
  ) {
    return {
      intent: 'complaint_help',
      answer:
        'You can submit a complaint from the Student Dashboard by opening the Complaint section and filling in the complaint details.'
    };
  }

  if (lowerQuestion.includes('status') || lowerQuestion.includes('track')) {
    return {
      intent: 'complaint_tracking',
      answer:
        'You can check your complaint status from the My Complaints page. It shows whether your complaint is Pending, In Progress, Resolved, or Rejected.'
    };
  }

  if (lowerQuestion.includes('notice') || lowerQuestion.includes('announcement')) {
    return {
      intent: 'notice_help',
      answer:
        'You can view college notices and announcements from the Notices page. Important and urgent notices will be shown there.'
    };
  }

  if (lowerQuestion.includes('event')) {
    return {
      intent: 'event_help',
      answer:
        'You can check upcoming campus events from the Events page, including event date, time, venue, and organizer details.'
    };
  }

  if (lowerQuestion.includes('lost') || lowerQuestion.includes('found')) {
    return {
      intent: 'lost_found_help',
      answer:
        'You can use the Lost and Found page to report a lost item, post a found item, or check active lost/found listings.'
    };
  }

  return {
    intent: 'general_help',
    answer:
      'I can help you with complaints, complaint tracking, notices, events, and lost and found support on CampusConnect 360.'
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
