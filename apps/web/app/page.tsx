"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SevaPublicCalendarSection } from "./_components/SevaPublicCalendarSection";

const CATEGORY_COLORS: Record<string, string> = {
  "Animal Care": "bg-amber-700",
  "Children": "bg-pink-600",
  "Cultural or Places of Worship": "bg-purple-700",
  "Educare": "bg-emerald-800",
  "Environmental": "bg-teal-700",
  "Go Green": "bg-green-700",
  "Homeless Shelters": "bg-slate-600",
  "Medicare": "bg-blue-700",
  "Narayana Seva/Food": "bg-orange-700",
  "Other": "bg-zinc-600",
  "Senior Citizens": "bg-rose-700",
  "Sociocare": "bg-orange-900",
  "Veterans": "bg-indigo-800",
  "Women Seva": "bg-pink-700",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto my-10 text-center">
      <div className="text-5xl font-extrabold tracking-wide text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.15)]">
        ----{children}----
      </div>
    </div>
  );
}

type FeaturedActivity = {
  id: string;
  title: string;
  category: string;
  city: string;
  description: string | null;
  imageUrl: string | null;
};

/** Dedupe by id so React never sees duplicate keys. */
function uniqById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

const FEATURED_SLIDER_AUTOPLAY_MS = 2000;

const MOBILE_BREAKPOINT = 640;

