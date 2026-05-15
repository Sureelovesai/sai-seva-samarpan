"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppPageLoader } from "@/app/_components/AppPageLoader";
import { certificateViewPathFromSearchParams } from "@/lib/logHoursCertificate";

function buildCertificateBaseParams(sp: ReturnType<typeof useSearchParams>): URLSearchParams {
  const p = new URLSearchParams();
  for (const key of ["activity", "hours", "date", "location", "comments"] as const) {
    const v = sp.get(key);
    if (v != null && v !== "") p.set(key, v);
  }
  return p;
}

function PrepareCertificateForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const baseParams = useMemo(() => buildCertificateBaseParams(sp), [sp]);

  const [certifiedName, setCertifiedName] = useState("");
  const [parentName, setParentName] = useState("");
  const [ageAttested, setAgeAttested] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const missingBase = !sp.get("date")?.trim() || !sp.get("activity")?.trim() || !sp.get("hours")?.trim();

  const certifiedErr =
    attemptedSubmit && !certifiedName.trim() ? "Enter the name to appear on the certificate." : null;
  const parentErr = attemptedSubmit && !parentName.trim() ? "Enter the parent or legal guardian’s name." : null;
  const ageErr =
    attemptedSubmit && !ageAttested
      ? "Please confirm that the volunteer is 18 years old or younger."
      : null;

  function onContinue(e: React.FormEvent) {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (!certifiedName.trim() || !parentName.trim() || !ageAttested) return;
    const href = certificateViewPathFromSearchParams(certifiedName.trim(), baseParams);
    router.push(href);
  }

  return (
    <div className="w-full max-w-lg rounded-xl border-2 border-[#c9a861]/50 bg-white/95 px-5 py-6 shadow-lg sm:px-7 sm:py-8 print:hidden">
      <h1 className="text-center font-serif text-xl font-bold text-[#5c4518] sm:text-2xl">
        Certificate details
      </h1>

      {missingBase ? (
        <p className="mt-5 rounded-md bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 ring-1 ring-amber-200">
          This link is missing required log-hour details. Return to{" "}
          <a href="/log-hours" className="font-semibold underline">
            Log hours
          </a>{" "}
          or your{" "}
          <a href="/dashboard#dashboard-your-logged-hours" className="font-semibold underline">
            dashboard
          </a>{" "}
          and use <strong>View certificate</strong> again.
        </p>
      ) : (
        <form className="mt-5 space-y-5" onSubmit={onContinue} noValidate>
          <div>
            <label htmlFor="cert-volunteer-name" className="block text-sm font-semibold text-zinc-900">
              Name on the certificate <span className="text-red-600">*</span>
            </label>
            <p className="mt-1 text-xs text-zinc-600">The SSSE student or volunteer who will be named on the certificate.</p>
            <input
              id="cert-volunteer-name"
              name="certifiedName"
              type="text"
              autoComplete="name"
              value={certifiedName}
              onChange={(e) => setCertifiedName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-zinc-900 shadow-sm outline-none ring-amber-700/30 focus:border-amber-800 focus:ring-2"
              placeholder="Full legal name"
              aria-invalid={Boolean(certifiedErr)}
              aria-describedby={certifiedErr ? "cert-volunteer-name-err" : undefined}
            />
            {certifiedErr ? (
              <p id="cert-volunteer-name-err" className="mt-1.5 text-sm font-medium text-red-700" role="alert">
                {certifiedErr}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="cert-parent-name" className="block text-sm font-semibold text-zinc-900">
              Parent or legal guardian <span className="text-red-600">*</span>
            </label>
            <p className="mt-1 text-xs text-zinc-600">Full name of the parent or guardian attesting to this request.</p>
            <input
              id="cert-parent-name"
              name="parentName"
              type="text"
              autoComplete="name"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-zinc-900 shadow-sm outline-none ring-amber-700/30 focus:border-amber-800 focus:ring-2"
              placeholder="Parent or guardian full name"
              aria-invalid={Boolean(parentErr)}
              aria-describedby={parentErr ? "cert-parent-name-err" : undefined}
            />
            {parentErr ? (
              <p id="cert-parent-name-err" className="mt-1.5 text-sm font-medium text-red-700" role="alert">
                {parentErr}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-3">
            <label className="flex cursor-pointer gap-3 text-sm leading-snug text-zinc-800">
              <input
                type="checkbox"
                checked={ageAttested}
                onChange={(e) => setAgeAttested(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-500 text-amber-900 focus:ring-amber-800"
                aria-invalid={Boolean(ageErr)}
                aria-describedby={ageErr ? "cert-age-err" : undefined}
              />
              <span>
                I certify that the person named above for the certificate is <strong>18 years old or younger</strong>.
                <span className="text-red-600"> *</span>
              </span>
            </label>
            {ageErr ? (
              <p id="cert-age-err" className="mt-2 pl-7 text-sm font-medium text-red-700" role="alert">
                {ageErr}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-emerald-800 px-4 py-3 text-sm font-bold tracking-wide text-white shadow hover:bg-emerald-900"
          >
            View certificate
          </button>
        </form>
      )}
    </div>
  );
}

export default function CertificatePreparePage() {
  return (
    <Suspense
      fallback={
        <div className="print:hidden">
          <AppPageLoader layout="compact" label="Loading" message="Loading…" />
        </div>
      }
    >
      <PrepareCertificateForm />
    </Suspense>
  );
}
