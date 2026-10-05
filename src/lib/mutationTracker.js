// client/src/lib/mutationTracker.js
// Client mutation manager for optimistic updates vs WebSocket real-time events.
// Tracks in-flight / recent mutation IDs and local entity timestamps.

const recentMutations = new Map(); // mutationId -> timestamp
const entityTimestamps = new Map(); // entityKey (e.g. 'card:123', 'checklist_item:456') -> timestamp
const MUTATION_TTL_MS = 15000;

export function generateMutationId() {
  const id = `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  recordMutation(id);
  return id;
}

export function recordMutation(mutationId) {
  if (!mutationId) return;
  recentMutations.set(mutationId, Date.now());
  // Prune old entries
  if (recentMutations.size > 300) {
    const cutoff = Date.now() - MUTATION_TTL_MS;
    for (const [id, time] of recentMutations.entries()) {
      if (time < cutoff) recentMutations.delete(id);
    }
  }
}

export function hasRecentMutation(mutationId) {
  if (!mutationId) return false;
  return recentMutations.has(mutationId);
}

export function recordLocalUpdate(entityType, entityId, timestamp = Date.now()) {
  if (!entityType || !entityId) return;
  const key = `${entityType}:${entityId}`;
  entityTimestamps.set(key, timestamp);
}

export function getLocalUpdatedAt(entityType, entityId) {
  if (!entityType || !entityId) return 0;
  return entityTimestamps.get(`${entityType}:${entityId}`) || 0;
}

/**
 * Determine if an incoming WebSocket event should be ignored:
 * 1. Echoed event from this tab (originId match).
 * 2. Echoed mutation from this tab (clientMutationId match).
 * 3. Incoming event has timestamp older than local state for this entity.
 */
export function shouldIgnoreIncomingEvent({
  originId,
  clientMutationId,
  myOriginId,
  entityType,
  entityId,
  incomingUpdatedAt
}) {
  // 1. Echo suppression: ignore if originating from this client tab
  if (originId && myOriginId && originId === myOriginId) {
    return { ignore: true, reason: 'echo_origin_id' };
  }

  // 2. Ignore if matching recent client mutation ID
  if (clientMutationId && hasRecentMutation(clientMutationId)) {
    return { ignore: true, reason: 'echo_client_mutation_id' };
  }

  // 3. Stale event suppression: ignore incoming event if local state is newer
  if (entityType && entityId && incomingUpdatedAt) {
    const incomingTime = new Date(incomingUpdatedAt).getTime();
    const localTime = getLocalUpdatedAt(entityType, entityId);
    if (localTime > 0 && incomingTime < localTime) {
      return { ignore: true, reason: 'stale_timestamp', localTime, incomingTime };
    }
  }

  return { ignore: false };
}
