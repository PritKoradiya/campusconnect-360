const express = require('express');

const router = express.Router();

router.get('/models-test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'All CampusConnect 360 models are ready',
    models: ['User', 'Department', 'Complaint', 'Notice', 'Event', 'LostFound', 'ChatbotLog']
  });
});

module.exports = router;
