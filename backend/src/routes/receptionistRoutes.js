const express = require('express');
const receptionistController = require('../controllers/receptionistController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Protect all routes after this middleware
router.use(authMiddleware.protect);

router
  .route('/')
  .get(receptionistController.getAllReceptionists)
  .post(roleMiddleware.restrictTo('Super Admin', 'Admin'), receptionistController.createReceptionist);

router
  .route('/:id')
  .get(receptionistController.getReceptionist)
  .put(roleMiddleware.restrictTo('Super Admin', 'Admin'), receptionistController.updateReceptionist)
  .delete(roleMiddleware.restrictTo('Super Admin', 'Admin'), receptionistController.deleteReceptionist);

module.exports = router;
