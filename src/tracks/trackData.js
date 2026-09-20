export const LEVELS = [
  {
    id: 'city',
    name: 'Los Santos Grand Prix',
    description: 'Wide open city circuit with sweeping curves and high-speed straights',
    laps: 3,
    difficulty: 1,
    trackWidth: 20,
    wallHeight: 1.6,
    controlPoints: [
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 },
      { x: 180, y: 0, z: 50 },
      { x: 220, y: 0, z: 140 },
      { x: 180, y: 0, z: 230 },
      { x: 100, y: 0, z: 270 },
      { x: -20, y: 0, z: 270 },
      { x: -120, y: 0, z: 230 },
      { x: -160, y: 0, z: 140 },
      { x: -120, y: 0, z: 50 },
      { x: -40, y: 0, z: 0 }
    ],
    theme: {
      sky: { topColor: 0x0284c7, bottomColor: 0xbae6fd },
      ground: 0x475569,
      road: 0x18181b,
      roadLine: 0xfacc15,
      curb: 0xef4444,
      ambient: 0xffffff,
      ambientIntensity: 0.95,
      sun: 0xfffbeb,
      sunIntensity: 1.6,
      sunPosition: { x: 100, y: 200, z: 100 },
      fog: null, // Zero fog for 100% crystal clear track visibility
      decorations: 'city'
    }
  },
  {
    id: 'desert',
    name: 'Vinewood Sunset Speedway',
    description: 'Smooth desert highway with scenic curves and sunset lighting',
    laps: 3,
    difficulty: 2,
    trackWidth: 20,
    wallHeight: 1.6,
    controlPoints: [
      { x: 0, y: 0, z: 0 },
      { x: 120, y: 0, z: 40 },
      { x: 200, y: 0, z: 130 },
      { x: 160, y: 0, z: 240 },
      { x: 60, y: 0, z: 290 },
      { x: -60, y: 0, z: 270 },
      { x: -150, y: 0, z: 180 },
      { x: -180, y: 0, z: 80 },
      { x: -110, y: 0, z: -20 },
      { x: -30, y: 0, z: -20 }
    ],
    theme: {
      sky: { topColor: 0xe11d48, bottomColor: 0xfde047 },
      ground: 0x78350f,
      road: 0x27272a,
      roadLine: 0xffffff,
      curb: 0xf97316,
      ambient: 0xffedd5,
      ambientIntensity: 0.9,
      sun: 0xffedd5,
      sunIntensity: 1.7,
      sunPosition: { x: -120, y: 150, z: -120 },
      fog: null,
      decorations: 'desert'
    }
  },
  {
    id: 'neon',
    name: 'Night City Strip',
    description: 'Neon-lit midnight speedway with glowing barriers',
    laps: 3,
    difficulty: 3,
    trackWidth: 22,
    wallHeight: 2.0,
    controlPoints: [
      { x: 0, y: 0, z: 0 },
      { x: 110, y: 0, z: -60 },
      { x: 200, y: 0, z: -140 },
      { x: 150, y: 0, z: -250 },
      { x: 0, y: 0, z: -290 },
      { x: -140, y: 0, z: -240 },
      { x: -210, y: 0, z: -120 },
      { x: -170, y: 0, z: 20 },
      { x: -80, y: 0, z: 80 },
      { x: 0, y: 0, z: 60 }
    ],
    theme: {
      sky: { topColor: 0x020617, bottomColor: 0x0f172a },
      ground: 0x090d16,
      road: 0x0a0f1d,
      roadLine: 0x00f0ff,
      curb: 0xf43f5e,
      ambient: 0x93c5fd,
      ambientIntensity: 0.8,
      sun: 0x38bdf8,
      sunIntensity: 1.2,
      sunPosition: { x: 0, y: 180, z: 0 },
      fog: null,
      decorations: 'neon'
    }
  }
];
