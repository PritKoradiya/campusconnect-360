const { getGeminiClient, GEMINI_MODEL, MAX_OUTPUT_TOKENS, isGeminiConfigured } = require('../config/aiConfig');
const {
  getMyComplaints,
  getMyRegistrations,
  getMyAttendance,
  getUpcomingEvents,
  getMyLostFound,
  getMyProfile,
  getMyNotifications
} = require('./campusContextService');

/**
 * Lightweight intent detection for campus data routing.
 * Checks for campus-specific intents, mixed intents, or general queries.
 */
const detectIntents = (question) => {
  const q = question.toLowerCase();
  const intents = [];

  // Check for cross-student / unauthorized inquiry attempts
  const isCrossStudentQuery =
    (q.includes('other student') ||
      q.includes("another student") ||
      q.includes("someone else's") ||
      q.includes("student b") ||
      q.includes("other's complaint") ||
      q.includes("other user")) &&
    !q.includes('my');

  // Complaints
  if (
    q.includes('complaint') ||
    q.includes('complaints') ||
    q.includes('complain') ||
    q.includes('grievance') ||
    q.includes('ticket') ||
    q.includes('fariyad') ||
    q.includes('unresolved')
  ) {
    intents.push('complaints');
  }

  // Event Registrations
  if (
    q.includes('my event') ||
    q.includes('my events') ||
    q.includes('registered event') ||
    q.includes('registered for') ||
    q.includes('my registration') ||
    q.includes('my registrations')
  ) {
    intents.push('registrations');
  }

  // Event Attendance
  if (
    q.includes('attendance') ||
    q.includes('attended') ||
    q.includes('hazari') ||
    q.includes('checkin') ||
    q.includes('checked in')
  ) {
    intents.push('attendance');
  }

  // Upcoming College Events
  if (
    q.includes('upcoming event') ||
    q.includes('upcoming events') ||
    q.includes('next event') ||
    q.includes('college events') ||
    q.includes('events coming up') ||
    q.includes('which events') ||
    (q.includes('events') && !intents.includes('registrations') && !intents.includes('attendance'))
  ) {
    intents.push('upcoming_events');
  }

  // Lost & Found
  if (
    q.includes('lost') ||
    q.includes('found') ||
    q.includes('lost & found') ||
    q.includes('lost and found') ||
    q.includes('kho gaya') ||
    q.includes('khoi')
  ) {
    intents.push('lost_found');
  }

  // Profile Information
  if (
    q.includes('my profile') ||
    q.includes('profile info') ||
    q.includes('profile information') ||
    q.includes('my details') ||
    q.includes('who am i') ||
    q.includes('my enrollment') ||
    q.includes('my branch') ||
    q.includes('my semester')
  ) {
    intents.push('profile');
  }

  // Notifications
  if (
    q.includes('notification') ||
    q.includes('notifications') ||
    q.includes('alert') ||
    q.includes('alerts') ||
    q.includes('unread')
  ) {
    intents.push('notifications');
  }

  return {
    intents,
    isCampusSpecific: intents.length > 0,
    isCrossStudentQuery
  };
};

/**
 * Fetch structured context based on detected intents.
 * Strictly uses authenticated user ID.
 */
const gatherCampusContext = async (intents, user) => {
  const contextData = {};
  const userId = user._id;

  if (intents.includes('complaints')) {
    contextData.complaints = await getMyComplaints(userId);
  }
  if (intents.includes('registrations')) {
    contextData.registrations = await getMyRegistrations(userId);
  }
  if (intents.includes('attendance')) {
    contextData.attendance = await getMyAttendance(userId);
  }
  if (intents.includes('upcoming_events')) {
    contextData.upcomingEvents = await getUpcomingEvents();
  }
  if (intents.includes('lost_found')) {
    contextData.lostFound = await getMyLostFound(userId);
  }
  if (intents.includes('profile')) {
    contextData.profile = getMyProfile(user);
  }
  if (intents.includes('notifications')) {
    contextData.notifications = await getMyNotifications(userId);
  }

  return contextData;
};

/**
 * Format fallback response when Gemini API key is not yet configured.
 * Guarantees zero downtime for real campus data retrieval.
 */
