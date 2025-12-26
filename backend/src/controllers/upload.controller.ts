"use client";
import { Request, Response } from 'express';
import cloudinary from '../config/cloudinary.config';
import DatauriParser from 'datauri/parser';
import path from 'path';

const parser = new DatauriParser();

// --- POST /api/upload ---
// Uploads a single image for the logged-in user
export const uploadImage = async (req: Request, res: Response) => {
  // 1. Check if a file was even uploaded
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided.' });
  }

  try {
    // 2. Format the file from a "buffer" into a "data URI" string
    const extName = path.extname(req.file.originalname).toString();
    const file64 = parser.format(extName, req.file.buffer);

    if (!file64.content) {
      return res.status(500).json({ error: 'Failed to parse file buffer.' });
    }

    const result = await cloudinary.uploader.upload(file64.content, {
      folder: 'catalyst_products',
    });


    res.status(201).json({
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url,
    });

  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    res.status(500).json({ error: 'Something went wrong during the upload.' });
  }
};