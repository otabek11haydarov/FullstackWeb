const express = require('express');
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router
  .route('/')
  .get(patientController.getAllPatients)
  .post(roleMiddleware.restrictTo('Super Admin', 'Admin'), patientController.createPatient);

// Patient Portal Routes
router.get('/portal/dashboard', roleMiddleware.restrictTo('Patient'), patientController.getPatientDashboard);
router.get('/portal/doctors', roleMiddleware.restrictTo('Patient', 'Admin', 'Super Admin'), patientController.getDoctors);
router.get('/portal/doctors-with-slots', roleMiddleware.restrictTo('Patient', 'Admin', 'Super Admin'), patientController.getDoctorsWithSlots);
router.post('/portal/book-appointment', roleMiddleware.restrictTo('Patient'), patientController.bookAppointment);
router.get('/portal/records', roleMiddleware.restrictTo('Patient'), patientController.getRecords);
router.post('/portal/reviews', roleMiddleware.restrictTo('Patient'), patientController.submitReview);
router.get('/portal/profile', roleMiddleware.restrictTo('Patient'), patientController.getMyProfile);
router.put('/portal/profile', roleMiddleware.restrictTo('Patient'), patientController.updateMyProfile);

router
  .route('/:id')
  .get(patientController.getPatient)
  .put(roleMiddleware.restrictTo('Super Admin', 'Admin'), patientController.updatePatient)
  .delete(roleMiddleware.restrictTo('Super Admin', 'Admin'), patientController.deletePatient);

module.exports = router;
