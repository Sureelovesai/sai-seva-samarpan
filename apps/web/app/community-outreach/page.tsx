"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Me = {
  user: { id: string; email: string } | null;
  profile: { status: string } | null;
  role?: string | null;
  roles?: string[];
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
  const isAdmin = me?.role === "ADMIN" || (me?.roles?.includes("ADMIN") ?? false);
  /** Steps 3–5 after org approval, or for site Admins (manage any community listing). */
  const registeredWithOrganization = approved || isAdmin;

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
          program
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-600">
          Register your account and organization first. Steps 3–5 appear once your organization is approved
          {isAdmin && loggedIn ? " (site administrators can open steps 3–5 anytime)" : ""}.
        </p>

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

        <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-0">
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

          <div className="md:pl-8">
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

        {registeredWithOrganization && (
          <>
            <h2 className="mt-20 text-center text-xl font-semibold text-zinc-900 sm:text-2xl">
              {isAdmin && !approved ? "Community Network tools (admin)" : "With your approved organization"}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-zinc-600">
              Steps 3–5: publish listings, manage them, and review volunteer sign-ups
              {isAdmin && !approved ? " — as an admin you can access all community-outreach listings." : "."}
            </p>

            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0">
              <div className="relative md:border-r md:border-zinc-200 md:pr-6">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-800">
                  3
                </div>
                <h2 className="mt-6 text-center text-lg font-bold text-zinc-900 md:text-left">
                  Post a service activity
                </h2>
                <p className="mt-3 text-center text-sm leading-relaxed text-zinc-600 md:text-left">
                  Post a service activity. Your organization name appears on{" "}
                  <strong>Find Community Activity</strong> with each listing so volunteers recognize your group.
                </p>
                <div className="mt-6 flex justify-center md:justify-start">
                  <Link
                    href="/community-outreach/post-activity"
                    className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    Post a service activity
                  </Link>
                </div>
              </div>

              <div className="relative md:border-r md:border-zinc-200 md:px-4">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-800">
                  4
                </div>
                <h2 className="mt-6 text-center text-lg font-bold text-zinc-900 md:text-left">
                  Manage Activity
                </h2>
                <p className="mt-3 text-center text-sm leading-relaxed text-zinc-600 md:text-left">
                  Edit, archive, or remove listings you have posted. Keep details and coordinator contact up to date.
                </p>
                <div className="mt-6 flex justify-center md:justify-start">
                  <Link
                    href="/community-outreach/manage-activities"
                    className="inline-flex min-w-[180px] items-center justify-center rounded-full border-2 border-blue-600 bg-white px-6 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
                  >
                    Manage Activity
                  </Link>
                </div>
              </div>

              <div className="md:pl-6">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-800">
                  5
                </div>
                <h2 className="mt-6 text-center text-lg font-bold text-zinc-900 md:text-left">
                  View Sign Ups
                </h2>
                <p className="mt-3 text-center text-sm leading-relaxed text-zinc-600 md:text-left">
                  See everyone who signed up for your activities, full details in one place, and remove entries when needed.
                </p>
                <div className="mt-6 flex justify-center md:justify-start">
                  <Link
                    href="/community-outreach/view-signups"
                    className="inline-flex min-w-[180px] items-center justify-center rounded-full border-2 border-zinc-400 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                  >
                    View Sign Ups
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}

        {!registeredWithOrganization && loggedIn && !me?.profile && (
          <p className="mt-10 text-center text-sm text-zinc-600">
            Complete step 2 to submit your organization. Steps 3–5 will appear here after approval.
          </p>
        )}
      </div>
    </div>
  );
}
