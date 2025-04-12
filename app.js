const express = require("express");
require("dotenv").config();
const { initializeDatabase } = require("./models");
const file_route = require("./routes/fileRoute");
const { trackApiMetrics } = require("./utils/metrics");
const logger = require("./utils/logger");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(trackApiMetrics);

app.use((req, res, next) => {
	if ((req.method === "GET" && req.path === "/healthz") || (req.method === "GET" && req.path === "/cicd")) {
		const hasContent =
			Object.keys(req.query).length > 0 ||
			req.headers["content-length"] > 0 ||
			req.headers["transfer-encoding"];

		if (hasContent) {
			setHeaders(res);
			logger.warn(
				"Health check request with content body or query parameters"
			);
			return res.status(400).end();
		}
	}
	next();
});

let HealthCheck = null;

function setHeaders(res) {
	res.header("Cache-Control", "no-cache, no-store, must-revalidate");
	res.header("Pragma", "no-cache");
	res.header("X-Content-Type-Options", "nosniff");
}

app.get("/healthz", async (req, res) => {
	try {
		if (!HealthCheck) {
			throw new Error("Database not connected");
		}
		await HealthCheck.create({});
		setHeaders(res);
		logger.info("Health check success");
		res.status(200).end();
	} catch (error) {
		logger.error(`Health check failed: ${error.message}`, {
			stack: error.stack,
		});
		setHeaders(res);
		res.status(503).end();
	}
});

app.all("/healthz", (req, res) => {
	logger.warn(`Method not allowed on health check endpoint: ${req.method}`);
	setHeaders(res);
	res.status(405).end();
});

// Add new CICD endpoint
app.get("/cicd", async (req, res) => {
	try {
		if (!HealthCheck) {
			throw new Error("Database not connected");
		}
		await HealthCheck.create({});
		setHeaders(res);
		logger.info("CICD check success");
		res.status(200).end();
	} catch (error) {
		logger.error(`CICD check failed: ${error.message}`, {
			stack: error.stack,
		});
		setHeaders(res);
		res.status(503).end();
	}
});

app.all("/cicd", (req, res) => {
	logger.warn(`Method not allowed on CICD check endpoint: ${req.method}`);
	setHeaders(res);
	res.status(405).end();
});

app.use("/", file_route);

app.all("*", (req, res) => {
	logger.warn(`Route not found: ${req.method} ${req.path}`);
	setHeaders(res);
	res.status(404).end();
});

const PORT = process.env.PORT || 8080;

async function startServer() {
	try {
		logger.info("Starting application server");
		const models = await initializeDatabase();
		HealthCheck = models.HealthCheck;
		global.db = models;
		logger.info("Database initialized successfully");
	} catch (error) {
		logger.error(`Database connection failed: ${error.message}`, {
			stack: error.stack,
		});
	} finally {
		app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
	}
}

startServer();

module.exports = app;
