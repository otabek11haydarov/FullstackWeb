const { Activity } = require('../models');

exports.getRecentActivities = async (req, res) => {
  try {
    const activities = await Activity.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.status(200).json({
      status: 'success',
      data: {
        activities
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};
