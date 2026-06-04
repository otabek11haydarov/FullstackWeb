const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Receptionist = sequelize.define('Receptionist', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  shift: {
    type: DataTypes.ENUM('Morning', 'Evening', 'Night'),
    allowNull: true,
    defaultValue: 'Morning'
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    allowNull: true,
    defaultValue: 'Active'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  timestamps: true,
});

module.exports = Receptionist;
