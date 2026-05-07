"use client";

import Link from "next/link";

export default function TermsAndPolicyPage() {
  return (
    <div className="min-h-[calc(100vh-1px)] bg-[radial-gradient(circle_at_40%_10%,rgba(255,255,255,0.85),rgba(255,255,255,0.0)),linear-gradient(135deg,rgba(120,140,90,0.12),rgba(240,220,140,0.18),rgba(120,140,90,0.12))]">
      <div className="h-[2px] w-full bg-black/10" />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Card container */}
        <article className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          {/* Header */}
          <header className="border-b border-slate-200/80 bg-gradient-to-br from-slate-50 to-white px-6 py-8 sm:px-10 sm:py-10">
            <h1 className="text-center text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
              Acknowledgment, Release, and Media Consent
            </h1>
            <div className="mx-auto mt-4 h-px w-16 bg-indigo-300/80" />
          </header>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <p className="text-slate-700 sm:text-lg">
              I / We hereby understand, acknowledge, and agree to the following:
            </p>

            {/* Section 1 */}
            <section className="mt-8 rounded-xl border border-slate-100 bg-slate-50/60 p-5 sm:p-6">
              <h2 className="flex items-center gap-3 text-lg font-bold text-slate-800 sm:text-xl">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-700">
                  1
                </span>
                Voluntary Participation
              </h2>
              <p className="mt-3 leading-relaxed text-slate-700">
                I / We voluntarily choose to participate in the Service Activities organized by the Participating
                Organizations (Sri Sathya Sai Centers/Groups and associated partners). Participation is entirely
                voluntary and undertaken of my / our own free will.
              </p>
            </section>

            {/* Section 2 */}
            <section className="mt-6 rounded-xl border border-slate-100 bg-slate-50/60 p-5 sm:p-6">
              <h2 className="flex items-center gap-3 text-lg font-bold text-slate-800 sm:text-xl">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-700">
                  2
                </span>
                Release and Indemnification
              </h2>
              <p className="mt-3 leading-relaxed text-slate-700">
                I / We agree to release, indemnify, and hold harmless the Participating Organizations, including their
                officers, volunteers, representatives, affiliates, and partners, from and against any and all claims,
                demands, liabilities, losses, damages, injuries, costs, or expenses (including reasonable
                attorneys&apos; fees and court costs) arising out of or related to participation in these Service
                Activities, including any actions taken or omitted before, during, or after such activities.
              </p>
            </section>

            {/* Section 3 */}
            <section className="mt-6 rounded-xl border border-slate-100 bg-slate-50/60 p-5 sm:p-6">
              <h2 className="flex items-center gap-3 text-lg font-bold text-slate-800 sm:text-xl">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-700">
                  3
                </span>
                Media Release
              </h2>
              <p className="mt-3 leading-relaxed text-slate-700">
                I / We understand that photographs, videos, or audio recordings may be taken during these Service
                Activities and may include my / our image, voice, or likeness. I / We hereby grant permission to the
                Participating Organizations to use such photographs or recordings in publications, newsletters,
                promotional materials, websites, presentations, social media, or other organizational communications,
                without compensation or further approval.
              </p>
            </section>

            {/* Section 4 */}
            <section className="mt-6 rounded-xl border border-slate-100 bg-slate-50/60 p-5 sm:p-6">
              <h2 className="flex items-center gap-3 text-lg font-bold text-slate-800 sm:text-xl">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-700">
                  4
                </span>
                Participation of Minors
              </h2>
              <p className="mt-3 leading-relaxed text-slate-700">
                If any participant is under the age of 18 years, I / We confirm that participation is authorized by the
                child&apos;s parent or legal guardian. The parent or legal guardian agrees to all terms stated herein on
                behalf of the minor participant, including participation, release of liability, indemnification, and
                media consent.
              </p>
            </section>

            {/* Section 5 */}
            <section className="mt-6 rounded-xl border border-slate-100 bg-slate-50/60 p-5 sm:p-6">
              <h2 className="flex items-center gap-3 text-lg font-bold text-slate-800 sm:text-xl">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-700">
                  5
                </span>
                Assumption of Risk
              </h2>
              <p className="mt-3 leading-relaxed text-slate-700">
                I / We understand that participation in these Service Activities may involve certain inherent risks,
                including but not limited to travel, outdoor activities, physical activities, and use of tools or
                equipment. I / We voluntarily assume all such risks associated with participation.
              </p>
            </section>
          </div>
        </article>

        <p className="mt-8 text-center">
          <Link
            href="/seva-activities"
            className="text-sm font-semibold text-indigo-600 underline hover:text-indigo-700"
          >
            ← Back to Seva Activities
          </Link>
        </p>
      </div>
    </div>
  );
}
