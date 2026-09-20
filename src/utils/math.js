/**
 * Math utility functions for the Mark-II Racing game.
 */

/**
 * Linearly interpolates between two values.
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Clamps a value between a minimum and maximum.
 * @param {number} val - The value to clamp
 * @param {number} min - Minimum limit
 * @param {number} max - Maximum limit
 * @returns {number} Clamped value
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Interpolates between two angles handling wrap-around at PI/-PI.
 * @param {number} a - Start angle in radians
 * @param {number} b - End angle in radians
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated angle in radians
 */
export function angleLerp(a, b, t) {
  const delta = normalizeAngle(b - a);
  return normalizeAngle(a + delta * t);
}

/**
 * Performs smooth Hermite interpolation between 0 and 1 when x is between edge0 and edge1.
 * @param {number} edge0 - Lower edge
 * @param {number} edge1 - Upper edge
 * @param {number} x - Value to interpolate
 * @returns {number} Interpolated value between 0 and 1
 */
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

/**
 * Returns a random float between min and max.
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random value
 */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Calculates the Euclidean distance between two 2D points (x, z).
 * @param {{x: number, z: number}} p1 - First point
 * @param {{x: number, z: number}} p2 - Second point
 * @returns {number} Distance
 */
export function distanceBetween(p1, p2) {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Normalizes an angle to be within the range -PI to PI.
 * @param {number} angle - Angle in radians
 * @returns {number} Normalized angle
 */
export function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