const buildLocalCampusResponse = (question, contextData, user) => {
  const parts = [];

  if (contextData.complaints) {
    const c = contextData.complaints;
    const s = c.summary;
    parts.push(
      `You currently have ${s.total} total complaint(s): ${s.pending} Pending, ${s.inProgress} In Progress, ${s.resolved} Resolved, ${s.rejected} Rejected.`
    );
    if (c.items.length > 0) {
      parts.push(
        '\nYour recent complaints:\n' +
          c.items
            .map(
              (item, i) =>
                `${i + 1}. **${item.title}** (${item.status}, ${item.priority} Priority, Dept: ${item.department})`
            )
            .join('\n')
      );
    }
  }

  if (contextData.registrations) {
    const r = contextData.registrations;
    parts.push(`You are registered for ${r.totalRegistered} event(s).`);
    if (r.items.length > 0) {
      parts.push(
        '\nYour registered events:\n' +
          r.items
            .map(
              (e, i) =>
                `${i + 1}. **${e.eventTitle}** on ${e.eventDate} at ${e.eventTime} (${e.venue})`
            )
            .join('\n')
      );
    }
  }

  if (contextData.attendance) {
    const a = contextData.attendance;
    parts.push(`You have attended ${a.totalAttended} event(s).`);
    if (a.items.length > 0) {
      parts.push(
        '\nEvents attended:\n' +
          a.items
            .map((e, i) => `${i + 1}. **${e.eventTitle}** (${e.eventDate} at ${e.venue})`)
            .join('\n')
      );
    }
  }

  if (contextData.upcomingEvents) {
    const u = contextData.upcomingEvents;
    parts.push(`There are ${u.totalUpcoming} upcoming campus event(s).`);
    if (u.items.length > 0) {
      parts.push(
        '\nUpcoming events:\n' +
          u.items
            .map(
              (e, i) =>
                `${i + 1}. **${e.title}** on ${e.eventDate} at ${e.eventTime} (${e.venue})`
            )
            .join('\n')
      );
    }
  }

  if (contextData.lostFound) {
    const lf = contextData.lostFound;
    parts.push(
      `You have ${lf.summary.total} Lost & Found report(s) (${lf.summary.lost} Lost, ${lf.summary.found} Found, ${lf.summary.open} Open).`
    );
    if (lf.items.length > 0) {
      parts.push(
        '\nYour reports:\n' +
          lf.items
            .map((item, i) => `${i + 1}. [${item.type}] **${item.itemName}** - Status: ${item.status}`)
            .join('\n')
      );
    }
  }

  if (contextData.profile) {
    const p = contextData.profile.studentInfo;
    parts.push(
      `Here is your profile information:\n- **Name:** ${p.name}\n- **Enrollment No:** ${p.enrollmentNo}\n- **Email:** ${p.email}\n- **Branch:** ${p.branch}\n- **Semester:** ${p.semester}\n- **Department:** ${p.department || 'N/A'}`
    );
  }

  if (parts.length > 0) {
    return parts.join('\n\n');
  }

  return "I am the AI Campus Assistant. To enable general open-domain intelligence (such as answering programming, computer science, or general questions), please configure `GEMINI_API_KEY` in the server environment. For now, you can ask about your complaints, events, attendance, lost & found, and profile.";
};

/**
 * System prompt definition for Gemini.
 */
const buildSystemInstruction = (user, isCrossStudentQuery) => {
  return `You are "AI Campus Assistant", the intelligent general-purpose and campus AI assistant for CampusConnect 360.

CORE RESPONSIBILITIES:
1. GENERAL AI ASSISTANT:
   - Expertly answer all standard questions (programming, coding in C/JS/Python/etc., data structures, web development, React, REST APIs, computer science concepts, exam preparation, and general knowledge).
   - Write clean, well-formatted code snippets using markdown code blocks.
   - Keep answers clear, accurate, and reasonably concise.

2. CAMPUS-AWARE ASSISTANT:
   - When campus context data is provided below, use it to accurately answer questions about the student's complaints, events, registrations, attendance, lost & found, and profile.
   - You only have access to the authenticated student's private data (${user.name || 'Student'}, Enrollment: ${user.enrollmentNo || 'N/A'}).
   - NEVER fabricate or guess campus data. If context indicates 0 items or no data found, state that accurately.
   - DO NOT expose internal database IDs (like MongoDB _id or raw ObjectIds).
   - CRITICAL PRIVACY & SECURITY: If the user asks for another student's complaints, attendance, or private details (e.g. "show student B's complaints"), refuse politely and explain that all student records are strictly private and protected.

3. MULTI-LANGUAGE SUPPORT:
   - Support English, Gujarati, and Gujarati-English mix (e.g. "mari ketli complaint pending che?").
   - Respond naturally in the language or mix the student is communicating in.

4. REAL-TIME / LIVE KNOWLEDGE LIMITATION:
   - If asked about today's live external news, stock prices, or live sports scores, clearly state that you do not have live web browsing capability.`;
};

