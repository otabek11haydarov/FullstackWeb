const { Doctor, Patient, Diagnosis, Appointment, User } = require('../models');
const { Op } = require('sequelize');

exports.getDashboardStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalDoctors, 
      totalPatients, 
      totalDiagnoses, 
      todayAppointments, 
      upcomingAppointments,
      recentPatients,
      recentDiagnoses
    ] = await Promise.all([
      Doctor.count(),
      Patient.count(),
      Diagnosis.count(),
      Appointment.count({
        where: {
          date: {
            [Op.between]: [todayStart, todayEnd]
          }
        }
      }),
      Appointment.findAll({
        where: {
          date: {
            [Op.gte]: todayStart
          }
        },
        order: [['date', 'ASC']],
        limit: 5,
        include: [
          { model: Patient, include: [{ model: User, attributes: ['firstName', 'lastName'] }] },
          { model: Doctor, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
        ]
      }),
      Patient.findAll({
        order: [['createdAt', 'DESC']],
        limit: 3,
        include: [{ model: User, attributes: ['firstName', 'lastName'] }]
      }),
      Diagnosis.findAll({
        order: [['createdAt', 'DESC']],
        limit: 3,
        include: [
          { model: Patient, include: [{ model: User, attributes: ['firstName', 'lastName'] }] }
        ]
      })
    ]);

    // Format recent activity from mix of patients and diagnoses
    let recentActivity = [];
    
    recentPatients.forEach(p => {
      recentActivity.push({
        type: 'patient',
        message: 'New patient registered',
        user: `${p.User.firstName} ${p.User.lastName}`,
        createdAt: p.createdAt
      });
    });

    recentDiagnoses.forEach(d => {
      recentActivity.push({
        type: 'diagnosis',
        message: 'Diagnosis added',
        user: d.Patient ? `${d.Patient.User.firstName} ${d.Patient.User.lastName}` : 'Unknown',
        createdAt: d.createdAt
      });
    });

    // Sort combined by createdAt DESC and take top 4
    recentActivity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    recentActivity = recentActivity.slice(0, 4);

    res.status(200).json({
      status: 'success',
      data: {
        totalDoctors,
        totalPatients,
        totalDiagnoses,
        todayAppointments,
        upcomingAppointments,
        recentActivity
      }
    });

  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.getAnalyticsStats = async (req, res) => {
  try {
    const { sequelize } = require('../models');

    const [departmentsData, gendersData, severitiesData] = await Promise.all([
      Doctor.findAll({
        attributes: ['specialization', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['specialization']
      }),
      Patient.findAll({
        attributes: ['gender', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['gender']
      }),
      Diagnosis.findAll({
        attributes: ['severity', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['severity']
      })
    ]);

    let highPriorityCount = 0;
    let criticalCount = 0;

    const severities = severitiesData.map(s => {
      const data = s.get({ plain: true });
      if (data.severity === 'Critical') criticalCount += parseInt(data.count);
      if (data.severity === 'Moderate' || data.severity === 'High') highPriorityCount += parseInt(data.count);
      return data;
    });

    res.status(200).json({
      status: 'success',
      data: {
        departments: departmentsData.map(d => d.get({ plain: true })),
        genders: gendersData.map(g => g.get({ plain: true })),
        severities,
        alerts: {
          highPriority: highPriorityCount,
          critical: criticalCount
        }
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
