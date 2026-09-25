const dotenv = require('dotenv');
dotenv.config();

const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
// Default to gemini-2.5-flash which is widely supported; can be overridden via GEMINI_MODEL
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let geminiClient = null;

const getGeminiClient = () => {
  if (!GEMINI_API_KEY) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return geminiClient;
};

const isGeminiConfigured = () => {
  return Boolean(GEMINI_API_KEY && GEMINI_API_KEY.trim() !== '');
};

module.exports = {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  MAX_OUTPUT_TOKENS: 1024,
  getGeminiClient,
  isGeminiConfigured
};
