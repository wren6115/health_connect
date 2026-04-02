const express = require('express');
const router = express.Router();
const { getUsers, getUserById, deleteUser, approveUser, rejectUser, getUserFull, assignDoctor } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, authorize('admin'), getUsers);

router.route('/:id')
    .get(protect, authorize('admin'), getUserById)
    .delete(protect, authorize('admin'), deleteUser);

router.route('/:id/full')
    .get(protect, authorize('admin'), getUserFull);

router.route('/:id/approve')
    .put(protect, authorize('admin'), approveUser);

router.route('/:id/reject')
    .put(protect, authorize('admin'), rejectUser);

router.route('/:id/assign-doctor')
    .put(protect, authorize('admin'), assignDoctor);

module.exports = router;

