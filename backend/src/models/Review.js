const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  appointmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true, // One review per appointment
    references: {
      model: 'Appointments',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  doctorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Doctors',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
});

module.exports = Review;
