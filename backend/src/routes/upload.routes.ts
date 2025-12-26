// src/routes/upload.routes.ts
import { Router } from 'express';
import { uploadImage } from '../controllers/upload.controller';
import { authMiddleware } from '../middleware/auth.middleware'; // Our "security guard"
import multerUpload from '../middleware/multer.middleware'; // Our "file catcher"

const router = Router();

// --- Define Upload Route ---

// POST /api/upload
// This route is *highly* protected.
// 1. authMiddleware: Checks if you're logged in.
// 2. multerUpload.single('image'): Catches a *single file* from the form field named "image".
// 3. uploadImage: Our controller runs last.
router.post('/', [authMiddleware, multerUpload.single('image')], uploadImage);

export default router;