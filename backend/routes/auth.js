const express = require('express');
const router = express.Router();
const { loginUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Login route — works for all roles (patient, doctor, admin)
router.post('/login', loginUser);

module.exports = router;
