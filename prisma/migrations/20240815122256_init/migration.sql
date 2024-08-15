-- CreateTable
CREATE TABLE "Signature" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Signature_sessionId_key" ON "Signature"("sessionId");
