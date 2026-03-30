const express = require('express');
const router = express.Router();

// In-memory storage for contact submissions
let contactSubmissions = [];
let submissionIdCounter = 1;

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post('/', (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide all required fields (name, email, subject, message)'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide a valid email address'
            });
        }

        const newSubmission = {
            id: submissionIdCounter++,
            name,
            email,
            phone: phone || null,
            subject,
            message,
            status: 'pending',
            createdAt: new Date().toISOString(),
            respondedAt: null
        };

        contactSubmissions.push(newSubmission);

        // In production, you would:
        // 1. Send email notification to admin
        // 2. Send confirmation email to user
        // 3. Store in database

        res.status(201).json({
            status: 'success',
            message: 'Thank you for contacting us! We will get back to you soon.',
            data: {
                id: newSubmission.id,
                createdAt: newSubmission.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// @route   GET /api/contact
// @desc    Get all contact submissions (admin only in production)
// @access  Public (should be protected in production)
router.get('/', (req, res) => {
    try {
        const { status, email } = req.query;

        let filteredSubmissions = [...contactSubmissions];

        if (status) {
            filteredSubmissions = filteredSubmissions.filter(
                sub => sub.status === status
            );
        }

        if (email) {
            filteredSubmissions = filteredSubmissions.filter(
                sub => sub.email === email
            );
        }

        res.status(200).json({
            status: 'success',
            results: filteredSubmissions.length,
            data: filteredSubmissions
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// @route   GET /api/contact/:id
// @desc    Get single contact submission
// @access  Public (should be protected in production)
router.get('/:id', (req, res) => {
    try {
        const submission = contactSubmissions.find(sub => sub.id === parseInt(req.params.id));

        if (!submission) {
            return res.status(404).json({
                status: 'error',
                message: 'Contact submission not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: submission
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// @route   PATCH /api/contact/:id
// @desc    Update contact submission status (admin only in production)
// @access  Public (should be protected in production)
router.patch('/:id', (req, res) => {
    try {
        const { status, response } = req.body;
        const submissionIndex = contactSubmissions.findIndex(sub => sub.id === parseInt(req.params.id));

        if (submissionIndex === -1) {
            return res.status(404).json({
                status: 'error',
                message: 'Contact submission not found'
            });
        }

        const validStatuses = ['pending', 'in-progress', 'resolved'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid status'
            });
        }

        contactSubmissions[submissionIndex] = {
            ...contactSubmissions[submissionIndex],
            status: status || contactSubmissions[submissionIndex].status,
            response: response || contactSubmissions[submissionIndex].response,
            respondedAt: status === 'resolved' ? new Date().toISOString() : contactSubmissions[submissionIndex].respondedAt
        };

        res.status(200).json({
            status: 'success',
            message: 'Contact submission updated',
            data: contactSubmissions[submissionIndex]
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

module.exports = router;
