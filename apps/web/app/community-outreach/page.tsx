"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Me = {
  user: { id: string; email: string } | null;
  profile: { status: string } | null;
  errorCode?: string;
};

export default function CommunityOutreachPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [meLoadFailed, setMeLoadFailed] = useState(false);

  useEffect(() => {
    fetch("/api/community-outreach/me", { credentials: "include" })
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as Me & { errorCode?: string };
        if (!r.ok && (data?.errorCode === "DATABASE_ERROR" || r.status >= 500)) {
          setMeLoadFailed(true);
          setMe(null);
          return;
        }
        setMe(data);
      })
      .catch(() => {
        setMeLoadFailed(true);
        setMe(null);
      });
  }, []);

  const loggedIn = !!me?.user;
  const profileStatus = me?.profile?.status;
  const approved = profileStatus === "APPROVED";
  const pending = profileStatus === "PENDING";
  const rejected = profileStatus === "REJECTED";

  return (
    <div className="min-h-screen bg-white text-zinc-800">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Join the{" "}
          <span className="relative inline-block">
            <span className="relative z-10">Community Outreach</span>
            <span
              className="absolute bottom-0 left-0 right-0 h-[3px] bg-amber-300"
              aria-hidden
            />
          </span>{" "}
          program in three easy steps
        </h1>

        {meLoadFailed && (
          <div
            className="mx-auto mt-8 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950"
            role="alert"
          >
            <p className="font-semibold">Could not verify your login status</p>
            <p className="mt-1 text-amber-900/90">
              The app could not reach the database. Check DATABASE_URL, run Prisma migrations, then refresh.
            </p>
          </div>
        )}

        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-0">
          <div className="relative md:border-r md:border-zinc-200 md:pr-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 text-2xl font-semibold text-zinc-600">
              1
            </div>
            <h2 className="mt-6 text-center text-lg font-bold text-zinc-900 md:text-left">
              Create an account
            </h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-zinc-600 md:text-left">
              Create an account with your name and email (sign up), then log in. Use the same account
              for your organization profile and service listings.
            </p>
          </div>

          <div className="relative md:border-r md:border-zinc-200 md:px-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 text-2xl font-semibold text-zinc-600">
              2
            </div>
            <h2 className="mt-6 text-center text-lg font-bold text-zinc-900 md:text-left">
              Add your organization
            </h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-zinc-600 md:text-left">
              Fill out a profile for your organization. Our review team will review your submission
              and notify you by email.
            </p>
          </div>

          <div className="md:pl-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 text-2xl font-semibold text-zinc-600">
              3
            </div>
            <h2 className="mt-6 text-center text-lg font-bold text-zinc-900 md:text-left">
              Post a service activity
            </h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-zinc-600 md:text-left">
              Once approved, you are ready to post a service activity. Your organization name appears
              on <strong>Find Community Activity</strong> with each listing so volunteers recognize your group.
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-3">
          {!loggedIn && (
            <Link
              href="/login?mode=signup&next=/community-outreach/profile"
              className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Get started
            </Link>
          )}
          {loggedIn && !approved && (
            <Link
              href="/community-outreach/profile"
              className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              {pending ? "Update organization profile" : rejected ? "Resubmit organization profile" : "Add organization profile"}
            </Link>
          )}
          {loggedIn && approved && (
            <Link
              href="/community-outreach/post-activity"
              className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Post a service activity
            </Link>
          )}
          {pending && (
            <p className="text-center text-sm text-amber-800">
              Your organization profile is pending review. You’ll receive an email when it’s approved.
            </p>
          )}
          {rejected && (
            <p className="max-w-md text-center text-sm text-red-700">
              Your last submission was not approved. You can update your profile and submit again.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
