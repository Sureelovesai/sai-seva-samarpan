/**
 * Role-based QA — all pages, all sections, functionality language only.
 */

const {
  GUEST_HOME,
  VOLUNTEER_HOME,
  COORDINATOR_HOME,
  BLOG_ADMIN_HOME,
  ADMIN_HOME,
  EVENT_ADMIN_HOME,
} = require("./homePageTests.cjs");
const { buildFindSevaPageTests } = require("./findSevaPageTests.cjs");
const { buildDashboardPageTests } = require("./dashboardPageTests.cjs");
const {
  buildSevaBlogPageTests,
  buildBlogPostDetailPageTests,
} = require("./sevaBlogPageTests.cjs");
const {
  buildSevaDetailsPageTests,
  buildLogHoursPageTests,
  buildCertificatePageTests,
  buildSevaAdminDashboardTests,
  buildAddSevaActivityTests,
  buildManageSevaTests,
  buildSevaSignUpsTests,
  buildRolesPageTests,
  buildLoginPageTests,
  buildEventsPublicTests,
  buildEventAdminTests,
} = require("./expandedPageTests.cjs");
const {
  buildPublicCommunityBrowse,
  buildCommunityOutreachHubTests,
  buildCommunityOrgProfileTests,
  buildPostCommunityActivityTests,
  buildManageCommunityActivitiesTests,
  buildViewCommunitySignUpsTests,
  buildAdminCommunityReviewTests,
} = require("./communitySevaPageTests.cjs");

function buildRole(config) {
  return {
    folder: config.folder,
    fileName: config.fileName,
    title: config.title,
    loginHint: config.loginHint,
    shouldNotSee: config.shouldNotSee,
    testerNotes: config.testerNotes,
    pageIndex: config.pages.map((p) => ({
      sheet: p.sheetName,
      summary:
        p.intro?.body?.split("\n")[0] ||
        p.tests[0]?.check ||
        "See all rows on this sheet.",
    })),
    pages: config.pages,
  };
}

/** Community Network sheets — public browse (every role) */
function communityBrowseGuest(prefix) {
  return buildPublicCommunityBrowse(prefix, {
    roleTitle: "Guest",
    before: "Logged out",
    guest: true,
  });
}

function communityBrowseLoggedIn(prefix, roleTitle, before, isAdmin = false) {
  const sheets = buildPublicCommunityBrowse(prefix, {
    roleTitle,
    before,
    guest: false,
  });
  // Replace generic hub with admin-aware hub when needed
  if (isAdmin) {
    return sheets.map((s) =>
      s.sheetName === "Community Outreach hub"
        ? buildCommunityOutreachHubTests(prefix, {
            roleTitle,
            before,
            intro: "Admins may see steps 3–5 for community tools even without personal org approval.",
            loggedIn: true,
            approvedOrg: true,
            isAdmin: true,
          })
        : s
    );
  }
  return sheets;
}

/** Organization owner workflow — use approved test org account when assigned */
function communityOrgOwnerSheets(prefix, roleTitle, before) {
  return [
    buildCommunityOrgProfileTests(prefix, { roleTitle, before: before + " — use approved org test account" }),
    buildPostCommunityActivityTests(prefix, { roleTitle, before }),
    buildManageCommunityActivitiesTests(prefix, { roleTitle, before }),
    buildViewCommunitySignUpsTests(prefix, { roleTitle, before }),
  ];
}

