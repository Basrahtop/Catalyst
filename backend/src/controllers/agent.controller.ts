import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- POST /api/agents/apply ---
// (This function is unchanged and correct)
export const applyToBecomeAgent = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  try {
    const existingAgent = await prisma.agent.findUnique({
      where: { userId: userId },
    });
    if (existingAgent) {
      return res.status(400).json({ error: 'You are already an agent or your application is pending.' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { verification: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.verification?.ninStatus !== 'VERIFIED') {
      return res.status(403).json({ error: 'You must verify your NIN (KYC) before you can apply to be an agent.' });
    }

    const newAgentApplication = await prisma.agent.create({
      data: {
        userId: userId,
      },
    });

    res.status(201).json({
      message: 'Application submitted successfully. It will be reviewed by an admin.',
      agent: newAgentApplication,
    });

  } catch (error) {
    console.error("Error applying for agent:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- POST /api/agents/vouch ---
// This is the NEW "Sponsorship" logic
export const vouchForUser = async (req: Request, res: Response) => {
  // 1. Get the Agent's ID (from authMiddleware)
  const agentUserId = req.userId;
  
  // 2. Get the User they want to "Sponsor"
  const { vouchForUserId } = req.body;

  if (!agentUserId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }
  if (!vouchForUserId) {
    return res.status(400).json({ error: 'User ID to sponsor is required.' });
  }

  try {
    // 3. Get the Agent's profile
    const agent = await prisma.agent.findUnique({
      where: { userId: agentUserId },
    });
    if (!agent) {
      return res.status(403).json({ error: 'You are not an active agent.' });
    }

    // 4. Get the User's profile
    const userToSponsor = await prisma.user.findUnique({
      where: { id: vouchForUserId },
    });
    if (!userToSponsor) {
      return res.status(404).json({ error: 'User to sponsor not found.' });
    }

    // 5. --- The "Anti-Monopoly" Check ---
    if (userToSponsor.sponsoringAgentId === agent.id) {
      return res.status(400).json({ error: 'You are already sponsoring this user.' });
    }

    // 6. --- Success: Create or Transfer the Sponsorship ---
    // This one command links the user to the new agent,
    // automatically breaking any old link.
    const updatedUser = await prisma.user.update({
      where: { id: vouchForUserId },
      data: {
        sponsoringAgentId: agent.id, // This performs the "link" or "transfer"
      },
    });

    res.status(200).json({
      message: `You are now the official sponsor for ${updatedUser.email}.`,
      user: updatedUser,
    });

  } catch (error: any) {
    console.error("Error vouching for user:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};