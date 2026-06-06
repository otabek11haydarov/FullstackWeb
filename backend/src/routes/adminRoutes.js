const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Protect all routes
router.use(authMiddleware.protect);

// Strict restriction to super_admin only
router.use(roleMiddleware.restrictTo('Super Admin'));

router
  .route('/')
  .get(adminController.getAllAdmins)
  .post(adminController.createAdmin);

router
  .route('/:id')
  .put(adminController.updateAdmin)
  .delete(adminController.deleteAdmin);

// Emergency Appointments Override
router
  .route('/appointments')
  .get(adminController.getAllAppointments)
  .post(adminController.createAppointment);

router
  .route('/appointments/:id')
  .put(adminController.updateAppointment)
  .delete(adminController.deleteAppointment);

// Dropdown Helper Routes
router.route('/doctors').get(adminController.getAllDoctors);
router.route('/patients').get(adminController.getAllPatients);

module.exports = router;
