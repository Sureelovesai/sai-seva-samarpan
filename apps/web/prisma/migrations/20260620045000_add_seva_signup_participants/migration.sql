-- CreateTable SevaSignupParticipant
CREATE TABLE "SevaSignupParticipant" (
    "id" TEXT NOT NULL,
    "sevaSignupId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "groupName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SevaSignupParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on sevaSignupId
CREATE INDEX "SevaSignupParticipant_sevaSignupId_idx" ON "SevaSignupParticipant"("sevaSignupId");

-- AddForeignKey
ALTER TABLE "SevaSignupParticipant" ADD CONSTRAINT "SevaSignupParticipant_sevaSignupId_fkey" FOREIGN KEY ("sevaSignupId") REFERENCES "SevaSignup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
