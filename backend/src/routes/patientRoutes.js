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

router
  .route('/:id')
  .get(patientController.getPatient)
  .put(roleMiddleware.restrictTo('Super Admin', 'Admin'), patientController.updatePatient)
  .delete(roleMiddleware.restrictTo('Super Admin', 'Admin'), patientController.deletePatient);

module.exports = router;