const GUEST_PAGES = [
  GUEST_HOME,
  buildFindSevaPageTests("GST", {
    roleTitle: "Guest",
    before: "Logged out",
    intro: "Center seva listings (not community).",
    joinExpected: "Login or sign-up required.",
  }),
  buildSevaDetailsPageTests("GST", { roleTitle: "Guest", guest: true, before: "Logged out" }),
  ...communityBrowseGuest("GST"),
  buildSevaBlogPageTests("GST", {
    roleTitle: "Guest",
    before: "Logged out",
    intro: "Read stories; cannot create posts.",
    loggedIn: false,
    canGenerateReport: false,
    canEditOnCards: false,
    createPostExpected: "Login required modal with **Log in**.",
  }),
  buildBlogPostDetailPageTests("GST", {
    roleTitle: "Guest",
    before: "Logged out",
    canEdit: false,
    loggedIn: false,
  }),
  buildDashboardPageTests("GST", {
    roleTitle: "Guest",
    before: "Logged out",
    intro: "Dashboard requires login.",
    guestWall: true,
  }),
  buildLoginPageTests("GST", { before: "Logged out" }),
];

const VOLUNTEER_PAGES = [
  VOLUNTEER_HOME,
  buildFindSevaPageTests("VOL", {
    roleTitle: "Volunteer",
    before: "Logged in",
    intro: "Center seva.",
    joinExpected: "Sign-up succeeds or waitlist.",
  }),
  buildSevaDetailsPageTests("VOL", { roleTitle: "Volunteer", guest: false, before: "Logged in" }),
  ...communityBrowseLoggedIn("VOL", "Volunteer", "Logged in"),
  buildSevaBlogPageTests("VOL", {
    roleTitle: "Volunteer",
    before: "Logged in",
    intro: "Read, react, submit posts for approval.",
    loggedIn: true,
    canGenerateReport: false,
    canEditOnCards: false,
    createPostExpected: "Create post form; thank-you message after submit.",
  }),
  buildBlogPostDetailPageTests("VOL", {
    roleTitle: "Volunteer",
    before: "Logged in",
    canEdit: false,
    loggedIn: true,
  }),
  buildDashboardPageTests("VOL", {
    roleTitle: "Volunteer",
    before: "Logged in",
    intro: "Sign-ups and log hours.",
  }),
  buildLogHoursPageTests("VOL", { roleTitle: "Volunteer", before: "Logged in" }),
  buildCertificatePageTests("VOL", { roleTitle: "Volunteer", before: "Logged in" }),
];

const COORD_PAGES = [
  COORDINATOR_HOME,
  buildFindSevaPageTests("CRD", {
    roleTitle: "Coordinator",
    before: "Logged in",
    intro: "Center seva you publish.",
    joinExpected: "Personal join works.",
  }),
  buildSevaDetailsPageTests("CRD", { roleTitle: "Coordinator", guest: false, before: "Logged in" }),
  ...communityBrowseLoggedIn("CRD", "Coordinator", "Logged in"),
  buildAdminCommunityReviewTests("CRD", {
    roleTitle: "Coordinator",
    before: "Logged in as coordinator",
    onDashboardToo: true,
  }),
  buildSevaAdminDashboardTests("CRD", {
    roleTitle: "Coordinator",
    hasRolesTile: false,
    hasBlogPending: false,
    hasOutreachPending: true,
    hasAnalytics: true,
    canDeleteBlog: false,
    before: "Logged in",
  }),
  buildAddSevaActivityTests("CRD", { roleTitle: "Coordinator", before: "Logged in" }),
  buildManageSevaTests("CRD", { roleTitle: "Coordinator", before: "Logged in" }),
  buildSevaSignUpsTests("CRD", { roleTitle: "Coordinator", before: "Logged in" }),
  buildSevaBlogPageTests("CRD", {
    roleTitle: "Coordinator",
    before: "Logged in",
    intro: "Blog + Generate report.",
    loggedIn: true,
    canGenerateReport: true,
    canEditOnCards: false,
    createPostExpected: "Create post form opens.",
  }),
  buildBlogPostDetailPageTests("CRD", {
    roleTitle: "Coordinator",
    before: "Logged in",
    canEdit: false,
    loggedIn: true,
  }),
  buildDashboardPageTests("CRD", {
    roleTitle: "Coordinator",
    before: "Logged in",
    intro: "Personal dashboard.",
  }),
  buildLogHoursPageTests("CRD", { roleTitle: "Coordinator", before: "Logged in" }),
];

