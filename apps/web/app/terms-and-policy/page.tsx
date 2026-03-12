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
              Waiver of Liability & Consent Form
            </h1>
            <p className="mt-3 text-center text-lg font-semibold text-indigo-700">
              Service Activities
            </p>
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
                I / We are voluntarily participating in the Service Activities organized by the Participating
                Organizations (Sri Sathya Sai Centers/Groups and associated partners). Participation is entirely
                voluntary and of my own free will.
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
                I / We agree to release, indemnify, and hold harmless the Participating Organizations, their
                officers, volunteers, partners, and representatives from any and all claims, demands, liabilities,
                losses, damages, or expenses (including attorneys&apos; fees and court costs) arising out of or related
                to actions taken or not taken during or after these Service Activities.
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
                I / We understand that activities during these Service Activities may be photographed or recorded.
                Such photographs or recordings may include my image or likeness. I / We grant permission for these
                images or recordings to be used in publications, promotional materials, websites, social media, or
                other media formats for non-commercial and/or commercial purposes, without compensation.
              </p>
            </section>

            {/* PDF download link */}
            <div className="mt-10 text-center">
              <a
                href="/Service_Activities_Waiver_of_Liability.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <span>Download PDF</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </a>
            </div>
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
