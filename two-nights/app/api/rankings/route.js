import {rio,normalizeRankings} from '../../../lib/raider.mjs';
export async function GET(request) {
  const p = new URL(request.url).searchParams;
  const region = p.get('region') || 'us', raid = p.get('raid') || '', page = Number(p.get('page') || 0);
  if (!['us','eu','kr','tw'].includes(region) || !/^[a-z0-9-]{1,100}$/.test(raid) || !Number.isInteger(page) || page < 0 || page > 199) return Response.json({error:'Invalid region, raid, or page.'},{status:400});
  try {
    const data = await rio('raiding/raid-rankings',{raid,difficulty:'mythic',region,page,limit:50});
    return Response.json({guilds:normalizeRankings(data,region),page,more:data.raidRankings.length === 50,fetchedAt:new Date().toISOString()});
  } catch(e) {return Response.json({error:e.message},{status:502});}
}
