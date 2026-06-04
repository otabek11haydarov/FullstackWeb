const { sequelize } = require('../config/database');
const User = require('./User');
const Doctor = require('./Doctor');
const Patient = require('./Patient');
const Disease = require('./Disease');
const Diagnosis = require('./Diagnosis');
const Appointment = require('./Appointment');
const Receptionist = require('./Receptionist');

// Associations
// User and Doctor (One-to-One)
User.hasOne(Doctor, { foreignKey: 'userId', onDelete: 'CASCADE' });
Doctor.belongsTo(User, { foreignKey: 'userId' });

// User and Patient (One-to-One)
User.hasOne(Patient, { foreignKey: 'userId', onDelete: 'CASCADE' });
Patient.belongsTo(User, { foreignKey: 'userId' });

// Doctor and Patient (One-to-Many)
Doctor.hasMany(Patient, { foreignKey: 'doctorId' });
Patient.belongsTo(Doctor, { foreignKey: 'doctorId' });

// Patient and Disease (One-to-Many)
Patient.hasMany(Disease, { foreignKey: 'patientId', onDelete: 'CASCADE' });
Disease.belongsTo(Patient, { foreignKey: 'patientId' });

// Patient and Appointment (One-to-Many)
Patient.hasMany(Appointment, { foreignKey: 'patientId', onDelete: 'CASCADE' });
Appointment.belongsTo(Patient, { foreignKey: 'patientId' });

// Doctor and Appointment (One-to-Many)
Doctor.hasMany(Appointment, { foreignKey: 'doctorId', onDelete: 'CASCADE' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctorId' });

// User and Receptionist (One-to-One)
User.hasOne(Receptionist, { foreignKey: 'userId', onDelete: 'CASCADE' });
Receptionist.belongsTo(User, { foreignKey: 'userId' });

// Patient and Diagnosis (One-to-Many)
Patient.hasMany(Diagnosis, { foreignKey: 'patientId', onDelete: 'CASCADE' });
Diagnosis.belongsTo(Patient, { foreignKey: 'patientId' });

// Doctor and Diagnosis (One-to-Many)
Doctor.hasMany(Diagnosis, { foreignKey: 'doctorId', onDelete: 'SET NULL' });
Diagnosis.belongsTo(Doctor, { foreignKey: 'doctorId' });

module.exports = {
  sequelize,
  User,
  Doctor,
  Patient,
  Disease,
  Diagnosis,
  Appointment,
  Receptionist
};
