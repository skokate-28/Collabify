import React, { useState, useEffect, useRef } from 'react';

const CURSOR_COLORS = ['#F87171','#FB923C','#FACC15','#4ADE80','#34D399','#22D3EE','#818CF8','#E879F9'];

export default function LiveCursors({ cursors = {} }) {
  const [visibleCursors, setVisibleCursors] = useState({});
  const timerRefs = useRef({});

  useEffect(() => {
    // Copy cursors into visible state and manage 3s fade timeouts
    const updated = { ...visibleCursors };
    Object.keys(cursors).forEach((userId) => {
      updated[userId] = cursors[userId];

      // Clear existing timer
      if (timerRefs.current[userId]) {
        clearTimeout(timerRefs.current[userId]);
      }

      // Set new 3s hide timer
      timerRefs.current[userId] = setTimeout(() => {
        setVisibleCursors((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }, 3000);
    });

    setVisibleCursors(updated);

    return () => {
      Object.values(timerRefs.current).forEach(clearTimeout);
    };
  }, [cursors]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
      {Object.entries(visibleCursors).map(([userId, cursor]) => (
        <div
          key={userId}
          className="absolute transition-all duration-200 ease-out"
          style={{
            top: `${cursor.position || 0}px`,
            left: '0',
            width: '100%',
          }}
        >
          <div className="flex items-center gap-1">
            <div
              className="w-0.5 h-5 rounded-full animate-pulse"
              style={{ backgroundColor: cursor.color || CURSOR_COLORS[0] }}
            />
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-semibold text-white shadow-sm"
              style={{ backgroundColor: cursor.color || CURSOR_COLORS[0] }}
            >
              {cursor.userName}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
