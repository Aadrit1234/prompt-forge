export const DOMAINS = [
  { id: "general", label: "General" },
  { id: "code", label: "Code" },
  { id: "write", label: "Write" },
  { id: "analyze", label: "Analyze" },
  { id: "research", label: "Research" },
  { id: "data", label: "Data" },
];

export const RIGOR_OPTIONS = [
  { id: "quick", label: "Quick" },
  { id: "standard", label: "Standard" },
  { id: "deep", label: "Deep" },
];

export const LOADING_STEPS = [
  "Parsing intent",
  "Extracting constraints",
  "Binding role & context",
  "Selecting output format",
  "Locking structure",
];

export const PLAN_PRESETS = [
  { id: "free", label: "Free", dailyTokenBudget: 12000 },
  { id: "pro", label: "Pro", dailyTokenBudget: 60000 },
  { id: "max5", label: "Max 5x", dailyTokenBudget: 300000 },
  { id: "max20", label: "Max 20x", dailyTokenBudget: 1200000 },
];

export const EXAMPLES = [
  {
    label: "Recruiter follow-up",
    text: "Write a follow-up email to a recruiter who went quiet two weeks after my interview. Keep it friendly but confident, and ask for an update.",
  },
  {
    label: "SQL explainer",
    text: "Explain window functions in SQL to me like I'm a backend dev who knows joins but never used them. Use one realistic example with a sample dataset.",
  },
  {
    label: "Landing page copy",
    text: "Write the hero section copy for a landing page of a budgeting app for freelancers. Tone: calm, trustworthy, slightly witty. Under 40 words for the headline.",
  },
  {
    label: "Debug my code",
    text: "My React component re-renders in an infinite loop. I pass a function prop created inline. Explain the root cause and show the minimal fix.",
  },
];
