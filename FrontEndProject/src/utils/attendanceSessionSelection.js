// Staff attendance starts blank until a session is chosen or created.
// The admin migration workspace retains its existing automatic selection.
export const selectAttendanceSession = (sessions, selectedId, isAdmin = false) => {
  const selected = sessions.find((session) => session.id === selectedId);
  if (selected) return selected;
  if (!isAdmin) return null;
  return sessions.find((session) => session.status !== 'migrated') || sessions[0] || null;
};
