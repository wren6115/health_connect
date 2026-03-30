const express = require('express');
const router = express.Router();
const { respondToAlert, getPatientFeedback } = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Patient responds "yes" or "no" to an alert prompt
router.post('/respond', protect, respondToAlert);

// Doctor/Admin views a patient's feedback history
router.get('/:patientUserId', protect, authorize('doctor', 'admin'), getPatientFeedback);

module.exports = router;
