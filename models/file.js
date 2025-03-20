const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/sequelize');

const File = sequelize.define('File', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  upload_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  timestamps: false
});

module.exports = File;