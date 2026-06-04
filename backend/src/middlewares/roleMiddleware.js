// Middleware to restrict access to specific roles
// roles should be an array like ['admin', 'doctor']
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user is set by the protect middleware
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};

// Ensure a regular admin cannot modify another admin or super_admin
exports.restrictAdminModifications = async (req, res, next) => {
  const { User } = require('../models');
  try {
    const targetUser = await User.findByPk(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }
    
    // If the person making the request is an admin (NOT a super_admin)
    // They cannot touch admins or super_admins
    if (req.user.role === 'Admin' && (targetUser.role === 'Super Admin' || targetUser.role === 'Admin')) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to modify an Admin or Super Admin account.'
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
