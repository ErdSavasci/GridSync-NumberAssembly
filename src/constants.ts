
export const NUMBER_SEGMENTS: Record<number, string[]> = {
  1: [
    "M 50 20 L 50 180", // Main vertical
    "M 50 20 L 30 40",  // Top slant
    "M 30 180 L 70 180" // Bottom base
  ],
  2: [
    "M 30 40 C 30 10, 70 10, 70 40", // Top curve
    "M 70 40 L 30 100",             // Diagonal
    "M 30 100 L 70 100"             // Bottom line
  ],
  3: [
    "M 30 20 L 70 20",              // Top horizontal
    "M 70 20 L 50 60",              // Diagonal in
    "M 50 60 C 80 60, 80 100, 50 100" // Bottom curve
  ],
  4: [
    "M 60 10 L 60 100",             // Long vertical
    "M 60 10 L 20 70",              // Slant
    "M 20 70 L 80 70"               // Horizontal cross
  ],
  5: [
    "M 70 20 L 30 20",              // Top bar
    "M 30 20 L 30 60",              // Side bar
    "M 30 60 C 70 60, 70 100, 30 100" // Bottom curve
  ],
  6: [
    "M 60 20 C 40 20, 30 40, 30 80",     // Top tail
    "M 30 80 C 30 110, 70 110, 70 80",   // Bottom arc
    "M 70 80 C 70 50, 30 50, 30 80"      // Loop closure
  ],
  7: [
    "M 30 20 L 70 20",              // Top horizontal
    "M 70 20 L 40 100"              // Long diagonal
  ],
  8: [
    "M 50 20 C 30 20, 30 60, 50 60", // Top left curve
    "M 50 20 C 70 20, 70 60, 50 60", // Top right curve
    "M 50 60 C 20 60, 20 110, 50 110", // Bottom left curve
    "M 50 110 C 80 110, 80 60, 50 60"  // Bottom right curve
  ],
  9: [
    "M 50 60 C 30 60, 30 20, 50 20", // Top left curve
    "M 50 20 C 70 20, 70 60, 50 60", // Top right curve
    "M 50 60 L 50 110",             // Tail straight
    "M 50 110 C 50 130, 30 130, 30 110" // Tail hook
  ]
};

export const COLORS = {
  blue: "#4285F4",
  red: "#EA4335",
  yellow: "#FBBC05",
  green: "#34A853"
};

export const INITIAL_LIVES = (level: number) => {
  if (level <= 5) return 3;
  if (level <= 8) return 2;
  return 1;
};

export const GET_SPEED = (level: number) => 1.5 + level * 0.8;
