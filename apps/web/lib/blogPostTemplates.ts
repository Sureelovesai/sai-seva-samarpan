/**
 * Starter layouts for Seva Blog full-article body HTML.
 * Inserted at the caret via RichTextEditor (semantic tags work with prose styles on the post page).
 */
export type BlogPostContentTemplate = {
  id: string;
  label: string;
  description: string;
  html: string;
};

export const BLOG_POST_CONTENT_TEMPLATES: BlogPostContentTemplate[] = [
  {
    id: "seva-recap",
    label: "Seva / event recap",
    description: "When, where, what happened, highlights, reflection",
    html: `<h2>Our seva</h2>
<p><em>Date, center or location, and who took part…</em></p>
<p>Describe what you did and why it mattered…</p>
<h3>Highlights</h3>
<ul>
<li></li>
<li></li>
<li></li>
</ul>
<p>Closing thoughts or gratitude…</p>`,
  },
  {
    id: "resource-ideas",
    label: "Ideas & resources",
    description: "Tips, links, and how others can try it",
    html: `<h2>Overview</h2>
<p>Briefly introduce the idea or resource…</p>
<h3>How to get started</h3>
<ol>
<li></li>
<li></li>
<li></li>
</ol>
<h3>Helpful links</h3>
<ul>
<li><a href="">Title of link</a> — short note</li>
</ul>
<p>Questions or contact…</p>`,
  },
  {
    id: "youth-inspires",
    label: "Youth / SSSE corner",
    description: "Activity summary and learning",
    html: `<h2>What we learned</h2>
<p>Context (group, age range, place)…</p>
<p>What we did together…</p>
<h3>Takeaways</h3>
<ul>
<li></li>
<li></li>
</ul>
<p>How we plan to continue…</p>`,
  },
  {
    id: "sai-inspires",
    label: "Sai Inspires — reflection",
    description: "Quote, reflection, and call to action",
    html: `<blockquote><p>“Your favorite quote or passage here…”</p></blockquote>
<p><em>— Source or context</em></p>
<h2>Reflection</h2>
<p>What this means to you or your center…</p>
<p>How we can put it into practice…</p>`,
  },
  {
    id: "short-announcement",
    label: "Short announcement",
    description: "Quick update with key details",
    html: `<p><strong>What:</strong> </p>
<p><strong>When:</strong> </p>
<p><strong>Where:</strong> </p>
<p><strong>Details:</strong> </p>
<p><strong>Contact:</strong> </p>`,
  },
  {
    id: "photo-story",
    label: "Photo-led story",
    description: "Captions between paragraphs (add images via hero or Drive)",
    html: `<p style="text-align:center"><em>Intro — set the scene…</em></p>
<p>First part of the story…</p>
<p><em>Caption or moment 2…</em></p>
<p>Continue the narrative…</p>
<p><strong>Thank you</strong> to everyone who participated…</p>`,
  },
];
