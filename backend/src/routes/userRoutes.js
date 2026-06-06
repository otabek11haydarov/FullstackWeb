const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Protect all routes
router.use(authMiddleware.protect);

// User profile route (accessible to all authenticated users)
router.put('/profile', userController.updateProfile);

// Only super_admin and admin can access these routes
router.use(roleMiddleware.restrictTo('Super Admin', 'Admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  // Restrict modifications to prevent admins from touching super_admins or other admins
  .patch(roleMiddleware.restrictAdminModifications, userController.updateUser)
  .delete(roleMiddleware.restrictAdminModifications, userController.deleteUser);

module.exports = router;
