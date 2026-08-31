import api from './api';

export const askChatbot = (question) => {
  return api.post('/chatbot/ask', {
    question
  });
};

export const getChatbotHistory = () => {
  return api.get('/chatbot/history');
};

export const deleteChatbotHistory = () => {
  return api.delete('/chatbot/history');
};
