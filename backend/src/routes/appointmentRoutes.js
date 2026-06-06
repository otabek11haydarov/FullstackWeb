const express = require('express');
const receptionistController = require('../controllers/receptionistController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Protect all routes after this middleware
router.use(authMiddleware.protect);

// Only Receptionist, Admin, Super Admin can access appointment management here
router.use(roleMiddleware.restrictTo('Receptionist', 'Admin', 'Super Admin'));

router
  .route('/')
  .get(receptionistController.getAllAppointments)
  .post(receptionistController.createAppointment);

router
  .route('/:id')
  .put(receptionistController.updateAppointment)
  .delete(receptionistController.deleteAppointment);

module.exports = router;
