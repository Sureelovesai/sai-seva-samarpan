import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isActivityEnded, isSignupCounted } from "@/lib/activityEnded";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop";

function formatDate(d: Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SevaBlogStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activity = await prisma.sevaActivity.findFirst({
    where: { id, status: "PUBLISHED", isActive: true },
    include: { signups: { select: { id: true, status: true } } },
  });

  if (!activity) notFound();

  const imageUrl = activity.imageUrl || PLACEHOLDER_IMAGE;
  // Only count volunteers who participated (activity ended). When ended, include CANCELLED so we don't lose count if cancelled after
  const participatedCount =
    isActivityEnded(activity)
      ? activity.signups.filter((s: (typeof activity.signups)[number]) => isSignupCounted(s.status, true)).length
      : 0;

  return (
    <div className="min-h-screen bg-[#fefaf8]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-[#7a6b65]">
          <Link href="/seva-blog" className="hover:text-[#8b6b5c] hover:underline">
            Seva Blog
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#6b5344]">{activity.title}</span>
        </nav>

        <article className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className="relative aspect-video w-full bg-[#f8e4e1]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={activity.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#7a6b65]">
              <span>{activity.category}</span>
              <span>·</span>
              <span>{activity.city}</span>
              {(activity.startDate || activity.createdAt) && (
                <>
                  <span>·</span>
                  <time dateTime={String(activity.startDate ?? activity.createdAt)}>
                    {formatDate(activity.startDate ?? activity.createdAt)}
                  </time>
                </>
              )}
            </div>
            <h1 className="mt-3 font-serif text-3xl font-semibold text-[#6b5344] md:text-4xl">
              {activity.title}
            </h1>
            {participatedCount > 0 && (
              <p className="mt-2 text-sm text-[#7a6b65]">
                {participatedCount} volunteer
                {participatedCount !== 1 ? "s" : ""} participated
              </p>
            )}
            <div className="prose prose-lg mt-6 max-w-none text-[#4a3f3a]">
              {activity.description ? (
                <div className="whitespace-pre-wrap">{activity.description}</div>
              ) : (
                <p>
                  {activity.category} in {activity.city}. Join us in service.
                </p>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/find-seva"
                className="inline-flex items-center rounded-lg bg-[#8b6b5c] px-5 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90"
              >
                Find more Seva opportunities →
              </Link>
              <Link
                href="/seva-blog"
                className="inline-flex items-center rounded-lg border-2 border-[#8b6b5c] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#8b6b5c] hover:bg-[#fdf2f0]"
              >
                ← Back to Seva Blog
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
