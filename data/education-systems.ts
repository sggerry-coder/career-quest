export interface EducationSystem {
  id: string;
  label: string;
  country: string;
  flag: string;
}

export const educationSystems: EducationSystem[] = [
  {
    id: "gcse_alevels",
    label: "GCSEs & A-Levels",
    country: "United Kingdom",
    flag: "🇬🇧",
  },
  {
    id: "us_highschool",
    label: "High School + AP/SAT",
    country: "United States",
    flag: "🇺🇸",
  },
  {
    id: "ib",
    label: "International Baccalaureate",
    country: "Global",
    flag: "🌍",
  },
  {
    id: "hsc_atar",
    label: "HSC / ATAR",
    country: "Australia",
    flag: "🇦🇺",
  },
  {
    id: "spm_stpm",
    label: "SPM / STPM",
    country: "Malaysia",
    flag: "🇲🇾",
  },
  {
    id: "sg_levels",
    label: "O-Levels / A-Levels",
    country: "Singapore",
    flag: "🇸🇬",
  },
  {
    id: "hkdse",
    label: "HKDSE",
    country: "Hong Kong",
    flag: "🇭🇰",
  },
  {
    id: "other",
    label: "Other",
    country: "",
    flag: "📝",
  },
  {
    id: "not_sure",
    label: "Not sure",
    country: "",
    flag: "🤷",
  },
];
