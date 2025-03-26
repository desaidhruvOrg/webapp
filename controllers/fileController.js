const { db } = require('../models');
const s3 = require('../utils/s3');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { statsd } = require('../utils/metrics');

exports.addFile = async (req, res) => {
  const apiStartTime = new Date();
  statsd.increment('api.post.file');  // Track API call
  
  try {
    const file = req.file;
    if (!file) {
      logger.warn('No file provided', { type: 'FILE_UPLOAD_ERROR' });
      return res.status(400).json({ message: 'No file provided' });
    }

    // Generate a unique ID for the file
    const fileId = uuidv4();
    
    // Create a unique key for S3 using the file ID and original name
    const key = `${fileId}/${file.originalname}`;

    logger.info(`Processing file upload: ${file.originalname} (${file.size} bytes)`);

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        'Content-Type': file.mimetype,
        'Original-Name': file.originalname
      }
    };

    const s3StartTime = new Date();
    const data = await s3.upload(params).promise();
    const s3Duration = new Date() - s3StartTime;
    statsd.timing('s3.upload.time', s3Duration);  // Track S3 upload time
    
    logger.info('File uploaded to S3', {
      type: 'S3_UPLOAD',
      fileId,
      duration: s3Duration,
      bucket: params.Bucket,
      key: params.Key
    });
    
    const dbStartTime = new Date();
    const newFile = await db.File.create({
      id: fileId,
      file_name: file.originalname,
      url: `${process.env.AWS_S3_BUCKET_NAME}/${key}`,
      upload_date: new Date().toISOString().split('T')[0]
    });
    const dbDuration = new Date() - dbStartTime;
    statsd.timing('db.create.time', dbDuration);  // Track DB operation time
    
    logger.info('File record created in database', {
      type: 'DB_CREATE',
      fileId,
      duration: dbDuration
    });

    res.status(201).json({
      file_name: newFile.file_name,
      id: newFile.id,
      url: newFile.url,
      upload_date: newFile.upload_date
    });
    
    const apiDuration = new Date() - apiStartTime;
    statsd.timing('api.post.file.time', apiDuration);  // Track total API time
    
    logger.info('File added successfully', {
      type: 'API_RESPONSE',
      method: 'POST',
      path: '/file',
      duration: apiDuration,
      status: 201
    });
  } catch (error) {
    logger.error('Error adding file', { 
      type: 'API_ERROR',
      method: 'POST',
      path: '/v1/file',
      error: error.message,
      stack: error.stack
    });
    statsd.increment('api.post.file.error');  // Track API errors
    res.status(400).json({ message: 'Bad Request' });
  }
};

exports.getFile = async (req, res) => {
  const apiStartTime = new Date();
  statsd.increment('api.get.file');  // Track API call
  
  try {
    const fileId = req.params.id;
    logger.info('Get file request received', {
      type: 'API_REQUEST',
      method: 'GET',
      path: `/v1/file/${fileId}`
    });
    
    const dbStartTime = new Date();
    const file = await db.File.findOne({ where: { id: fileId } });
    const dbDuration = new Date() - dbStartTime;
    statsd.timing('db.findOne.time', dbDuration);  // Track DB operation time
    
    logger.info('Database query executed', {
      type: 'DB_QUERY',
      operation: 'findOne',
      fileId,
      duration: dbDuration
    });

    if (!file) {
      logger.warn('File not found', {
        type: 'NOT_FOUND',
        fileId,
        method: 'GET',
        path: `/v1/file/${fileId}`
      });
      return res.status(404).json({ message: 'File not found' });
    }

    res.status(200).json({
      file_name: file.file_name,
      id: file.id,
      url: file.url,
      upload_date: file.upload_date
    });
    
    const apiDuration = new Date() - apiStartTime;
    statsd.timing('api.get.file.time', apiDuration);  // Track total API time
    
    logger.info('File retrieved successfully', {
      type: 'API_RESPONSE',
      method: 'GET',
      path: `/v1/file/${fileId}`,
      duration: apiDuration,
      status: 200
    });
  } catch (error) {
    logger.error('Error fetching file', {
      type: 'API_ERROR',
      method: 'GET',
      path: `/v1/file/${req.params.id}`,
      error: error.message,
      stack: error.stack
    });
    statsd.increment('api.get.file.error');  // Track API errors
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteFile = async (req, res) => {
  const apiStartTime = new Date();
  statsd.increment('api.delete.file');  // Track API call
  
  try {
    const fileId = req.params.id;
    logger.info('Delete file request received', {
      type: 'API_REQUEST',
      method: 'DELETE',
      path: `/v1/file/${fileId}`
    });
    
    const dbFindStartTime = new Date();
    const file = await db.File.findOne({ where: { id: fileId } });
    const dbFindDuration = new Date() - dbFindStartTime;
    statsd.timing('db.findOne.time', dbFindDuration);  // Track DB operation time
    
    logger.info('Database query executed', {
      type: 'DB_QUERY',
      operation: 'findOne',
      fileId,
      duration: dbFindDuration
    });

    if (!file) {
      logger.warn('File not found for deletion', {
        type: 'NOT_FOUND',
        fileId,
        method: 'DELETE',
        path: `/v1/file/${fileId}`
      });
      return res.status(404).json({ message: 'File not found' });
    }

    // Extract the key from the URL
    const key = file.url.replace(`${process.env.AWS_S3_BUCKET_NAME}/`, '');

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key
    };
    
    const s3StartTime = new Date();
    // Delete from S3
    await s3.deleteObject(params).promise();
    const s3Duration = new Date() - s3StartTime;
    statsd.timing('s3.deleteObject.time', s3Duration);  // Track S3 operation time
    
    logger.info('File deleted from S3', {
      type: 'S3_DELETE',
      fileId,
      duration: s3Duration,
      bucket: params.Bucket,
      key: params.Key
    });
    
    const dbDeleteStartTime = new Date();
    // Delete from database
    await db.File.destroy({ where: { id: fileId } });
    const dbDeleteDuration = new Date() - dbDeleteStartTime;
    statsd.timing('db.destroy.time', dbDeleteDuration);  // Track DB operation time
    
    logger.info('File record deleted from database', {
      type: 'DB_DELETE',
      fileId,
      duration: dbDeleteDuration
    });
    
    const apiDuration = new Date() - apiStartTime;
    statsd.timing('api.delete.file.time', apiDuration);  // Track total API time
    
    logger.info('File deleted successfully', {
      type: 'API_RESPONSE',
      method: 'DELETE',
      path: `/v1/file/${fileId}`,
      duration: apiDuration,
      status: 204
    });
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting file', {
      type: 'API_ERROR',
      method: 'DELETE',
      path: `/v1/file/${req.params.id}`,
      error: error.message,
      stack: error.stack
    });
    statsd.increment('api.delete.file.error');  // Track API errors
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.badRequest = (req, res) => {
  statsd.increment('api.badRequest');  // Track bad requests
  logger.warn('Bad request received', {
    type: 'BAD_REQUEST',
    method: req.method,
    path: req.path
  });
  res.status(400).json({ message: 'Bad Request' });
};