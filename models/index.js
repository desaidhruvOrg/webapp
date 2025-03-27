require('dotenv').config();
const mysql = require("mysql2/promise");
const Sequelize = require("sequelize");
const { DataTypes } = Sequelize;
const { trackDbQuery } = require('../utils/metrics');
const logger = require('../utils/logger');

const databaseName = process.env.DB_NAME;
const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const host = process.env.DB_HOST;

// Create a variable to store the sequelize instance and models
let db = {};

async function initializeDatabase() {
  let tempConnection;
  try {
    logger.info('Attempting to connect to database');
    const initialSequelize = new Sequelize(databaseName, user, password, {
      host,
      dialect: "mysql",
      logging: (sql) => logger.debug(`SQL: ${sql}`),
      dialectOptions: {
        connectTimeout: 3000,
        dateStrings: true,
        typeCast: true,
        timezone: "+00:00",
      },
      timezone: "+00:00",
    });

    await trackDbQuery(
      () => initialSequelize.authenticate(),
      'authenticate'
    );
    logger.info("Connected to an existing database");
  } catch (error) {
    // If database doesn't exist, create it
    if (error.original?.code === "ER_BAD_DB_ERROR") {
      logger.info("Database not found, creating new one...");

      tempConnection = await mysql.createConnection({
        host,
        user,
        password,
        timezone: "+00:00",
      });

      await trackDbQuery(
        () => tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``),
        'create_database'
      );
      logger.info(`Database ${databaseName} created successfully`);
    } else {
      logger.error("Database connection failed", { error: error.message, stack: error.stack });
      throw error;
    }
  } finally {
    if (tempConnection) await tempConnection.end();
  }

  // Create the sequelize instance
  const sequelize = new Sequelize(databaseName, user, password, {
    host,
    dialect: "mysql",
    logging: (sql) => logger.debug(`SQL: ${sql}`),
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

  // Enhance model methods with metrics tracking
  const originalCreate = db.File.create;
  db.File.create = function(values, options) {
    return trackDbQuery(
      () => originalCreate.call(this, values, options),
      'file_create'
    );
  };

  const originalFindOne = db.File.findOne;
  db.File.findOne = function(options) {
    return trackDbQuery(
      () => originalFindOne.call(this, options),
      'file_findOne'
    );
  };

  const originalDestroy = db.File.destroy;
  db.File.destroy = function(options) {
    return trackDbQuery(
      () => originalDestroy.call(this, options),
      'file_destroy'
    );
  };

  try {
    await trackDbQuery(
      () => sequelize.sync({ alter: true }),
      'sync_models'
    );
    logger.info("Database models synchronized");
  } catch (syncError) {
    logger.error("Database synchronization failed", { error: syncError.message, stack: syncError.stack });
    throw syncError;
  }

  return db;
}

module.exports = { initializeDatabase, db };

