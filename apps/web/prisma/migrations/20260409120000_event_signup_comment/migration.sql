-- Optional RSVP comment on portal event sign-ups
ALTER TABLE "EventSignup" ADD COLUMN "comment" VARCHAR(500);
