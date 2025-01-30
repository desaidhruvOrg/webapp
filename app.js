const express = require('express');
require('dotenv').config();
const { initializeDatabase } = require('./models');

const app = express();

app.use((req, res, next) => {
  if (req.method === 'GET' && req.path === '/healthz') {
    const hasContent = Object.keys(req.query).length > 0 
      || req.headers['content-length'] > 0 
      || req.headers['transfer-encoding'];
      
    if (hasContent) {
      setHeaders(res);
      return res.status(400).end();
    }
  }
  next();
});

let HealthCheck = null;

function setHeaders(res) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('X-Content-Type-Options', 'nosniff');
}

app.get('/healthz', async (req, res) => {
  try {
    if (!HealthCheck) {
      throw new Error('Database not connected');
    }
    await HealthCheck.create({});
    setHeaders(res);
    res.status(200).end();
  } catch (error) {
    console.error('Health check failed ', error.message);
    setHeaders(res);
    res.status(503).end();
  }
});

app.all('/healthz', (req, res) => {
  setHeaders(res);
  res.status(405).end();
});

app.all('*', (req, res) => {
  setHeaders(res);
  res.status(404).end();
});

const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    const models = await initializeDatabase();
    HealthCheck = models.HealthCheck;
  } catch (error) {
    console.error('Database connection failed ', error.message);
  } finally {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  }
}

startServer();

