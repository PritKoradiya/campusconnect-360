const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const modelRoutes = require('./routes/modelRoutes');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());
app.use('/api', modelRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CampusConnect 360 API is running'
  });
});

app.get('/api/db-test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Database connection route working',
    database: 'campusconnect360'
  });
});

app.listen(PORT, () => {
  console.log(`CampusConnect 360 API running on port ${PORT}`);
});
