-- Optional article body backdrop (editor + reader + PDF), see lib/articleCanvasPresentation.ts
ALTER TABLE "BlogPost" ADD COLUMN "articleCanvas" JSONB;
