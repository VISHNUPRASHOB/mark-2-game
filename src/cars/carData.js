export const CARS = [
  {
    id: 'rookie',
    name: 'Rookie',
    type: 'Hatchback',
    color: 0x3498db, // blue
    secondaryColor: 0x2980b9,
    stats: {
      topSpeed: 120,      // units per second (range 100-200)
      acceleration: 60,   // units per second^2 (range 40-100)
      handling: 0.8,      // turning rate multiplier (range 0.4-1.0)
      braking: 70,        // brake force (range 40-100)
      drift: 0.3          // drift tendency (range 0.1-0.8)
    },
    unlockLevel: 0, // available from start
    description: 'Perfect for beginners. Great handling, modest speed.'
  },
  {
    id: 'viper',
    name: 'Viper',
    type: 'Sports',
    color: 0xe74c3c, // red
    secondaryColor: 0xc0392b,
    stats: {
      topSpeed: 140,
      acceleration: 70,
      handling: 0.85,
      braking: 80,
      drift: 0.4
    },
    unlockLevel: 0,
    description: 'Balanced performance with a classic sporty feel.'
  },
  {
    id: 'phantom',
    name: 'Phantom',
    type: 'Sedan',
    color: 0xbdc3c7, // silver
    secondaryColor: 0x95a5a6,
    stats: {
      topSpeed: 160,
      acceleration: 75,
      handling: 0.9,
      braking: 85,
      drift: 0.35
    },
    unlockLevel: 1, // win level 1
    description: 'High speed and reliable handling for long stretches.'
  },
  {
    id: 'thunderbolt',
    name: 'Thunderbolt',
    type: 'Muscle',
    color: 0xf1c40f, // yellow
    secondaryColor: 0xf39c12,
    stats: {
      topSpeed: 180,
      acceleration: 90,
      handling: 0.5,
      braking: 60,
      drift: 0.8
    },
    unlockLevel: 1,
    description: 'A drift monster. Very fast but requires skill to corner.'
  },
  {
    id: 'shadow',
    name: 'Shadow',
    type: 'Supercar',
    color: 0x2c3e50, // black/dark
    secondaryColor: 0x1a252f,
    stats: {
      topSpeed: 190,
      acceleration: 95,
      handling: 0.75,
      braking: 90,
      drift: 0.6
    },
    unlockLevel: 2, // win level 2
    description: 'Sleek and aggressive. Incredible acceleration.'
  },
  {
    id: 'inferno',
    name: 'Inferno',
    type: 'Hypercar',
    color: 0xe67e22, // orange
    secondaryColor: 0xd35400,
    stats: {
      topSpeed: 200,
      acceleration: 100,
      handling: 0.95,
      braking: 100,
      drift: 0.5
    },
    unlockLevel: 2,
    description: 'The pinnacle of racing engineering. Unmatched specs.'
  }
];

/**
 * Returns an array of unlocked cars based on levels completed.
 * @param {number[]|number} completedLevels - Array of completed level indices, or highest completed level index
 * @returns {Array} - Array of car objects
 */
export function getUnlockedCars(completedLevels) {
  let maxLevel = 0;
  if (Array.isArray(completedLevels)) {
    maxLevel = completedLevels.length > 0 ? Math.max(...completedLevels) + 1 : 0;
  } else {
    maxLevel = completedLevels;
  }
  return CARS.filter(car => car.unlockLevel <= maxLevel);
}
