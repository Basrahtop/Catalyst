import { Request, Response, NextFunction } from 'express';
// 1. --- IMPORT Role and PrismaClient ---
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// (Your global Request extension is unchanged and correct)
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId; // This comes from 'authMiddleware'

  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // 2. --- THIS IS THE FIX ---
    // We now check for the Enum value 'Role.ADMIN', not the string 'ADMIN'.
    if (!user.roles.includes(Role.ADMIN)) {
      return res.status(403).json({ error: 'Forbidden: You do not have admin privileges.' });
    }
    // --- END OF FIX ---

    // 3. Success! They are an admin.
    next();

  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};