const BLOG_ADMIN_PAGES = [
  BLOG_ADMIN_HOME,
  buildFindSevaPageTests("BLG", {
    roleTitle: "Blog Admin",
    before: "Logged in",
    intro: "Browse center seva.",
    joinExpected: "Join works.",
  }),
  ...communityBrowseLoggedIn("BLG", "Blog Admin", "Logged in"),
  buildAdminCommunityReviewTests("BLG", {
    roleTitle: "Blog Admin",
    before: "Logged in",
    onDashboardToo: true,
  }),
  buildSevaAdminDashboardTests("BLG", {
    roleTitle: "Blog Admin",
    hasRolesTile: false,
    hasBlogPending: true,
    hasOutreachPending: false,
    hasAnalytics: true,
    canDeleteBlog: false,
    before: "Logged in",
  }),
  buildManageSevaTests("BLG", { roleTitle: "Blog Admin", before: "Logged in" }),
  buildSevaBlogPageTests("BLG", {
    roleTitle: "Blog Admin",
    before: "Logged in",
    intro: "Approve posts on dashboard; edit on blog.",
    loggedIn: true,
    canGenerateReport: true,
    canEditOnCards: true,
    createPostExpected: "Create post form opens.",
  }),
  buildBlogPostDetailPageTests("BLG", {
    roleTitle: "Blog Admin",
    before: "Logged in",
    canEdit: true,
    loggedIn: true,
  }),
  buildDashboardPageTests("BLG", {
    roleTitle: "Blog Admin",
    before: "Logged in",
    intro: "Personal dashboard.",
  }),
];

const ADMIN_PAGES = [
  ADMIN_HOME,
  buildFindSevaPageTests("ADM", {
    roleTitle: "Admin",
    before: "Logged in",
    intro: "Full center seva access.",
    joinExpected: "Join works.",
  }),
  buildSevaDetailsPageTests("ADM", { roleTitle: "Admin", guest: false, before: "Logged in" }),
  ...communityBrowseLoggedIn("ADM", "Admin", "Logged in", true),
  buildAdminCommunityReviewTests("ADM", {
    roleTitle: "Admin",
    before: "Logged in",
    onDashboardToo: true,
  }),
  buildSevaAdminDashboardTests("ADM", {
    roleTitle: "Admin",
    hasRolesTile: true,
    hasBlogPending: true,
    hasOutreachPending: true,
    hasAnalytics: true,
    canDeleteBlog: true,
    before: "Logged in",
  }),
  buildRolesPageTests("ADM", { before: "Logged in" }),
  buildAddSevaActivityTests("ADM", { roleTitle: "Admin", before: "Logged in" }),
  buildManageSevaTests("ADM", { roleTitle: "Admin", before: "Logged in" }),
  buildSevaSignUpsTests("ADM", { roleTitle: "Admin", before: "Logged in" }),
  buildSevaBlogPageTests("ADM", {
    roleTitle: "Admin",
    intro: "Full blog access.",
    before: "Logged in",
    loggedIn: true,
    canGenerateReport: true,
    canEditOnCards: true,
    createPostExpected: "Create post form opens.",
  }),
  buildBlogPostDetailPageTests("ADM", {
    roleTitle: "Admin",
    before: "Logged in",
    canEdit: true,
    loggedIn: true,
  }),
  buildDashboardPageTests("ADM", {
    roleTitle: "Admin",
    before: "Logged in",
    intro: "Personal dashboard.",
  }),
  buildLogHoursPageTests("ADM", { roleTitle: "Admin", before: "Logged in" }),
  buildCertificatePageTests("ADM", { roleTitle: "Admin", before: "Logged in" }),
  // Optional: assign separate workbook section note — org owner sheets for staging org account
  ...communityOrgOwnerSheets("ADM", "Admin", "Staging: separate approved community org test login"),
];

