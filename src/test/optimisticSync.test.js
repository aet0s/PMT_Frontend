import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateMutationId,
  recordMutation,
  hasRecentMutation,
  recordLocalUpdate,
  getLocalUpdatedAt,
  shouldIgnoreIncomingEvent
} from '../lib/mutationTracker';

describe('Optimistic Updates vs Socket Events Coordination', () => {
  const myOriginId = 'tab_origin_abc123';

  it('generates unique client mutation IDs and recognizes recent mutations', () => {
    const id1 = generateMutationId();
    const id2 = generateMutationId();

    expect(id1).toMatch(/^mut_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^mut_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);

    expect(hasRecentMutation(id1)).toBe(true);
    expect(hasRecentMutation(id2)).toBe(true);
    expect(hasRecentMutation('unknown_id')).toBe(false);
  });

  it('ignores echoed events matching originId or clientMutationId', () => {
    const mutId = generateMutationId();

    // 1. Match originId
    const check1 = shouldIgnoreIncomingEvent({
      originId: myOriginId,
      myOriginId,
      entityType: 'card',
      entityId: 1
    });
    expect(check1.ignore).toBe(true);
    expect(check1.reason).toBe('echo_origin_id');

    // 2. Match recent client mutation ID
    const check2 = shouldIgnoreIncomingEvent({
      originId: 'other_tab',
      clientMutationId: mutId,
      myOriginId,
      entityType: 'card',
      entityId: 1
    });
    expect(check2.ignore).toBe(true);
    expect(check2.reason).toBe('echo_client_mutation_id');
  });

  it('handles rapid consecutive check-off toggles and suppresses stale incoming events', () => {
    const itemId = 42;
    const baseTime = Date.now();

    // Step 1: User toggles item to checked at baseTime
    recordLocalUpdate('checklist_item', itemId, baseTime);

    // Step 2: Rapid consecutive toggle back to unchecked 50ms later
    const rapidToggleTime = baseTime + 50;
    recordLocalUpdate('checklist_item', itemId, rapidToggleTime);
    expect(getLocalUpdatedAt('checklist_item', itemId)).toBe(rapidToggleTime);

    // Step 3: An incoming socket event arrives with timestamp from the first toggle (older than rapidToggleTime)
    const staleEventResult = shouldIgnoreIncomingEvent({
      originId: 'remote_socket_id',
      clientMutationId: 'remote_mut_1',
      myOriginId,
      entityType: 'checklist_item',
      entityId: itemId,
      incomingUpdatedAt: new Date(baseTime + 10).toISOString() // 40ms older than local rapid toggle
    });

    expect(staleEventResult.ignore).toBe(true);
    expect(staleEventResult.reason).toBe('stale_timestamp');

    // Step 4: A newer incoming socket event from another user (after rapidToggleTime) is accepted
    const freshEventResult = shouldIgnoreIncomingEvent({
      originId: 'remote_socket_id',
      clientMutationId: 'remote_mut_2',
      myOriginId,
      entityType: 'checklist_item',
      entityId: itemId,
      incomingUpdatedAt: new Date(rapidToggleTime + 100).toISOString()
    });

    expect(freshEventResult.ignore).toBe(false);
  });
});
