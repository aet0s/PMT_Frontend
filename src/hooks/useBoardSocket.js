import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketProvider';

import { shouldIgnoreIncomingEvent } from '../lib/mutationTracker';

export function useBoardSocket(boardId, onBoardEvent, onRefreshBoard) {
  const { socket, originId, connected } = useSocket();
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [highlightedCardId, setHighlightedCardId] = useState(null);

  useEffect(() => {
    if (!socket || !boardId || !connected) return;

    // Join board room
    socket.emit('join_board', { boardId });

    // Handle online presence
    const handlePresence = ({ boardId: id, onlineMembers: members }) => {
      if (Number(id) === Number(boardId)) {
        setOnlineMembers(members || []);
      }
    };

    const handleEvent = (eventName, data) => {
      if (!data) return;

      const entityType = eventName.startsWith('card')
        ? 'card'
        : eventName.startsWith('checklist_item')
        ? 'checklist_item'
        : eventName.startsWith('list')
        ? 'list'
        : null;
      const entityId = data.itemId || data.cardId || data.card?.id || data.listId || data.list?.id;
      const incomingUpdatedAt = data.updated_at || data.card?.updated_at || data.timestamp;

      const check = shouldIgnoreIncomingEvent({
        originId: data.originId,
        clientMutationId: data.clientMutationId,
        myOriginId: originId,
        entityType,
        entityId,
        incomingUpdatedAt
      });

      if (check.ignore) {
        return;
      }

      // Trigger card highlight ring if updated by someone else
      if (data.cardId || data.card?.id) {
        const cId = data.cardId || data.card?.id;
        setHighlightedCardId(cId);
        setTimeout(() => setHighlightedCardId(null), 3500);
      }

      if (onBoardEvent) {
        onBoardEvent(eventName, data);
      }
    };

    const events = [
      'card:created',
      'card:updated',
      'card:moved',
      'card:deleted',
      'list:created',
      'list:updated',
      'list:reordered',
      'list:deleted',
      'comment:added',
      'member:added',
      'member:removed',
      'checklist_item:toggled'
    ];

    events.forEach((evt) => {
      socket.on(evt, (data) => handleEvent(evt, data));
    });

    socket.on('board:presence_update', handlePresence);

    // Reconnection handling: refetch board data when socket reconnects
    const handleReconnect = () => {
      socket.emit('join_board', { boardId });
      if (onRefreshBoard) onRefreshBoard();
    };

    socket.on('connect', handleReconnect);

    return () => {
      socket.emit('leave_board', { boardId });
      events.forEach((evt) => socket.off(evt));
      socket.off('board:presence_update', handlePresence);
      socket.off('connect', handleReconnect);
    };
  }, [socket, boardId, connected, originId]);

  return {
    onlineMembers,
    highlightedCardId
  };
}