/**
 * Generate AI response using Gemini SDK with context & conversation history.
 */
const generateAssistantResponse = async ({ question, user, recentHistory = [] }) => {
  const { intents, isCampusSpecific, isCrossStudentQuery } = detectIntents(question);

  let campusContext = null;
  if (isCampusSpecific) {
    campusContext = await gatherCampusContext(intents, user);
  }

  // Check if Gemini API is configured
  if (!isGeminiConfigured()) {
    // If not configured, use safe local context fallback for campus questions
    if (isCampusSpecific && campusContext && Object.keys(campusContext).length > 0) {
      return {
        answer: buildLocalCampusResponse(question, campusContext, user),
        intent: intents.join('_') || 'campus_info'
      };
    }

    return {
      answer:
        "AI Campus Assistant is ready. To enable general AI answers with Gemini, please set `GEMINI_API_KEY` in the backend `.env` file. You can still ask campus questions like 'my complaints', 'my registrations', 'my attendance', or 'my profile'.",
      intent: 'general_help'
    };
  }

  const aiClient = getGeminiClient();
  const systemInstruction = buildSystemInstruction(user, isCrossStudentQuery);

  // Construct prompt with structured campus context if available
  let promptText = question;
  if (campusContext && Object.keys(campusContext).length > 0) {
    promptText = `[CAMPUS CONTEXT FOR AUTHENTICATED STUDENT ${user.name} (${user.enrollmentNo || 'No Enrollment'})]:\n${JSON.stringify(
      campusContext,
      null,
      2
    )}\n\n[STUDENT QUESTION]:\n${question}`;
  } else if (isCrossStudentQuery) {
    promptText = `[SECURITY NOTICE: The user may be asking for another student's private data. Only data for ${user.name} is accessible.]\n\n[STUDENT QUESTION]:\n${question}`;
  }

  // Build conversation contents including recent history window (max 6 turns to keep tokens bounded)
  const contents = [];
  const historyWindow = recentHistory.slice(-6);

  historyWindow.forEach((turn) => {
    if (turn.question) {
      contents.push({
        role: 'user',
        parts: [{ text: turn.question }]
      });
    }
    if (turn.answer) {
      contents.push({
        role: 'model',
        parts: [{ text: turn.answer }]
      });
    }
  });

  // Append current turn
  contents.push({
    role: 'user',
    parts: [{ text: promptText }]
  });

  try {
    const response = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.7
      }
    });

    const answer = response.text ? response.text.trim() : "I'm sorry, I could not generate an answer.";

    return {
      answer,
      intent: intents.length > 0 ? intents.join('_') : 'general_ai'
    };
  } catch (error) {
    console.error('Gemini API Error:', error.message || error);

    // Handle 429 quota/rate limit error gracefully
    if (error.status === 429 || (error.message && error.message.includes('429')) || (error.message && error.message.includes('RESOURCE_EXHAUSTED'))) {
      return {
        answer: 'AI usage limit reached. Please try again later.',
        intent: 'rate_limited'
      };
    }

    // Model not found fallback (e.g. if custom GEMINI_MODEL name is unrecognized)
    if (error.status === 404 || (error.message && error.message.includes('not found'))) {
      try {
        console.warn(`Model ${GEMINI_MODEL} not found, falling back to gemini-2.5-flash...`);
        const fallbackResponse = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.7
          }
        });
        return {
          answer: fallbackResponse.text ? fallbackResponse.text.trim() : "I'm sorry, I could not generate an answer.",
          intent: intents.length > 0 ? intents.join('_') : 'general_ai'
        };
      } catch (fallbackError) {
        console.error('Fallback Model Error:', fallbackError.message);
      }
    }

    // If API call failed but we have campus context, fall back to safe campus response
    if (isCampusSpecific && campusContext && Object.keys(campusContext).length > 0) {
      return {
        answer: buildLocalCampusResponse(question, campusContext, user),
        intent: intents.join('_') || 'campus_info'
      };
    }

    // Generic friendly error without exposing raw backend dumps
    return {
      answer: 'Sorry, the AI service is momentarily unavailable. Please try again in a few moments.',
      intent: 'error'
    };
  }
};

module.exports = {
  detectIntents,
  gatherCampusContext,
  generateAssistantResponse
};
