const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   GET /api/transactions
// @desc    Get transactions (role-based)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'doctor') query.doctor = req.user._id;
        else if (req.user.role === 'patient') query.patient = req.user._id;
        // admin sees all

        const transactions = await Transaction.find(query)
            .populate('patient', 'name email')
            .populate('doctor', 'name email')
            .populate('appointment', 'date reason status')
            .sort({ createdAt: -1 });

        res.json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/transactions/stats
// @desc    Get revenue stats (Admin only)
// @access  Private/Admin
router.get('/stats', protect, authorize('admin'), async (req, res) => {
    try {
        const all = await Transaction.find({ status: 'success' });
        const totalRevenue = all.reduce((sum, t) => sum + t.amount, 0);
        const platformRevenue = all.reduce((sum, t) => sum + t.platformFee, 0);
        const doctorPayouts = all.reduce((sum, t) => sum + t.doctorEarning, 0);

        res.json({ totalRevenue, platformRevenue, doctorPayouts, transactionCount: all.length });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/transactions/my-earnings
// @desc    Get doctor's earnings summary
// @access  Private/Doctor
router.get('/my-earnings', protect, authorize('doctor'), async (req, res) => {
    try {
        const transactions = await Transaction.find({ doctor: req.user._id, status: 'success' });
        const totalEarnings = transactions.reduce((sum, t) => sum + t.doctorEarning, 0);
        const totalConsultations = transactions.length;

        res.json({ totalEarnings, totalConsultations, transactions });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
