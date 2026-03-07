export type Seva = {
  id: string;
  title: string;
  location: string;
  category: "Service" | "Teaching" | "Cleaning" | "Food" | "Medical" | "Other";
  date: string;
  slotsAvailable: number;
};

export type HourLog = {
  id: string;
  sevaTitle: string;
  date: string;
  hours: number;
  notes?: string;
};

export const mockSevas: Seva[] = [
  {
    id: "s1",
    title: "Temple Cleaning",
    location: "Center Hall",
    category: "Cleaning",
    date: "2026-02-20",
    slotsAvailable: 6,
  },
  {
    id: "s2",
    title: "Food Distribution",
    location: "Community Kitchen",
    category: "Food",
    date: "2026-02-22",
    slotsAvailable: 10,
  },
  {
    id: "s3",
    title: "Teaching Support",
    location: "Classroom A",
    category: "Teaching",
    date: "2026-02-23",
    slotsAvailable: 3,
  },
];

export const mockLogs: HourLog[] = [
  {
    id: "h1",
    sevaTitle: "Food Distribution",
    date: "2026-02-10",
    hours: 2,
    notes: "Packed supplies",
  },
  {
    id: "h2",
    sevaTitle: "Temple Cleaning",
    date: "2026-02-12",
    hours: 1.5,
    notes: "Main hall + entrance",
  },
];
