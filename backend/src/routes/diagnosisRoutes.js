const express = require('express');
const diagnosisController = require('../controllers/diagnosisController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Protect all routes after this middleware
router.use(authMiddleware.protect);

router
  .route('/')
  .get(diagnosisController.getAllDiagnoses)
  .post(roleMiddleware.restrictTo('Super Admin', 'Admin', 'Doctor'), diagnosisController.createDiagnosis);

router
  .route('/:id')
  .get(diagnosisController.getDiagnosis)
  .put(roleMiddleware.restrictTo('Super Admin', 'Admin', 'Doctor'), diagnosisController.updateDiagnosis)
  .delete(roleMiddleware.restrictTo('Super Admin', 'Admin'), diagnosisController.deleteDiagnosis);

module.exports = router;