const EVENT_ADMIN_PAGES = [
  EVENT_ADMIN_HOME,
  buildEventsPublicTests("EVT", { roleTitle: "Event Admin", before: "Logged in or guest" }),
  buildEventAdminTests("EVT", { sheetName: "Event Admin Dashboard", roleTitle: "Event Admin", before: "Logged in" }),
  buildEventAdminTests("EVT", { sheetName: "Add Event", roleTitle: "Event Admin", before: "Logged in" }),
  buildEventAdminTests("EVT", { sheetName: "Manage Events", roleTitle: "Event Admin", before: "Logged in" }),
  buildEventAdminTests("EVT", { sheetName: "Event Sign Ups", roleTitle: "Event Admin", before: "Logged in" }),
  ...communityBrowseLoggedIn("EVT", "Event Admin", "Logged in"),
  buildSevaBlogPageTests("EVT", {
    roleTitle: "Event Admin",
    before: "Logged in",
    intro: "Read blog like other users.",
    loggedIn: true,
    canGenerateReport: false,
    canEditOnCards: false,
    createPostExpected: "Create post if logged in.",
  }),
  buildBlogPostDetailPageTests("EVT", {
    roleTitle: "Event Admin",
    before: "Logged in",
    canEdit: false,
    loggedIn: true,
  }),
  buildDashboardPageTests("EVT", {
    roleTitle: "Event Admin",
    before: "Logged in",
    intro: "Personal dashboard.",
  }),
];

const ROLES = [
  buildRole({
    folder: "Guest",
    fileName: "Guest_Testing_Checklist.xlsx",
    title: "Guest (not logged in)",
    loginHint: "Stay logged out.",
    shouldNotSee: "Admin tools, community steps 3–5, post activities.",
    testerNotes:
      "Community Network: Find Community Activity, Details, Partner Orgs, Outreach hub (steps 1–2 only).",
    pages: GUEST_PAGES,
  }),
  buildRole({
    folder: "Volunteer",
    fileName: "Volunteer_Testing_Checklist.xlsx",
    title: "Volunteer",
    loginHint: "Volunteer-only account.",
    shouldNotSee: "Admin row, approve community orgs.",
    testerNotes: "Full Community Network browse + join. Org posting needs approved org account (separate test).",
    pages: VOLUNTEER_PAGES,
  }),
  buildRole({
    folder: "Seva_Coordinator",
    fileName: "Seva_Coordinator_Testing_Checklist.xlsx",
    title: "Seva Coordinator",
    loginHint: "Coordinator account.",
    shouldNotSee: "Roles tile.",
    testerNotes: "Community: browse + **Admin Community Review** for pending org profiles.",
    pages: COORD_PAGES,
  }),
  buildRole({
    folder: "Blog_Admin",
    fileName: "Blog_Admin_Testing_Checklist.xlsx",
    title: "Blog Admin",
    loginHint: "Blog Admin account.",
    shouldNotSee: "Roles unless also Admin.",
    testerNotes: "Community browse + review pending orgs on dashboard.",
    pages: BLOG_ADMIN_PAGES,
  }),
  buildRole({
    folder: "Admin",
    fileName: "Admin_Testing_Checklist.xlsx",
    title: "Admin",
    loginHint: "Admin account.",
    shouldNotSee: "—",
    testerNotes:
      "All Community Network sheets including org owner workflow (use staging org account for post/manage/signups).",
    pages: ADMIN_PAGES,
  }),
  buildRole({
    folder: "Event_Admin_Only",
    fileName: "Event_Admin_Testing_Checklist.xlsx",
    title: "Event Admin only",
    loginHint: "Event Admin only.",
    shouldNotSee: "Seva Admin Dashboard.",
    testerNotes: "Community: browse and join only (same as volunteer for Community Network).",
    pages: EVENT_ADMIN_PAGES,
  }),
];

module.exports = { ROLES };
