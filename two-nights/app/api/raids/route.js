import {rio} from '../../../lib/raider.mjs';
export async function GET(request) {
  const expansion = new URL(request.url).searchParams.get('expansion') || '11';
  if (!/^\d{1,2}$/.test(expansion)) return Response.json({error:'Invalid expansion ID.'},{status:400});
  try {
    const data = await rio('raiding/static-data',{expansion_id:expansion});
    if (!Array.isArray(data.raids)) throw new Error('Unexpected raid metadata format.');
    return Response.json({raids:data.raids.map(r => ({name:r.name,slug:r.slug,bosses:r.encounters?.length || 0}))});
  } catch(e) {return Response.json({error:e.message},{status:502});}
}
