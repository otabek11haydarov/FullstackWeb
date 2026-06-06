const express = require('express');
const { getRecentActivities } = require('../controllers/activitiesController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, getRecentActivities);

module.exports = router;
