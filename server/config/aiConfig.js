const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const { GoogleGenAI } = require('@google/genai');

const getGeminiApiKey = () => (process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '');
// Default to gemini-2.5-flash which is widely supported; can be overridden via GEMINI_MODEL
const getGeminiModel = () => (process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.trim() : 'gemini-2.5-flash');

let geminiClient = null;

const getGeminiClient = () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
};

const isGeminiConfigured = () => {
  const apiKey = getGeminiApiKey();
  return Boolean(apiKey && apiKey !== '');
};

module.exports = {
  get GEMINI_API_KEY() {
    return getGeminiApiKey();
  },
  get GEMINI_MODEL() {
    return getGeminiModel();
  },
  MAX_OUTPUT_TOKENS: 1024,
  getGeminiClient,
  isGeminiConfigured,
  getGeminiModel
};
