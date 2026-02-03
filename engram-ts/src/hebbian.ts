/**
 * Hebbian Learning — Co-activation forms memory links
 *
 * "Neurons that fire together, wire together."
 *
 * When memories are recalled together repeatedly, they form Hebbian links.
 * These links create an associative network independent of explicit entity
 * tagging — purely emergent from usage patterns.
 *
 * Key insight: This captures implicit relationships that the agent discovers
 * through experience, not explicit knowledge stored at encoding time.
 */

import { SQLiteStore } from './store';
import { MemoryConfig } from './config';

/**
 * Record co-activation for a set of memory IDs.
 *
 * When multiple memories are retrieved together (e.g., in a single recall),
 * each pair gets their coactivation_count incremented. When the count
 * reaches the threshold, a Hebbian link is automatically formed.
 *
 * @param store - The SQLiteStore instance
 * @param memoryIds - List of memory IDs that were co-activated
 * @param config - Memory configuration containing Hebbian parameters
 * @returns List of [id1, id2] tuples for newly formed links
 */
export function recordCoactivation(
  store: SQLiteStore,
  memoryIds: string[],
  config: MemoryConfig,
): Array<[string, string]> {
  if (!config.hebbianEnabled || memoryIds.length < 2) {
    return [];
  }

  const newLinks: Array<[string, string]> = [];

  // Generate all pairs
  for (let i = 0; i < memoryIds.length; i++) {
    for (let j = i + 1; j < memoryIds.length; j++) {
      let id1 = memoryIds[i];
      let id2 = memoryIds[j];

      // Ensure consistent ordering (smaller ID first)
      if (id1 > id2) {
        [id1, id2] = [id2, id1];
      }

      const formed = maybeCreateLink(store, id1, id2, config.hebbianThreshold);
      if (formed) {
        newLinks.push([id1, id2]);
      }
    }
  }

  return newLinks;
}

/**
 * Increment coactivation count and create link if threshold is met.
 *
 * Uses upsert to atomically increment the counter. When threshold is
 * reached for the first time, creates the bidirectional link.
 *
 * @param store - The SQLiteStore instance
 * @param id1 - First memory ID (should be <= id2 for consistency)
 * @param id2 - Second memory ID
 * @param threshold - Activation count needed to form link
 * @returns True if a new link was formed on this call
 */
export function maybeCreateLink(
  store: SQLiteStore,
  id1: string,
  id2: string,
  threshold: number = 3,
): boolean {
  // Ensure consistent ordering
  if (id1 > id2) {
    [id1, id2] = [id2, id1];
  }

  // Check if link already exists
  const existing = store.getHebbianLink(id1, id2);

  if (existing && existing.strength > 0) {
    // Link already exists, just increment coactivation count
    store.upsertHebbianLink(id1, id2, existing.strength, existing.coactivationCount + 1);
    return false;
  }

  if (existing) {
    // Record exists but strength=0 (tracking phase), increment count
    const newCount = existing.coactivationCount + 1;
    if (newCount >= threshold) {
      // Threshold reached! Create bidirectional link
      store.upsertHebbianLink(id1, id2, 1.0, newCount);
      store.upsertHebbianLink(id2, id1, 1.0, newCount);
      return true;
    } else {
      store.upsertHebbianLink(id1, id2, 0.0, newCount);
      return false;
    }
  } else {
    // First co-activation, create tracking record with strength=0
    store.upsertHebbianLink(id1, id2, 0.0, 1);
    return false;
  }
}

/**
 * Get all memories linked to this one via Hebbian connections.
 *
 * Only returns neighbors with positive link strength (formed links,
 * not just tracked co-activations).
 *
 * @param store - The SQLiteStore instance
 * @param memoryId - Memory ID to find neighbors for
 * @returns List of connected memory IDs
 */
export function getHebbianNeighbors(store: SQLiteStore, memoryId: string): string[] {
  return store.getHebbianNeighbors(memoryId);
}

/**
 * Decay all Hebbian link strengths by a factor.
 *
 * Called during consolidation to gradually weaken unused links.
 * Links that decay below a threshold (0.1) are removed.
 *
 * @param store - The SQLiteStore instance
 * @param factor - Multiplicative decay factor (0.95 = 5% decay)
 * @returns Number of links pruned
 */
export function decayHebbianLinks(store: SQLiteStore, factor: number = 0.95): number {
  return store.decayHebbianLinks(factor);
}

/**
 * Strengthen an existing Hebbian link.
 *
 * Called when linked memories are accessed together again.
 * Caps strength at 2.0 to prevent unbounded growth.
 *
 * @param store - The SQLiteStore instance
 * @param id1 - First memory ID
 * @param id2 - Second memory ID
 * @param boost - Amount to add to strength
 * @returns True if link existed and was strengthened
 */
export function strengthenLink(
  store: SQLiteStore,
  id1: string,
  id2: string,
  boost: number = 0.1,
): boolean {
  // Update both directions
  let updated = false;

  for (const [src, tgt] of [[id1, id2], [id2, id1]]) {
    const existing = store.getHebbianLink(src, tgt);
    if (existing && existing.strength > 0) {
      const newStrength = Math.min(2.0, existing.strength + boost);
      store.upsertHebbianLink(src, tgt, newStrength, existing.coactivationCount);
      updated = true;
    }
  }

  return updated;
}

/**
 * Get all formed Hebbian links (strength > 0).
 *
 * @param store - The SQLiteStore instance
 * @returns List of { sourceId, targetId, strength } objects
 */
export function getAllHebbianLinks(
  store: SQLiteStore,
): Array<{ sourceId: string; targetId: string; strength: number }> {
  return store.getAllHebbianLinks();
}
