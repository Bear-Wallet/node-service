import express, { Request, Response } from "express";
import { StoreSignatureBody } from "./interface";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const router = express.Router();

router.post(
  "/store-signature",
  async (req: Request<{}, {}, StoreSignatureBody>, res: Response) => {
    const { sessionId, signedMessage } = req.body;

    try {
      const signature = await prisma.signature.create({
        data: {
          sessionId,
          result: signedMessage,
        },
      });

      res.status(200).json(signature);
    } catch (error) {
      console.error("Error storing signature:", error);
      res.status(500).json({ error: "Failed to store signature" });
    }
  }
);

router.get(
  "/get-signature",
  async (req: Request<{}, {}, {}, { sessionId: string }>, res: Response) => {
    const { sessionId } = req.query;

    try {
      const signature = await prisma.signature.findUnique({
        where: { sessionId },
      });

      if (signature) {
        // TODO: CRON job to return stale signatures
        // await prisma.signature.delete({
        //   where: { sessionId },
        // });

        res.json({ signedMessage: signature.result });
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
