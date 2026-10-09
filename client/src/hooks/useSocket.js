import { useEffect, useRef, useCallback } from 'react';
import { useSocketStore } from '../store/socketStore';

export function useSocket() {
  const socket = useSocketStore((state) => state.socket);
  const joinedRoomsRef = useRef([]);

  const joinRoom = useCallback(
    (joinEvent, payload, leaveEvent, leavePayload) => {
      const s = useSocketStore.getState().socket;
      if (!s) return;
      const leave = leaveEvent || joinEvent.replace(':join', ':leave');
      const leaveData = leavePayload || payload;
      const key = `${joinEvent}:${JSON.stringify(payload)}`;
      if (!joinedRoomsRef.current.some((r) => r.key === key)) {
        s.emit(joinEvent, payload);
        joinedRoomsRef.current.push({ key, leaveEvent: leave, payload: leaveData });
      }
    },
    []
  );

  const leaveRoom = useCallback((leaveEvent, payload) => {
    const s = useSocketStore.getState().socket;
    if (!s) return;
    s.emit(leaveEvent, payload);
    joinedRoomsRef.current = joinedRoomsRef.current.filter(
      (r) =>
        !(
          r.leaveEvent === leaveEvent &&
          JSON.stringify(r.payload) === JSON.stringify(payload)
        )
    );
  }, []);

  useEffect(() => {
    return () => {
      const s = useSocketStore.getState().socket;
      if (!s) return;
      joinedRoomsRef.current.forEach(({ leaveEvent, payload }) => {
        s.emit(leaveEvent, payload);
      });
      joinedRoomsRef.current = [];
    };
  }, []);

  return { socket, joinRoom, leaveRoom };
}

export function useSocketEvent(event, callback) {
  const socket = useSocketStore((state) => state.socket);

  useEffect(() => {
    if (!socket) return;
    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  }, [socket, event, callback]);
}
