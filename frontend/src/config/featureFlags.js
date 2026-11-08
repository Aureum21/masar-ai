/** Build-time presentation switches, never authorisation/reward validation.
 * Explore-first ships in Phase 2; set its value to "false" to retain chat-first.
 * Other features remain disabled unless explicitly set to "true". Rebuild after changes.
 */
export const featureFlags = Object.freeze({
  exploreFirst: process.env.NEXT_PUBLIC_MASAR_EXPLORE_FIRST !== 'false',
  structuredPlanning: process.env.NEXT_PUBLIC_MASAR_STRUCTURED_PLANNING === 'true',
  rewards: process.env.NEXT_PUBLIC_MASAR_REWARDS === 'true',
});
