const express = require('express');
const router = express.Router();
const {
    createSymptomReport,
    getSymptomReports,
    updateSymptomReportStatus
} = require('../controllers/symptomReportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createSymptomReport)
    .get(protect, getSymptomReports);

router.route('/:id/status')
    .put(protect, authorize('admin', 'doctor'), updateSymptomReportStatus);

module.exports = router;
