// src/config/cloudinary.config.ts
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config(); // Make sure our .env variables are loaded

// This configures the Cloudinary object with our secret keys
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // We want HTTPS links
});

export default cloudinary;