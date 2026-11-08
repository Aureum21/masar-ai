/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TrackPoint {
  x: number;
  y: number;
  yaw: number;
  pitch: number;
  dx_dz: number;
  dy_dz: number;
  nx: number;
  nz: number;
}

export const HALF_ROAD = 6.8;
export const LANE_OFFSETS = [-3.2, 0, 3.2] as const;
export type LaneIndex = 0 | 1 | 2; // -1 (left), 0 (center), 1 (right)

export const INITIAL_ROLL_SPEED = 12.0; // 0.75x adjusted (was 16.0 m/s)
export const CRUISE_ROLL_SPEED = 27.0;  // 0.75x adjusted (was 36.0 m/s reached at 5s)
export const ACCEL_DURATION = 5.0;      // Seconds to ramp to cruise speed

/**
 * Calculates ball forward speed as a function of elapsed rolling time and total distance.
 * Implements smooth 5-second acceleration curve from 12 m/s to 27 m/s (0.75x adjusted for better market visibility),
 * followed by subtle arcade scaling past 150m up to max 37.5 m/s.
 */
export function calculateBallSpeed(elapsedSeconds: number, distanceRun = 0): number {
  const t = Math.max(0, Math.min(elapsedSeconds / ACCEL_DURATION, 1.0));
  // Smooth quadratic ease-out acceleration:
  const smoothT = t * (2 - t);
  const baseSpeed = INITIAL_ROLL_SPEED + (CRUISE_ROLL_SPEED - INITIAL_ROLL_SPEED) * smoothT;
  // Subtle speed increase after 150m (up to max 37.5 m/s)
  const distanceBonus = Math.max(0, (distanceRun - 150) / 150) * 1.5;
  return Math.min(baseSpeed + distanceBonus, 37.5);
}

/**
 * Parametric curve formula as specified in the Al Fahidi blueprint.
 * Winds horizontally and undulates gently in elevation as z advances negative.
 */
export function getTrackCurve(z: number): TrackPoint {
  const k1 = 0.035;
  const k2 = 0.075;
  const x = Math.sin(z * k1) * 7.2 + Math.sin(z * k2) * 3.4;
  const dx_dz = Math.cos(z * k1) * (7.2 * k1) + Math.cos(z * k2) * (3.4 * k2);

  const ky = 0.040;
  // Elevation is strictly positive (range 0.2m to 2.2m)
  const y = Math.sin(z * ky) * 1.0 + 1.2;
  const dy_dz = Math.cos(z * ky) * (1.0 * ky);

  // Perpendicular Normal Vector pointing to the RIGHT of the track in (X, Z):
  const len = Math.sqrt(1 + dx_dz * dx_dz);
  const nx = 1 / len;
  const nz = -dx_dz / len;

  // Rotation angles:
  const yaw = Math.atan(dx_dz);
  const pitch = Math.atan(-dy_dz);

  return { x, y, yaw, pitch, dx_dz, dy_dz, nx, nz };
}

/**
 * Calculates world coordinates for a given lane offset L at world progress Z.
 */
export function getLaneWorldPos(z: number, laneOffset: number, playerElevation = 0): { x: number; y: number; z: number } {
  const c = getTrackCurve(z);
  return {
    x: c.x + laneOffset * c.nx,
    y: c.y + playerElevation,
    z: z + laneOffset * c.nz,
  };
}

export interface ObstacleProfile {
  radius: number;
  height: number;
}

export const OBSTACLE_PROFILES: Record<string, ObstacleProfile> = {
  pumpkin_cart_spill: { radius: 1.10, height: 1.05 },
  spice_sack_spill: { radius: 0.95, height: 0.60 },
  pottery_pallet_spill: { radius: 1.10, height: 1.25 },
  carpet_roll_spill: { radius: 1.00, height: 0.80 },
  dates_citrus_crates: { radius: 1.05, height: 0.95 },
  default: { radius: 1.05, height: 1.00 },
};

/**
 * Calculates squared distance from a 2D point (px, pz) to a line segment [a, b].
 */
export function distSqToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-6) {
    const ex = px - ax;
    const ez = pz - az;
    return ex * ex + ez * ez;
  }
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projZ = az + t * dz;
  const rx = px - projX;
  const rz = pz - projZ;
  return rx * rx + rz * rz;
}

/**
 * Continuous swept collision check between player sphere moving from prevPos to currPos
 * and an obstacle cylinder positioned at (obsX, obsWorldY, obsZ).
 * Correctly accounts for true world height, individual obstacle profiles, and trajectory segment.
 */
export function checkSweptSphereObstacleCollision(
  prevX: number,
  prevY: number,
  prevZ: number,
  currX: number,
  currY: number,
  currZ: number,
  sphereRadius: number,
  obsX: number,
  obsWorldY: number,
  obsZ: number,
  obsType: string,
): boolean {
  const profile = OBSTACLE_PROFILES[obsType] || OBSTACLE_PROFILES.default;
  const obsTop = obsWorldY + profile.height;

  // Lowest point of player sphere during this step (interpolated min)
  const playerBottom = Math.min(prevY, currY) - sphereRadius;

  // If the player bottom is above the obstacle top, jump cleared the obstacle!
  if (playerBottom >= obsTop) {
    return false;
  }

  // Check swept horizontal distance to the obstacle cylinder
  const effectiveRadius = profile.radius + sphereRadius * 0.70;
  const distSq = distSqToSegment(obsX, obsZ, prevX, prevZ, currX, currZ);

  return distSq <= effectiveRadius * effectiveRadius;
}

/**
 * Legacy collision detection check between player sphere and an obstacle.
 * Maintained for backward compatibility.
 */
export function checkSphereObstacleCollision(
  sphereX: number,
  sphereY: number,
  sphereZ: number,
  obsX: number,
  obsZ: number,
  obsHeightThreshold = 1.85,
  horizontalThreshold = 1.15,
): boolean {
  const dx = obsX - sphereX;
  const dz = obsZ - sphereZ;
  const distSq = dx * dx + dz * dz;

  if (distSq < horizontalThreshold * horizontalThreshold && sphereY < obsHeightThreshold) {
    return true;
  }
  return false;
}

/**
 * Physics jump calculations:
 * v_y = 13.5 u/s, gravity = 32.0 u/s^2.
 * Peak jump height: v^2 / (2 * g) = 182.25 / 64 = 2.848m above rest height.
 * Total jump clearance: 1.0 (radius) + 2.85 = 3.85m peak!
 * Jump duration = 2 * v / g = 27 / 32 = 0.84375 seconds.
 */
export function simulateJumpStep(
  currentElevation: number,
  velocity: number,
  delta: number,
  gravity = 32.0,
): { elevation: number; velocity: number; landed: boolean } {
  const newVelocity = velocity - gravity * delta;
  const newElevation = currentElevation + newVelocity * delta;

  if (newElevation <= 0) {
    return { elevation: 0, velocity: 0, landed: true };
  }
  return { elevation: newElevation, velocity: newVelocity, landed: false };
}
