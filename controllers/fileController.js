const { db } = require('../models');
const s3 = require('../utils/s3');
const { v4: uuidv4 } = require('uuid');

exports.addFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // Generate a unique ID for the file
    const fileId = uuidv4();
    
    // Create a unique key for S3 using the file ID and original name
    const key = `${fileId}/${file.originalname}`;

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

    const data = await s3.upload(params).promise();
    
    const newFile = await db.File.create({
      id: fileId,
      file_name: file.originalname,
      url: `${process.env.AWS_S3_BUCKET_NAME}/${key}`,
      upload_date: new Date().toISOString().split('T')[0]
    });

    res.status(201).json({
      file_name: newFile.file_name,
      id: newFile.id,
      url: newFile.url,
      upload_date: newFile.upload_date
    });
  } catch (error) {
    console.error(`Error adding file: ${error.message}`);
    res.status(400).json({ message: 'Bad Request' });
  }
};

exports.getFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await db.File.findOne({ where: { id: fileId } });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.status(200).json({
      file_name: file.file_name,
      id: file.id,
      url: file.url,
      upload_date: file.upload_date
    });
  } catch (error) {
    console.error(`Error fetching file: ${error.message}`);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await db.File.findOne({ where: { id: fileId } });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Extract the key from the URL
    const key = file.url.replace(`${process.env.AWS_S3_BUCKET_NAME}/`, '');

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key
    };

    // Delete from S3
    await s3.deleteObject(params).promise();

    // Delete from database
    await db.File.destroy({ where: { id: fileId } });

    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting file: ${error.message}`);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.badRequest = (req, res) => {
  res.status(400).json({ message: 'Bad Request' });
};