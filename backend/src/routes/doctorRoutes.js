const express = require('express');
const doctorController = require('../controllers/doctorController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Protect all routes after this middleware
router.use(authMiddleware.protect);

router.get('/dashboard/stats', roleMiddleware.restrictTo('Doctor', 'Super Admin'), doctorController.getDashboard);
router.get('/patients', roleMiddleware.restrictTo('Doctor', 'Super Admin'), doctorController.getMyPatients);
router.get('/patients/:id/profile', roleMiddleware.restrictTo('Doctor', 'Super Admin'), doctorController.getPatientProfile);
router.get('/diagnoses', roleMiddleware.restrictTo('Doctor', 'Super Admin'), doctorController.getDoctorDiagnoses);
router.get('/appointments', roleMiddleware.restrictTo('Doctor', 'Super Admin'), doctorController.getDoctorAppointments);
router.put('/appointments/:id/status', roleMiddleware.restrictTo('Doctor', 'Super Admin'), doctorController.updateAppointmentStatus);
router.get('/reports/stats', roleMiddleware.restrictTo('Doctor', 'Super Admin'), doctorController.getReportsStats);

router.put('/profile', roleMiddleware.restrictTo('Doctor'), doctorController.updateProfile);


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

router.post('/patients/:id/refer', roleMiddleware.restrictTo('Doctor', 'Super Admin'), doctorController.referPatient);
router.get('/patients/:id/clinical-history', roleMiddleware.restrictTo('Doctor', 'Super Admin'), doctorController.getClinicalHistory);

module.exports = router;
