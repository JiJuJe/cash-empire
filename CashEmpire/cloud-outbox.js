(function(root){
  "use strict";
  const ID=/^[A-Za-z0-9_-]{12,80}$/;
  const ACTIONS=new Set(["golden","buy_business","buy_upgrade","buy_prestige","rebirth","unlock_slot","equip_booster","unequip_booster","claim_booster_drop"]);
  const MAX_LEGACY=1000;
  function compactLegacy(actions){
    if(!Array.isArray(actions))throw Error("Cloud queue is not an array.");
    const result=[],seen=new Set();let batch=[],total=0,streamId="";
    function flush(){if(!batch.length)return;result.push({type:"legacy_clicks",streamId,total,entries:batch});batch=[];}
    for(const action of actions){
      if(!action||typeof action!=="object"||!ID.test(action.actionId)||seen.has(action.actionId))continue;
      seen.add(action.actionId);
      if(action.type==="click_batch"){
        if(!Number.isInteger(action.count)||action.count<1||action.count>1000)throw Error("An old click batch needs recovery.");
        if(!streamId)streamId="legacy_"+action.actionId.slice(0,70);
        total+=action.count;
        if(!Number.isSafeInteger(total))throw Error("Old click count exceeds the safe range.");
        batch.push({id:action.actionId,count:action.count});
        if(batch.length===MAX_LEGACY)flush();
      }else if(ACTIONS.has(action.type)){
        flush();result.push({...action});
      }
    }
    flush();
    return result;
  }
  function planNext(queue,stream){
    if(!queue.length)return null;
    const first=queue[0],second=queue[1];
    const merge=first.type==="legacy_clicks"&&second&&second.type!=="legacy_clicks";
    const action=merge?second:first;
    const clicks=[];
    if(first.type==="legacy_clicks")clicks.push({streamId:first.streamId,total:first.total,legacy:first.entries});
    if(action.type!=="legacy_clicks"&&Number.isSafeInteger(action.clickTotal)&&action.clickTotal>stream.acked)
      clicks.push({streamId:stream.id,total:action.clickTotal});
    const request=action.type==="legacy_clicks"?{type:"click_checkpoint",clicks}:{...action,clicks};
    delete request.clickTotal;
    if(!clicks.length)delete request.clicks;
    return {request,consume:merge?2:1,ackedTotal:action.clickTotal||0};
  }
  const api={compactLegacy,planNext};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.ClickTheCashQueue=api;
})(globalThis);
