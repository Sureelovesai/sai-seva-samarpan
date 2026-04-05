-- Community Outreach listings: separate from Find Seva public feed
ALTER TABLE "SevaActivity" ADD COLUMN "listedAsCommunityOutreach" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "SevaActivity_listedAsCommunityOutreach_idx" ON "SevaActivity"("listedAsCommunityOutreach");
