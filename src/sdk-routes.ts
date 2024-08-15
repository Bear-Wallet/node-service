import express, { Request, Response } from "express";
import { StoreSignatureBody } from "./interface";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const router = express.Router();

router.post(
  "/store-data",
  async (req: Request<{}, {}, StoreSignatureBody>, res: Response) => {
    const { sessionId, data } = req.body;

    try {
      const sessionData = await prisma.sessionData.create({
        data: {
          sessionId,
          data,
        },
      });

      res.status(200).json(sessionData);
    } catch (error) {
      console.error("Error storing signature:", error);
      res.status(500).json({ error: "Failed to store signature" });
    }
  }
);

router.get(
  "/get-data",
  async (req: Request<{}, {}, {}, { sessionId: string }>, res: Response) => {
    const { sessionId } = req.query;

    try {
      const sessionData = await prisma.sessionData.findUnique({
        where: { sessionId },
      });

      if (sessionData) {
        // TODO: CRON job to return stale signatures
        // await prisma.signature.delete({
        //   where: { sessionId },
        // });

        res.status(200).json(sessionData);
      } else {
        res.status(404).json({ error: "Signature not found" });
      }
    } catch (error) {
      console.error("Error retrieving signature:", error);
      res.status(500).json({ error: "Failed to retrieve signature" });
    }
  }
);

export default router;
