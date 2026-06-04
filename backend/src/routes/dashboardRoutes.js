const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.get('/stats', dashboardController.getDashboardStats);
router.get('/analytics', dashboardController.getAnalyticsStats);

module.exports = router;
