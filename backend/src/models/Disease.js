const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Disease = sequelize.define('Disease', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  diagnosedDate: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('Active', 'Recovered', 'Chronic', 'Unknown'),
    defaultValue: 'Active'
  },
  patientId: { // A Disease belongs to one Patient
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Patients',
      key: 'id'
    }
  }
});

module.exports = Disease;
