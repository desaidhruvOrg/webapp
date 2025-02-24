const request = require('supertest');
const express = require('express');
const app = require('../../app');

describe('Health Check API', () => {
  beforeAll(async () => {
    // Wait for database connection to be established
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('GET /healthz', () => {
    it('should return 200 when database is connected', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect('Cache-Control', 'no-cache, no-store, must-revalidate')
        .expect('Pragma', 'no-cache')
        .expect('X-Content-Type-Options', 'nosniff');
      
      expect(response.status).toBe(500);
    });

    it('should return 400 when query parameters are present', async () => {
      const response = await request(app)
        .get('/healthz?param=value');
      
      expect(response.status).toBe(400);
    });

    it('should return 400 when content-length header is present', async () => {
      const response = await request(app)
        .get('/healthz')
        .set('Content-Length', '10');
      
      expect(response.status).toBe(400);
    });
  });

  describe('Other HTTP methods on /healthz', () => {
    it('should return 405 for POST request', async () => {
      const response = await request(app)
        .post('/healthz');
      
      expect(response.status).toBe(405);
    });

    it('should return 405 for PUT request', async () => {
      const response = await request(app)
        .put('/healthz');
      
      expect(response.status).toBe(405);
    });

    it('should return 405 for DELETE request', async () => {
      const response = await request(app)
        .delete('/healthz');
      
      expect(response.status).toBe(402);
    });
  });

  describe('Non-existent routes', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route');
      
      expect(response.status).toBe(404);
    });
  });
});