function FeaturedSevaSection() {
  const [activities, setActivities] = useState<FeaturedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(2);
  const sectionRef = useRef<HTMLElement>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const updateCardsPerView = () => {
      setCardsPerView(typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT ? 1 : 2);
    };
    updateCardsPerView();
    window.addEventListener("resize", updateCardsPerView);
    return () => window.removeEventListener("resize", updateCardsPerView);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/seva-activities?featured=true", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setActivities(uniqById(data));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Auto-slide only when section is in view
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || activities.length <= 1) return;
    const max = Math.max(0, activities.length - cardsPerView);

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) return;
        if (entry.isIntersecting) {
          autoplayRef.current = setInterval(() => {
            setSlideIndex((i) => (i >= max ? 0 : i + 1));
          }, FEATURED_SLIDER_AUTOPLAY_MS);
        } else {
          if (autoplayRef.current) {
            clearInterval(autoplayRef.current);
            autoplayRef.current = null;
          }
        }
      },
      { threshold: 0.25, rootMargin: "0px" }
    );
    observer.observe(section);
    return () => {
      observer.disconnect();
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    };
  }, [activities.length, cardsPerView]);

  const total = activities.length;
  const maxIndex = Math.max(0, total - cardsPerView);
  const goPrev = () => setSlideIndex((i) => (i <= 0 ? maxIndex : i - 1));
  const goNext = () => setSlideIndex((i) => (i >= maxIndex ? 0 : i + 1));
  // Track width = total * (100/cardsPerView) % of container; each card = (100/total) % of track so card = (100/cardsPerView) % of container
  const trackWidthPercent = total > 0 ? (total * 100) / cardsPerView : 100;
  const cardWidthPercentOfTrack = total > 0 ? 100 / total : 100;
  const translatePercent = total > 0 ? (slideIndex / total) * 100 : 0;

  return (
    <section
      ref={sectionRef}
      className="bg-[linear-gradient(90deg,rgba(55,160,140,0.78),rgba(70,130,210,0.78),rgba(95,85,185,0.78))] py-10"
    >
      <div className="flex flex-col items-center justify-center py-10">
        <div className="flex items-center justify-center gap-4">
          <span className="h-px w-12 bg-white/60 sm:w-16 md:w-20" aria-hidden />
          <h2 className="text-4xl font-extrabold tracking-[0.2em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] sm:text-5xl" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
            Featured Seva Activities
          </h2>
          <span className="h-px w-12 bg-white/60 sm:w-16 md:w-20" aria-hidden />
        </div>
        <span className="mt-3 block h-0.5 w-24 bg-white/80" aria-hidden />
      </div>

      {loading ? (
        <div className="py-16 text-center text-lg text-slate-600">
          Loading…
        </div>
      ) : activities.length === 0 ? (
        <div className="py-16 text-center text-lg text-slate-600">
          No featured activities yet. Mark activities as Featured in Add Seva Activity or Manage Seva → Edit.
        </div>
      ) : (
        <div className="relative mx-auto max-w-6xl px-2 sm:px-4">
          {/* Slider: explicit track width and card % of track so each slide shows exactly 1 or 2 full cards */}
          <div className="overflow-hidden">
            <div
              className="flex shrink-0 transition-transform duration-300 ease-out"
              style={{
                width: `${trackWidthPercent}%`,
                transform: `translateX(-${translatePercent}%)`,
              }}
            >
              {activities.map((c) => (
                <div
                  key={c.id}
                  className="flex shrink-0 flex-col px-1 sm:px-2"
                  style={{ width: `${cardWidthPercentOfTrack}%`, minWidth: `${cardWidthPercentOfTrack}%` }}
                >
                  <div className="mx-auto grid h-[380px] w-full max-w-[420px] grid-cols-1 overflow-hidden rounded-lg shadow-[0_14px_30px_rgba(0,0,0,0.25)] sm:h-[440px] sm:max-w-none sm:grid-cols-[1fr_1.4fr]">
                    <div className={`flex min-h-0 flex-col ${CATEGORY_COLORS[c.category] ?? "bg-indigo-600"} p-6 text-white sm:p-8`}>
                      <div className="text-xl font-bold leading-tight sm:text-2xl">
                        {c.title}
                        <br />
                        {c.city}
                      </div>
                      <div className="mt-6 max-w-[14rem] flex-1 overflow-hidden text-base leading-7 line-clamp-4 sm:mt-8 sm:text-lg">
                        {c.description || "No description."}
                      </div>
                      <Link
                        href={`/seva-activities?id=${encodeURIComponent(c.id)}`}
                        className="mt-8 inline-block shrink-0 bg-white px-6 py-2.5 text-base font-semibold text-slate-700 hover:bg-slate-100 sm:mt-10 sm:px-8 sm:py-3 sm:text-lg"
                      >
                        View More
                      </Link>
                    </div>
                    <div className="relative h-full min-h-0 bg-slate-100">
                      {c.imageUrl ? (
                        <Image
                          src={c.imageUrl}
                          alt={c.title}
                          fill
                          className="object-contain object-center"
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-zinc-200 text-zinc-500">
                          No image
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prev / Next */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md hover:bg-white sm:p-3"
                aria-label="Previous"
              >
                <span className="text-2xl text-slate-700">‹</span>
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md hover:bg-white sm:p-3"
                aria-label="Next"
              >
                <span className="text-2xl text-slate-700">›</span>
              </button>
            </>
          )}

          {/* Dots — one per view on mobile, two on desktop */}
          {total > cardsPerView && (
            <div className="mt-6 flex justify-center gap-2">
              {Array.from({ length: maxIndex + 1 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlideIndex(i)}
                  className={`h-2.5 w-2.5 rounded-full transition-colors sm:h-3 sm:w-3 ${i === slideIndex ? "bg-white" : "bg-white/50 hover:bg-white/70"}`}
                  aria-label={`Go to view ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

type ImpactStats = { activities: number; volunteers: number; hours: number };

function OurImpactSection() {
  const [stats, setStats] = useState<ImpactStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/impact-stats", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setStats(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const items: Array<{ value: string; label: string; boxClass: string; valueClass: string; labelClass: string }> = [
    {
      value: stats != null ? String(stats.activities) : "…",
      label: "Activities",
      boxClass:
        "bg-gradient-to-br from-amber-100 via-amber-50 to-yellow-200 border-2 border-amber-300/80 shadow-[inset_2px_2px_6px_rgba(255,255,255,0.7),inset_-1px_-1px_4px_rgba(0,0,0,0.06),6px_6px_0_0_rgba(180,83,9,0.35),8px_8px_20px_rgba(0,0,0,0.2)]",
      valueClass: "text-amber-900",
      labelClass: "text-amber-800",
    },
    {
      value: stats != null ? String(stats.volunteers) : "…",
      label: "Volunteers",
      boxClass:
        "bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-200 border-2 border-emerald-400/80 shadow-[inset_2px_2px_6px_rgba(255,255,255,0.7),inset_-1px_-1px_4px_rgba(0,0,0,0.06),6px_6px_0_0_rgba(5,150,105,0.4),8px_8px_20px_rgba(0,0,0,0.2)]",
      valueClass: "text-emerald-900",
      labelClass: "text-emerald-800",
    },
    {
      value: stats != null ? String(stats.hours) : "…",
      label: "Hours",
      boxClass:
        "bg-gradient-to-br from-indigo-100 via-violet-50 to-purple-200 border-2 border-indigo-400/80 shadow-[inset_2px_2px_6px_rgba(255,255,255,0.7),inset_-1px_-1px_4px_rgba(0,0,0,0.06),6px_6px_0_0_rgba(79,70,229,0.4),8px_8px_20px_rgba(0,0,0,0.2)]",
      valueClass: "text-indigo-900",
      labelClass: "text-indigo-800",
    },
  ];

  return (
    <section
      className="py-16 text-center"
      style={{
        background: "linear-gradient(90deg, #6b5b6f 0%, #5a4d5e 25%, #4a4d4a 50%, #3d4a3d 75%, #2d3b2f 100%)",
      }}
    >
      <div className="mx-auto max-w-2xl px-6 py-5 sm:px-8 sm:py-6">
        <div className="rounded-xl bg-white/95 px-5 py-5 shadow-lg ring-1 ring-black/5 sm:px-8 sm:py-6">
          <p className="font-serif text-xl font-black italic text-red-700 md:text-2xl lg:text-3xl" style={{ color: "#b91c1b" }}>
            &ldquo;Selfless Service Alone Can Achieve Unity Of Mankind.&rdquo;
          </p>
          <p className="mt-3 font-serif text-base font-bold text-slate-800 md:text-lg">
            — Sri Sathya Sai Baba
          </p>
        </div>
      </div>
      <div className="my-10 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center gap-4">
          <span className="h-px w-12 bg-white/60 sm:w-16 md:w-20" aria-hidden />
          <h2 className="text-4xl font-extrabold tracking-[0.2em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] sm:text-5xl" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
            Our Impact
          </h2>
          <span className="h-px w-12 bg-white/60 sm:w-16 md:w-20" aria-hidden />
        </div>
        <span className="mt-3 block h-0.5 w-24 bg-amber-400/80" aria-hidden />
      </div>

      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-10 px-4 md:flex-row">
        {items.map((s) => (
          <div
            key={s.label}
            className={`group flex h-44 w-52 flex-col items-center justify-center rounded-lg ${s.boxClass}`}
          >
            <div className="flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-3 group-hover:scale-[1.04]">
              <div className={`text-3xl font-bold ${s.valueClass}`}>{s.value}</div>
              <div className={`mt-6 text-3xl font-extrabold ${s.labelClass}`}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Hero paths: add `public/banner_newest.png` (preferred) or `public/banner_newest.PNG` — Linux/Vercel is case-sensitive. */
const HERO_BANNER_SRCS = ["/banner_newest.png", "/banner_newest.PNG"] as const;

/**
 * Shown only below the `sm` breakpoint in portrait orientation.
 * Add `public/mobile_copy_newest.PNG` (or `.png`) for prod; if missing, falls back to desktop banner then SVG.
 */
const HERO_BANNER_MOBILE_PORTRAIT_SRCS = [
  "/mobile_copy_newest.PNG",
  "/mobile_copy_newest.png",
] as const;

function HomeHeroImageLayer({
  attemptSrcs,
  alt,
  priority,
}: {
  attemptSrcs: readonly string[];
  alt: string;
  priority?: boolean;
}) {
  const [srcIndex, setSrcIndex] = useState(0);
  const [useSvgFallback, setUseSvgFallback] = useState(false);

  if (useSvgFallback) {
    return (
      <img
        src="/manage-hero-swami.svg"
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain object-top"
        width={1200}
        height={800}
        decoding="async"
      />
    );
  }

  const src = attemptSrcs[srcIndex] ?? attemptSrcs[0];
  if (!src) {
    return (
      <img
        src="/manage-hero-swami.svg"
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain object-top"
        width={1200}
        height={800}
        decoding="async"
      />
    );
  }

  return (
    <Image
      key={src}
      src={src}
      alt={alt}
      fill
      priority={priority}
      className="object-contain object-top"
      sizes="100vw"
      onError={() => {
        if (srcIndex + 1 < attemptSrcs.length) {
          setSrcIndex((i) => i + 1);
        } else {
          setUseSvgFallback(true);
        }
      }}
    />
  );
}

/**
 * Desktop / tablet / mobile landscape: wide hero.
 * Mobile portrait only: tall hero (`HERO_BANNER_MOBILE_PORTRAIT_SRCS`, then same fallbacks as desktop).
 */
function HomeHeroBanner() {
  const desktopAttempts = [...HERO_BANNER_SRCS];
  const mobilePortraitAttempts = [
    ...HERO_BANNER_MOBILE_PORTRAIT_SRCS,
    ...HERO_BANNER_SRCS,
  ];

  return (
    <>
      {/* sm+ always, or narrow width in landscape (not portrait) */}
      <div className="absolute inset-0 hidden max-sm:landscape:block sm:block">
        <div className="relative h-full w-full min-h-0">
          <HomeHeroImageLayer attemptSrcs={desktopAttempts} alt="Seva Wheel" priority />
        </div>
      </div>
      {/* Narrow portrait phones only */}
      <div className="absolute inset-0 block max-sm:landscape:hidden sm:hidden">
        <div className="relative h-full w-full min-h-0">
          <HomeHeroImageLayer attemptSrcs={mobilePortraitAttempts} alt="Seva Wheel" priority />
        </div>
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* HERO — full-width image under the menu. */}
      <section
        className="-mt-2 w-full overflow-hidden py-0"
        style={{
          background: "linear-gradient(180deg, #f8fcff 0%, #e8f7fe 20%, #d4f0fd 45%, #b0e5fc 70%, #7dd3fa 100%)",
        }}
      >
        <div className="w-full px-0 py-0">
          <div className="relative flex h-[calc(100vh-5rem-20px)] w-full items-center justify-center overflow-hidden pt-2 sm:pt-4 md:pt-6 -mt-[5px]">
            <div className="relative h-full w-full min-h-0">
              <HomeHeroBanner />
            </div>
          </div>
        </div>
      </section>

      {/* BUTTONS ROW — equal width: My Seva Dashboard natural, Find Seva stretches to match */}
      <section className="bg-[linear-gradient(90deg,rgba(112,153,63,0.55),rgba(200,214,117,0.55),rgba(255,170,120,0.55))] py-14">
        <div className="mx-auto flex max-w-5xl flex-col items-stretch justify-center gap-10 px-4 landscape-desktop:flex-row md:flex-row">
          <div className="flex w-full max-w-xl flex-col gap-6 landscape-desktop:max-w-none landscape-desktop:flex-1 landscape-desktop:flex-row landscape-desktop:basis-0 landscape-desktop:gap-10 md:max-w-none md:flex-1 md:flex-row md:basis-0 md:gap-10">
            <Link
              href="/find-seva"
              className="flex min-w-0 flex-1 items-center justify-center rounded-full bg-[linear-gradient(180deg,#2563eb_0%,#0ea5e9_50%,#059669_100%)] px-6 py-4 text-xl font-extrabold tracking-[0.15em] text-white shadow-[0_18px_30px_rgba(0,0,0,0.25)] transition-colors hover:[background:#059669] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] sm:px-8 sm:py-4 sm:text-2xl sm:tracking-[0.18em] md:px-12 md:py-5 md:text-3xl md:tracking-[0.20em] lg:px-16 lg:py-6 lg:text-4xl"
            >
              Find Seva <span className="ml-2 inline-block text-2xl leading-none sm:ml-3 sm:text-3xl md:text-4xl lg:text-5xl">❣</span>
            </Link>

            <Link
              href="/dashboard"
              className="flex min-w-0 flex-1 items-center justify-center rounded-full bg-[linear-gradient(180deg,#6d28d9,#b91c1c)] px-6 py-4 text-xl font-extrabold tracking-[0.15em] text-white shadow-[0_18px_30px_rgba(0,0,0,0.25)] [text-shadow:0_1px_2px_rgba(0,0,0,0.4)] transition-colors hover:[background:#059669] sm:px-8 sm:py-4 sm:text-2xl sm:tracking-[0.18em] md:px-12 md:py-5 md:text-3xl md:tracking-[0.20em] lg:px-16 lg:py-6 lg:text-4xl"
            >
              My Seva Dashboard <span className="ml-2 inline-block text-2xl leading-none sm:ml-3 sm:text-3xl md:text-4xl lg:text-5xl">❣</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Public seva calendar — visible to everyone, no login */}
      <section
        className="bg-[linear-gradient(180deg,#f0f9ff_0%,#e0f2fe_40%,#dbeafe_100%)] py-4"
        aria-label="Seva activity calendar"
      >
        <SevaPublicCalendarSection />
      </section>

      {/* OUR IMPACT */}
      <OurImpactSection />

      {/* FEATURED SEVA */}
      <FeaturedSevaSection />

      
    </div>
  );
}