export function guildKey(region, realm, name) {
  return [region, realm, name].map(x => String(x).normalize('NFC').toLowerCase()).join('|');
}

export function validateEvidence(value) {
  if (!Array.isArray(value) || value.length > 10000) throw new Error('Provide an array with at most 10,000 schedule records.');
  const keys = new Set();
  return value.map((r, i) => {
    if (!r || !['us','eu','kr','tw'].includes(r.region) || !['realm','name','raid','team','timeZone','checkedAt','sourceUrl'].every(k => typeof r[k] === 'string' && r[k].trim())) throw new Error(`Record ${i + 1}: region, realm, name, raid, team, timeZone, checkedAt and sourceUrl are required.`);
    if (!Array.isArray(r.days) || !r.days.length || new Set(r.days).size !== r.days.length || r.days.some(d => !['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].includes(d))) throw new Error(`Record ${i + 1}: invalid raid days.`);
    if (!Number.isFinite(r.hours) || r.hours <= 0 || r.hours > 168 || typeof r.extraRequiredNights !== 'boolean' || typeof r.logsConsistent !== 'boolean') throw new Error(`Record ${i + 1}: hours and boolean extraRequiredNights / logsConsistent are required.`);
    try { const u = new URL(r.sourceUrl); if (u.protocol !== 'https:') throw new Error(); new Intl.DateTimeFormat('en', {timeZone:r.timeZone}); } catch {throw new Error(`Record ${i + 1}: use an HTTPS source URL and valid time zone.`);}
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checkedAt) || !Number.isFinite(Date.parse(r.checkedAt))) throw new Error(`Record ${i + 1}: checkedAt must be YYYY-MM-DD.`);
    const key = guildKey(r.region, r.realm, r.name) + '|' + r.raid;
    if (keys.has(key)) throw new Error(`Record ${i + 1}: multiple teams for a guild need separate progression attribution; only one team per guild/tier is supported in v0.1.`);
    keys.add(key);
    return {...r, notes: typeof r.notes === 'string' ? r.notes : ''};
  });
}

export function assessSchedule(evidence, raid, now = Date.now()) {
  if (!evidence || evidence.raid !== raid) return {status:'unknown',reason:'No schedule evidence for this raid.'};
  const age = (now - Date.parse(evidence.checkedAt)) / 86400000;
  if (age < -1 || age > 60) return {status:'review',reason:'Schedule evidence needs a current review (within 60 days).'};
  if (evidence.days.length !== 2) return {status:'excluded',reason:'Published schedule is not two nights.'};
  if (evidence.extraRequiredNights) return {status:'extra',reason:'Two regular nights, with extra required progression nights.'};
  if (!evidence.logsConsistent) return {status:'review',reason:'Schedule submitted; log consistency has not been confirmed.'};
  return {status:'verified',reason:'Reviewer-confirmed schedule and log consistency; see source evidence.'};
}

export function leaderboard(guilds, evidence, {raid, region='us', strict=true, now=Date.now()} = {}) {
  const records = new Map(evidence.filter(e => e.raid === raid).map(e => [guildKey(e.region,e.realm,e.name), e]));
  const candidates = guilds.filter(g => g.region === region).map(g => {
    const schedule = records.get(guildKey(g.region,g.realm,g.name));
    return {...g, schedule, ...assessSchedule(schedule,raid,now)};
  }).sort((a,b) => a.sourceRank - b.sourceRank);
  const qualified = candidates.filter(g => g.status === 'verified' || (!strict && g.status === 'extra')).slice(0,100).map((g,i) => ({...g,twoDayRank:i+1}));
  const cutoff = qualified.length === 100 ? qualified.at(-1).sourceRank : Infinity;
  const unresolved = candidates.filter(g => g.sourceRank <= cutoff && ['unknown','review'].includes(g.status)).length;
  return {candidates, qualified, unresolved};
}
