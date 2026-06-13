/** Shared API response types (mirror the web app's API route payloads). */

export type AppRole =
  | "ADMIN"
  | "BLOG_ADMIN"
  | "VOLUNTEER"
  | "SEVA_COORDINATOR"
  | "REGIONAL_SEVA_COORDINATOR"
  | "NATIONAL_SEVA_COORDINATOR"
  | "EVENT_ADMIN";

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  location: string | null;
  role: AppRole;
  roles: AppRole[];
  coordinatorCities: string[] | null;
  coordinatorRegions: string[] | null;
  eventAdminOnly: boolean;
};

export type SevaActivity = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  city: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationHours: number | null;
  locationName: string | null;
  organizationName: string | null;
  address: string | null;
  capacity: number | null;
  allowKids: boolean;
  joinSevaEnabled: boolean;
  coordinatorName: string | null;
  coordinatorEmail: string | null;
  coordinatorPhone: string | null;
  imageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  status: string;
  scope: "CENTER" | "REGIONAL" | "NATIONAL" | string;
  sevaUsaRegion: string | null;
  spotsRemaining: number | null;
  hasContributionList: boolean;
  group: { id: string; title: string } | null;
};

export type UpcomingItem = {
  id: string;
  signupId: string;
  title: string;
  startDate: string | null;
  city: string | null;
};

export type LoggedHoursEntry = {
  id: string;
  volunteerName: string;
  location: string | null;
  activityCategory: string;
  hours: number;
  date: string;
  comments: string | null;
  createdAt: string;
};

export type LoggedHoursResponse = {
  entries: LoggedHoursEntry[];
  total?: number;
};

export type BlogActivityStub = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string | null;
  imageUrl: string | null;
  startDate: string | null;
  volunteerCount: number;
  createdAt: string;
};

export type SevaBlogLanding = {
  featured: (BlogActivityStub & { durationHours: number | null }) | null;
  activities: BlogActivityStub[];
  impact: {
    hours: number;
    volunteers: number;
    familiesServed: number;
    centers: number;
  };
  popularTags: { name: string; count: number }[];
};

export type BlogPostListItem = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  section: string;
  centerCity: string | null;
  sevaDate: string | null;
  sevaCategory: string | null;
  authorName: string | null;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  emojiCounts: Record<string, number>;
};

export type BlogPostDetail = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  section: string;
  authorName: string | null;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  emojiCounts: Record<string, number>;
  myReaction: { type: string; emojiCode?: string } | null;
};

export type SevaFormMeta = {
  categories: string[];
  cities: string[];
  regions: string[];
  blogSections: string[];
};

export type SevaSignupStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type SevaActivityStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type SevaScope = "CENTER" | "REGIONAL" | "NATIONAL";

export type AnalyticsData = {
  totalActivities: number;
  activeActivities: number;
  totalVolunteers: number;
  totalHours: number;
  categoryCounts: Record<string, number>;
  cityCounts: Record<string, number>;
  topCategory: string | null;
  thisMonthCount: number;
  monthlySevaHours?: { month: string; hours: number }[];
  recentActivities: Array<{
    id: string;
    title: string;
    category: string;
    city: string;
    startDate: string | null;
    status: string;
    listedAsCommunityOutreach?: boolean;
  }>;
};

export type AdminDashboardStats = {
  totalActivities: number;
  activeActivities: number;
  totalVolunteers: number;
  totalHours: number;
  categoryCounts: Record<string, number>;
  recentSignups: {
    id: string;
    volunteerName: string;
    email: string;
    phone: string | null;
    status: string;
    createdAt: string;
    activityTitle: string;
    adultsCount: number;
    kidsCount: number;
  }[];
};

export type AdminSignup = {
  id: string;
  activityId: string;
  volunteerName: string;
  email: string;
  phone: string | null;
  adultsCount: number;
  kidsCount: number;
  status: SevaSignupStatus;
  comment: string | null;
  createdAt: string;
  activity: { id: string; title: string } | null;
};

export type ContributionClaim = {
  id: string;
  quantity: number;
  volunteerName: string;
  email: string;
  phone: string | null;
  createdAt: string;
};

export type ContributionItem = {
  id: string;
  name: string;
  category: string;
  neededLabel: string;
  maxQuantity: number;
  sortOrder: number;
  claims?: ContributionClaim[];
};

/** Full admin activity (GET /api/admin/seva-activities/[id]) — superset of SevaActivity. */
export type AdminSevaActivity = SevaActivity & {
  contributionItems?: ContributionItem[];
};

