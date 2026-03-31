export interface Destination {
  id: string;
  name: string;
  flag: string;
  region: string;
  featured: boolean;
}

export const destinations: Destination[] = [
  // Featured (shown as top 6 tappable cards)
  {
    id: "uk",
    name: "United Kingdom",
    flag: "🇬🇧",
    region: "Europe",
    featured: true,
  },
  {
    id: "us",
    name: "United States",
    flag: "🇺🇸",
    region: "North America",
    featured: true,
  },
  {
    id: "au",
    name: "Australia",
    flag: "🇦🇺",
    region: "Oceania",
    featured: true,
  },
  {
    id: "sg",
    name: "Singapore",
    flag: "🇸🇬",
    region: "Asia",
    featured: true,
  },
  {
    id: "ca",
    name: "Canada",
    flag: "🇨🇦",
    region: "North America",
    featured: true,
  },
  {
    id: "hk",
    name: "Hong Kong",
    flag: "🇭🇰",
    region: "Asia",
    featured: true,
  },
  // Additional (shown under "Other" expansion)
  {
    id: "nl",
    name: "Netherlands",
    flag: "🇳🇱",
    region: "Europe",
    featured: false,
  },
  {
    id: "de",
    name: "Germany",
    flag: "🇩🇪",
    region: "Europe",
    featured: false,
  },
  {
    id: "jp",
    name: "Japan",
    flag: "🇯🇵",
    region: "Asia",
    featured: false,
  },
  {
    id: "nz",
    name: "New Zealand",
    flag: "🇳🇿",
    region: "Oceania",
    featured: false,
  },
  {
    id: "ie",
    name: "Ireland",
    flag: "🇮🇪",
    region: "Europe",
    featured: false,
  },
  {
    id: "kr",
    name: "South Korea",
    flag: "🇰🇷",
    region: "Asia",
    featured: false,
  },
];

export const NOT_SURE_DESTINATION = "not_sure";
