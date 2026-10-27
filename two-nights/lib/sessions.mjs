// Deduplicate uploads by merging overlapping/nearby encounters. Report count is not night count.
export function summarizeActivity(reports, timeZone='America/New_York') {
  new Intl.DateTimeFormat('en', {timeZone});
  const fights = reports.flatMap(r => (r.fights || []).filter(f => f.encounterID > 0 && f.difficulty === 5).map(f => ({start:r.startTime+f.startTime,end:r.startTime+f.endTime})))
    .filter(f => Number.isFinite(f.start) && Number.isFinite(f.end) && f.end > f.start).sort((a,b) => a.start-b.start);
  const sessions = [];
  for (const f of fights) {
    const last = sessions.at(-1);
    if (last && f.start - last.end <= 2 * 3600000) last.end = Math.max(last.end,f.end);
    else sessions.push({...f});
  }
  const fmt = new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'});
  return sessions.map(s => ({...s,localStart:fmt.format(new Date(s.start)),hours:Math.round((s.end-s.start)/360000)/10}));
}
