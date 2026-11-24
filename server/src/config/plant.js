// Plant growth settings. These are starting values, kept in one place so they are easy to tune.

// Growth stage depends on the lifetime number of check-ins. Missed days never reduce it.
export const PLANT_STAGES = [
  { key: 'seed', minCheckIns: 0 },
  { key: 'seedling', minCheckIns: 1 },
  { key: 'young', minCheckIns: 4 },
  { key: 'growing', minCheckIns: 10 },
  { key: 'mature', minCheckIns: 20 },
  { key: 'blooming', minCheckIns: 40 },
];

// Wilting looks at scheduled days in the last N days, up to yesterday.
export const RECENT_WINDOW_DAYS = 7;

// How many missed scheduled days inside the window cause each wilt level.
export const WILT_THRESHOLDS = { slight: 1, wilted: 2 };
