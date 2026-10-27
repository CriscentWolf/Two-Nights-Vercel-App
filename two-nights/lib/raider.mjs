export async function rio(path, params) {
  const url = new URL('https://raider.io/api/v1/' + path);
  for (const [key,value] of Object.entries(params)) url.searchParams.set(key,String(value));
  const r = await fetch(url,{next:{revalidate:1800},signal:AbortSignal.timeout(12000)});
  if (!r.ok) throw new Error(`Raider.IO returned ${r.status}. Check the raid slug or try again later.`);
  return r.json();
}
export function normalizeRankings(body, region) {
  if (!Array.isArray(body.raidRankings)) throw new Error('Unexpected Raider.IO response; no rankings were used.');
  return body.raidRankings.map(r => {
    const g = r.guild;
    if (!g || typeof g.name !== 'string' || typeof g.realm?.slug !== 'string' || !Number.isInteger(r.rank)) throw new Error('Raider.IO response shape changed; normalization needs review.');
    return {name:g.name,realm:g.realm.slug,realmName:g.realm.name || g.realm.slug,region,sourceRank:r.rank,kills:Array.isArray(r.encountersDefeated)?r.encountersDefeated.length:0,url:`https://raider.io/guilds/${region}/${encodeURIComponent(g.realm.slug)}/${encodeURIComponent(g.name)}`};
  });
}
