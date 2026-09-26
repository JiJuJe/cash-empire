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
  function mergeQueues(older,newer){
    if(!Array.isArray(older)||!Array.isArray(newer))throw Error("Invalid cloud queue.");
    const result=[],seen=new Set();
    for(const action of [...older,...newer]){
      if(!action||typeof action!=="object"||Array.isArray(action))throw Error("Invalid cloud action.");
      if(action.type==="legacy_clicks"){
        if(!ID.test(action.streamId)||!Number.isSafeInteger(action.total)||!Array.isArray(action.entries))throw Error("Invalid legacy clicks.");
        const key="legacy:"+action.streamId+":"+action.total;if(seen.has(key))continue;seen.add(key);
      }else if(action.type==="legacy_stream"){
        if(!ID.test(action.streamId)||!Number.isSafeInteger(action.total)||action.total<1)throw Error("Invalid old stream.");
        const key="stream:"+action.streamId+":"+action.total;if(seen.has(key))continue;seen.add(key);
      }else{
        if(!ACTIONS.has(action.type)||!ID.test(action.actionId))throw Error("Invalid cloud action.");
        if(seen.has(action.actionId))continue;seen.add(action.actionId);
      }
      result.push(action);
    }
    return result;
  }
  function planNext(queue,stream){
    if(!queue.length)return null;
    const first=queue[0],second=queue[1];
    const merge=(first.type==="legacy_clicks"||first.type==="legacy_stream")&&second&&second.type!=="legacy_clicks"&&second.type!=="legacy_stream";
    const action=merge?second:first;
    const clicks=[];
    if(first.type==="legacy_clicks")clicks.push({streamId:first.streamId,total:first.total,legacy:first.entries});
    if(first.type==="legacy_stream")clicks.push({streamId:first.streamId,total:first.total});
    if(action.type!=="legacy_clicks"&&Number.isSafeInteger(action.clickTotal)&&action.clickTotal>stream.acked)
      clicks.push({streamId:stream.id,total:action.clickTotal});
    const request=action.type==="legacy_clicks"||action.type==="legacy_stream"?{type:"click_checkpoint",clicks}:{...action,clicks};
    delete request.clickTotal;
    if(!clicks.length)delete request.clicks;
    return {request,consume:merge?2:1,ackedTotal:action.clickTotal||0};
  }
  function migrateAccountStorage(storage,userId,names,makeStreamId){
    if(!ID.test(userId)||!Array.isArray(names))throw Error("Invalid account migration.");
    const aliases=[...new Set(names.filter(name=>typeof name==="string"&&name.length>0))];
    const outboxKey="cash-empire-cloud-outbox-v3:"+userId,streamKey="cash-empire-click-stream-v3:"+userId;
    const keys=prefix=>aliases.map(name=>prefix+name);
    const readQueue=key=>{const raw=storage.getItem(key);if(raw===null)return [];const data=JSON.parse(raw);if(!Array.isArray(data))throw Error("Invalid cloud queue.");return data;};
    const oldQueueKeys=[...keys("cash-empire-cloud-outbox-v3:"),...keys("cash-empire-cloud-outbox-v2:"),...keys("cash-empire-cloud-outbox-v1:")];
    const oldRaw=[...keys("cash-empire-cloud-outbox-v1:").flatMap(readQueue),...keys("cash-empire-cloud-outbox-v2:").flatMap(readQueue)];
    let queue=mergeQueues([...compactLegacy(oldRaw),...keys("cash-empire-cloud-outbox-v3:").flatMap(readQueue)],readQueue(outboxKey));
    const writeQueue=()=>{const raw=JSON.stringify(queue);storage.setItem(outboxKey,raw);if(storage.getItem(outboxKey)!==raw)throw Error("Queue copy could not be verified.");};
    writeQueue();
    for(const key of oldQueueKeys)if(key!==outboxKey)storage.removeItem(key);
    for(const key of keys("cash-empire-cloud-last-batch-v1:"))storage.removeItem(key);
    const parse=raw=>{const value=JSON.parse(raw);if(!value||!ID.test(value.id)||!Number.isSafeInteger(value.total)||!Number.isSafeInteger(value.acked)||value.acked<0||value.acked>value.total)throw Error("Invalid click stream.");return value;};
    let current=storage.getItem(streamKey);
    for(const oldKey of keys("cash-empire-click-stream-v3:")){
      const previous=storage.getItem(oldKey);if(!previous||oldKey===streamKey)continue;
      const historic=parse(previous);
      if(!current){storage.setItem(streamKey,previous);if(storage.getItem(streamKey)!==previous)throw Error("Stream copy could not be verified.");current=previous;}
      else{
        const newer=parse(current);
        if(newer.id===historic.id){const merged={...newer,total:Math.max(newer.total,historic.total),acked:Math.max(newer.acked,historic.acked)};current=JSON.stringify(merged);storage.setItem(streamKey,current);if(storage.getItem(streamKey)!==current)throw Error("Stream merge could not be verified.");}
        else if(historic.total>historic.acked){queue=mergeQueues([{type:"legacy_stream",streamId:historic.id,total:historic.total}],queue);writeQueue();}
      }
      storage.removeItem(oldKey);
    }
    if(!current){current=JSON.stringify({id:makeStreamId(),total:0,acked:0});storage.setItem(streamKey,current);if(storage.getItem(streamKey)!==current)throw Error("New stream could not be saved.");}
    const epochKey="cash-empire-progress-epoch-v1:"+userId;
    for(const oldKey of keys("cash-empire-progress-epoch-v1:"))if(storage.getItem(epochKey)===null&&storage.getItem(oldKey)!==null){storage.setItem(epochKey,storage.getItem(oldKey));if(storage.getItem(epochKey)===storage.getItem(oldKey))storage.removeItem(oldKey);}
    return {queue,stream:parse(current)};
  }
  const api={compactLegacy,mergeQueues,planNext,migrateAccountStorage};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.ClickTheCashQueue=api;
})(globalThis);
