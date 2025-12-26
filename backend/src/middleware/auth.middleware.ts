// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// --- This is a small TypeScript trick ---
// We're extending the default 'Request' object
// to add our own 'userId' property.
// This way, TypeScript won't give us errors later.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
// ----------------------------------------

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 1. Get the token from the request header
  // It's usually sent as: "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided, authorization denied.' });
  }

  // 2. Extract just the token string
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token malformed, authorization denied.' });
  }

  try {
    // 3. Verify the token
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { userId: string };

    // 4. If valid, attach the user's ID to the request object
    // This lets our *next* function (the real controller) know *who* is making the request
    req.userId = payload.userId;

    // 5. "Unlock the door" and move to the next function
    next();

  } catch (error) {
    // 6. If the token is invalid (expired, wrong secret)
    res.status(401).json({ error: 'Token is not valid, authorization denied.' });
  }
};