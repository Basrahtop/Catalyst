import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- GET /api/admin/agent-applications ---
export const getPendingAgents = async (req: Request, res: Response) => {
  try {
    const pendingApplications = await prisma.agent.findMany({
      where: {
        user: {
          // --- THIS IS THE FIX ---
          // Find users who do NOT have 'AGENT' in their roles array
          NOT: {
            roles: {
              has: 'AGENT',
            },
          },
          // --- END OF FIX ---
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            verification: {
              select: {
                ninStatus: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json(pendingApplications);

  } catch (error) {
    console.error("Error fetching pending agents:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- PATCH /api/admin/agents/:agentId/approve ---
export const approveAgent = async (req: Request, res: Response) => {
  const { agentId } = req.params;

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent application not found.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: agent.userId },
      data: {
        roles: {
          push: 'AGENT',
        },
      },
    });

    res.status(200).json({
      message: 'Agent approved successfully.',
      user: updatedUser,
    });

  } catch (error) {
    console.error("Error approving agent:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};