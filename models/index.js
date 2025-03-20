require('dotenv').config();
const mysql = require("mysql2/promise");
const Sequelize = require("sequelize");
const { DataTypes } = Sequelize;

const databaseName = process.env.DB_NAME;
const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const host = process.env.DB_HOST;

// Create a variable to store the sequelize instance and models
let db = {};

async function initializeDatabase() {
  let tempConnection;
  try {
    const initialSequelize = new Sequelize(databaseName, user, password, {
      host,
      dialect: "mysql",
      logging: false,
      dialectOptions: {
        connectTimeout: 3000,
        dateStrings: true,
        typeCast: true,
        timezone: "+00:00",
      },
      timezone: "+00:00",
    });

    await initialSequelize.authenticate();
    console.log("Connected to an existing database");
  } catch (error) {
    // If database doesn't exist, create it
    if (error.original?.code === "ER_BAD_DB_ERROR") {
      console.log("Database not found, creating new one...");

      tempConnection = await mysql.createConnection({
        host,
        user,
        password,
        timezone: "+00:00",
      });

      await tempConnection.query(
        `CREATE DATABASE IF NOT EXISTS \`${databaseName}\``
      );
      console.log(`Database ${databaseName} created successfully`);
    } else {
      console.error("Database connection failed ", error.message);
      throw error;
    }
  } finally {
    if (tempConnection) await tempConnection.end();
  }

  // Create the sequelize instance
  const sequelize = new Sequelize(databaseName, user, password, {
    host,
    dialect: "mysql",
    logging: false,
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
      timezone: "+00:00",
    },
    timezone: "+00:00",
    retry: {
      max: 3,
      timeout: 5000,
    },
  });
  
  // Store sequelize in the db object
  db.sequelize = sequelize;
  
  // Define models
  db.HealthCheck = sequelize.define(
    "health_check",
    {
      check_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      datetime: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
    },
    {
      timestamps: false,
      tableName: "health_checks_table",
      freezeTableName: true,
    }
  );
  
  // Define File model directly here
  db.File = sequelize.define('File', {
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
    timestamps: false,
    tableName: 'files',
    freezeTableName: true
  });

  try {
    await sequelize.sync({ alter: true });
    console.log("Database models synchronized");
  } catch (syncError) {
    console.error("Database synchronization failed:", syncError.message);
    throw syncError;
  }

  return db;
}

module.exports = { initializeDatabase, db };

