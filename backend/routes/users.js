const express = require('express');
const router = express.Router();
const { getUsers, getUserById, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, authorize('admin'), getUsers);

router.route('/:id')
    .get(protect, authorize('admin'), getUserById)
    .delete(protect, authorize('admin'), deleteUser);

module.exports = router;
