import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role } from '@prisma/client'; // We must import Role

const prisma = new PrismaClient();

// This (again) extends the Request object
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const isAgent = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId; // This comes from our first 'authMiddleware'

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

    // --- We check for the *Enum* Role.AGENT ---
    if (!user.roles.includes(Role.AGENT)) {
      return res.status(403).json({ error: 'Forbidden: You are not an active agent.' });
    }

    // 3. Success! They are an agent.
    next();

  } catch (error) {
    console.error("Agent middleware error:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};