export type RoleAssignment = {
  id: string;
  email: string;
  role: AppRole;
  cities: string | null;
  regions: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BlogReportListRow = {
  id: string;
  reportTitle: string | null;
  createdAt: string;
  dateFrom: string;
  dateTo: string;
  centerFilter: string | null;
  regionFilter: string | null;
  sevaCategoryFilter: string | null;
  targetWordCount: number;
  sourcePostCount: number;
};

export type BlogReportSourcePost = {
  id: string;
  title: string;
  section: string;
  authorName: string | null;
  createdAt: string;
  centerCity: string | null;
  sevaCategory: string | null;
  sevaDate: string | null;
};

export type BlogReportRelatedActivity = {
  id: string;
  title: string;
  category: string;
  city: string | null;
  startDate: string | null;
  status: string;
};

export type PortalEventStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type EventRsvpResponse = "YES" | "NO" | "MAYBE";

export type PortalEventListItem = {
  id: string;
  title: string;
  description: string;
  heroImageUrl: string | null;
  startsAt: string;
  venue: string;
  signupsEnabled: boolean;
};

export type PortalEventDetail = PortalEventListItem & {
  flyerUrl: string | null;
};

export type PortalEventAdmin = {
  id: string;
  title: string;
  description: string;
  heroImageUrl: string | null;
  flyerUrl: string | null;
  startsAt: string;
  timeZoneId: string;
  venue: string;
  organizerEmail: string | null;
  signupsEnabled: boolean;
  status: PortalEventStatus;
  reminderSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { signups: number };
};

export type EventRsvp = {
  firstName: string;
  lastName: string;
  email: string;
  response: EventRsvpResponse;
  accompanyingAdults: number;
  accompanyingKids: number;
  comment: string;
};

export type EventSignupAdmin = {
  id: string;
  eventId: string;
  participantName: string;
  email: string;
  comment: string | null;
  accompanyingAdults: number;
  accompanyingKids: number;
  response: EventRsvpResponse;
  createdAt: string;
  event: { id: string; title: string; startsAt: string };
};

export type CommunityActivity = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  city: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationHours: number | null;
  locationName: string | null;
  organizationName: string | null;
  address: string | null;
  capacity: number | null;
  coordinatorName: string | null;
  coordinatorEmail: string | null;
  coordinatorPhone: string | null;
  imageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  status: SevaActivityStatus;
  createdAt: string;
  updatedAt: string;
};

export type CommunityPartner = {
  id: string;
  organizationName: string;
  logoUrl: string | null;
  description: string | null;
  city: string;
  contactPhone: string | null;
  website: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

export type CommunityProfile = {
  id: string;
  userId: string;
  organizationName: string;
  logoUrl: string | null;
  description: string | null;
  city: string;
  contactPhone: string | null;
  website: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewerNote: string | null;
};

export type CommunityMe = {
  user: { id: string; email: string; firstName: string | null; lastName: string | null; name: string | null } | null;
  profile: CommunityProfile | null;
  role: AppRole | null;
  roles: AppRole[];
};

export type MyCommunityActivity = {
  id: string;
  title: string;
  category: string;
  city: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
  status: SevaActivityStatus;
  capacity: number | null;
  organizationName: string | null;
  createdAt: string;
  _count: { signups: number };
};

export type CommunityProfileAdmin = CommunityProfile & {
  user: { email: string; firstName: string | null; lastName: string | null; name: string | null };
};

export type CommunitySignup = {
  id: string;
  activityId: string;
  volunteerName: string;
  email: string;
  phone: string | null;
  adultsCount: number;
  kidsCount: number;
  status: SevaSignupStatus;
  comment: string | null;
  createdAt: string;
  activity: { id: string; title: string; city: string | null; organizationName: string | null } | null;
};

export type BlogReportDetail = {
  id: string;
  reportTitle: string | null;
  createdAt: string;
  updatedAt: string;
  dateFrom: string;
  dateTo: string;
  centerFilter: string | null;
  regionFilter: string | null;
  sevaCategoryFilter: string | null;
  targetWordCount: number;
  userInstructions: string | null;
  generatedBody: string;
  editedBody: string | null;
  sourcePostCount: number;
  sourcePosts: BlogReportSourcePost[];
  relatedSevaActivities: BlogReportRelatedActivity[];
  canEdit: boolean;
};
