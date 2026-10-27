import {timingSafeEqual} from 'node:crypto';
import {summarizeActivity} from '../../../lib/sessions.mjs';
export const runtime = 'nodejs';
export async function POST(request) {
  const secret = process.env.ACTIVITY_ACCESS_TOKEN;
  const incoming = request.headers.get('authorization') || '';
  const expected = 'Bearer ' + secret;
  if (!secret || Buffer.byteLength(incoming) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(incoming),Buffer.from(expected))) return Response.json({error:'Activity checks require the configured access token.'},{status:401});
  if (!process.env.WCL_CLIENT_ID || !process.env.WCL_CLIENT_SECRET) return Response.json({error:'Configure WCL_CLIENT_ID and WCL_CLIENT_SECRET in Vercel first.'},{status:503});
  try {
    const p = await request.json();
    if (!['us','eu','kr','tw'].includes(p.region) || typeof p.name !== 'string' || !p.name || p.name.length > 100 || typeof p.realm !== 'string' || !/^[a-z0-9-]{1,100}$/.test(p.realm) || !Number.isInteger(p.zoneID) || p.zoneID <= 0 || p.zoneID > 1000) return Response.json({error:'Provide region, guild name, realm slug and the Warcraft Logs zone ID.'},{status:400});
    new Intl.DateTimeFormat('en',{timeZone:p.timeZone});
    const auth = await fetch('https://www.warcraftlogs.com/oauth/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(process.env.WCL_CLIENT_ID+':'+process.env.WCL_CLIENT_SECRET).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(10000)});
    if (!auth.ok) throw new Error('Warcraft Logs authentication failed.');
    const {access_token} = await auth.json();
    const query = `query($name:String!,$realm:String!,$region:String!,$start:Float!,$zone:Int!){reportData{reports(guildName:$name,guildServerSlug:$realm,guildServerRegion:$region,startTime:$start,zoneID:$zone,limit:100,page:1){has_more_pages data{code startTime fights(difficulty:5){encounterID difficulty startTime endTime}}}}}`;
    const start = Date.now()-56*86400000;
    const r = await fetch('https://www.warcraftlogs.com/api/v2/client',{method:'POST',headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:JSON.stringify({query,variables:{name:p.name,realm:p.realm,region:p.region,start,zone:p.zoneID}}),signal:AbortSignal.timeout(15000)});
    if (!r.ok) throw new Error('Warcraft Logs report request failed.');
    const body = await r.json();
    if (body.errors?.length || !body.data?.reportData?.reports) throw new Error('Warcraft Logs could not return these guild reports. Check the guild identity, zone and access.');
    const result = body.data.reportData.reports;
    return Response.json({sessions:summarizeActivity(result.data,p.timeZone),reports:result.data.length,partial:result.has_more_pages,windowStart:new Date(start).toISOString(),note:'Observed public Mythic sessions only. Missing/private/personal logs and multiple teams can change the result. This does not verify required raid days.'});
  } catch(e) {return Response.json({error:e.message},{status:502});}
}
