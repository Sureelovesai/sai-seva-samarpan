-- Allow moderators to mark pending posts as rejected (with optional email to submitter).
ALTER TYPE "BlogPostStatus" ADD VALUE 'REJECTED';
