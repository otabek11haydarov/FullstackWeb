const express = require('express');
const doctorController = require('../controllers/doctorController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Protect all routes after this middleware
router.use(authMiddleware.protect);

router.get('/dashboard/stats', roleMiddleware.restrictTo('Doctor', 'Super Admin'), doctorController.getDashboard);
router.get('/patients', roleMiddleware.restrictTo('Doctor', 'Super Admin'), doctorController.getMyPatients);
router.get('/diagnoses', roleMiddleware.restrictTo('Doctor', 'Super Admin'), doctorController.getDoctorDiagnoses);

router
  .route('/')
  .get(doctorController.getAllDoctors)
  .post(roleMiddleware.restrictTo('Super Admin', 'Admin'), doctorController.createDoctor);

router
  .route('/:id')
  .get(doctorController.getDoctor)
  .put(roleMiddleware.restrictTo('Super Admin', 'Admin'), doctorController.updateDoctor)
  .delete(roleMiddleware.restrictTo('Super Admin', 'Admin'), doctorController.deleteDoctor);

router
  .route('/:id/profile')
  .get(roleMiddleware.restrictTo('Super Admin', 'Admin'), doctorController.getDoctorProfileForAdmin);

router
  .route('/:doctorId/patients/:patientId/history')
  .get(roleMiddleware.restrictTo('Super Admin', 'Admin', 'Doctor'), doctorController.getPatientHistory);

module.exports = router;
