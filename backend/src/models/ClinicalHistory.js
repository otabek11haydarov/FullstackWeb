const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ClinicalHistory = sequelize.define('ClinicalHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Patients',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  doctorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Doctors',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  actionType: {
    type: DataTypes.ENUM('Diagnosis', 'Referral', 'Diagnostics', 'Note', 'StatusChange'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

module.exports = ClinicalHistory;
