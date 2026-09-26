import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const queue=require('../CashEmpire/cloud-outbox.js');
const id=n=>'old-click-'+String(n).padStart(6,'0');
function storage(initial={},failKey=''){
  const values=new Map(Object.entries(initial));
  return {values,getItem:key=>values.has(key)?values.get(key):null,setItem(key,value){if(key===failKey)throw Error('Storage full');values.set(key,String(value));},removeItem:key=>values.delete(key)};
}
test('one thousand old click batches compact to one request and keep the purchase order',()=>{
  const clicks=Array.from({length:1000},(_,i)=>({actionId:id(i),type:'click_batch',count:2}));
  const buy={actionId:'buy-business-old-0001',type:'buy_business',businessId:'collector',quantity:1};
  const migrated=queue.compactLegacy([...clicks,buy]);
  assert.equal(migrated.length,2);
  assert.equal(migrated[0].entries.length,1000);
  assert.equal(migrated[0].total,2000);
  assert.equal(migrated[1].type,'buy_business');
  const plan=queue.planNext(migrated,{id:'device-stream-0001',total:0,acked:0});
  assert.equal(plan.consume,2);
  assert.equal(plan.request.type,'buy_business');
  assert.equal(plan.request.clicks[0].legacy.length,1000);
  assert.equal(plan.request.clicks[0].total,2000);
});
test('a large old backlog needs only a few checkpoints and keeps upgrades between click runs',()=>{
  const first=Array.from({length:1500},(_,i)=>({actionId:id(i),type:'click_batch',count:1}));
  const upgrade={actionId:'upgrade-action-0001',type:'buy_upgrade',upgradeId:'wallet'};
  const second=Array.from({length:1000},(_,i)=>({actionId:id(i+1500),type:'click_batch',count:1}));
  const migrated=queue.compactLegacy([...first,upgrade,...second]);
  assert.deepEqual(migrated.map(x=>x.type),['legacy_clicks','legacy_clicks','buy_upgrade','legacy_clicks']);
  assert.deepEqual(migrated.filter(x=>x.type==='legacy_clicks').map(x=>x.entries.length),[1000,500,1000]);
  assert.deepEqual(migrated.filter(x=>x.type==='legacy_clicks').map(x=>x.total),[1000,1500,2500]);
  const plan=queue.planNext(migrated.slice(1),{id:'device-stream-0001',total:0,acked:0});
  assert.equal(plan.consume,2);assert.equal(plan.request.type,'buy_upgrade');
});
test('migration deduplicates old action IDs and attaches pending new clicks before a buy',()=>{
  const old={actionId:id(1),type:'click_batch',count:25};
  const migrated=queue.compactLegacy([old,old,{actionId:'buy-business-old-0002',type:'buy_business',businessId:'lemonade',quantity:1,clickTotal:50}]);
  assert.equal(migrated[0].total,25);
  const plan=queue.planNext(migrated,{id:'device-stream-0001',total:50,acked:0});
  assert.equal(plan.request.clicks.length,2);
  assert.equal(plan.request.clicks[1].total,50);
  assert.equal(plan.request.clickTotal,undefined);
});
test('account-key migration merges username queues without losing clicks or duplicate purchases',()=>{
  const old=queue.compactLegacy([{actionId:id(3),type:'click_batch',count:20},{actionId:'buy-business-unique-0001',type:'buy_business',businessId:'collector',quantity:1}]);
  const renamed=queue.compactLegacy([{actionId:id(3),type:'click_batch',count:20},{actionId:'buy-business-unique-0001',type:'buy_business',businessId:'collector',quantity:1}]);
  const merged=queue.mergeQueues([...old,...renamed],[{type:'legacy_stream',streamId:'old-device-stream-0001',total:5}]);
  assert.equal(merged.filter(x=>x.type==='buy_business').length,1);
  assert.equal(merged.filter(x=>x.type==='legacy_clicks').length,1);
  assert.equal(merged.at(-1).total,5);
});
test('account migration preserves old queues and an unacknowledged click stream across a username change',()=>{
  const oldName='FormerName',newName='CurrentName',userId='account-id-12345';
  const clicks=Array.from({length:1000},(_,i)=>({actionId:id(i),type:'click_batch',count:3}));
  const buy={actionId:'buy-business-old-0001',type:'buy_business',businessId:'collector',quantity:1};
  const oldStream={id:'old-device-stream-0001',total:75,acked:25};
  const data=storage({
    ['cash-empire-cloud-outbox-v1:'+oldName]:JSON.stringify([...clicks,buy]),
    ['cash-empire-cloud-outbox-v3:'+newName]:JSON.stringify([buy]),
    ['cash-empire-click-stream-v3:'+oldName]:JSON.stringify(oldStream),
    ['cash-empire-progress-epoch-v1:'+oldName]:'4'
  });
  const result=queue.migrateAccountStorage(data,userId,[oldName,newName],()=>'new-device-stream-001');
  assert.equal(result.queue.length,2);
  assert.equal(result.queue[0].total,3000);
  assert.equal(result.queue[0].entries.length,1000);
  assert.equal(result.queue[1].type,'buy_business');
  assert.deepEqual(result.stream,oldStream);
  assert.equal(data.getItem('cash-empire-progress-epoch-v1:'+userId),'4');
  assert.equal(data.getItem('cash-empire-cloud-outbox-v1:'+oldName),null);
  assert.equal(data.getItem('cash-empire-click-stream-v3:'+oldName),null);
  const again=queue.migrateAccountStorage(data,userId,[oldName,newName],()=>'unused-stream-0001');
  assert.deepEqual(again,result);
});
test('account migration keeps old data if target storage cannot be written',()=>{
  const oldKey='cash-empire-cloud-outbox-v1:OldName',target='cash-empire-cloud-outbox-v3:account-id-12345';
  const oldValue=JSON.stringify([{actionId:id(1),type:'click_batch',count:9}]);
  const data=storage({[oldKey]:oldValue},target);
  assert.throws(()=>queue.migrateAccountStorage(data,'account-id-12345',['OldName'],()=>'new-device-stream-001'));
  assert.equal(data.getItem(oldKey),oldValue);
});
test('an old distinct click stream remains queued when an account stream already exists',()=>{
  const userId='account-id-12345';
  const data=storage({
    ['cash-empire-click-stream-v3:'+userId]:JSON.stringify({id:'new-device-stream-001',total:30,acked:10}),
    'cash-empire-click-stream-v3:OldName':JSON.stringify({id:'old-device-stream-0001',total:75,acked:25})
  });
  const result=queue.migrateAccountStorage(data,userId,['OldName'],()=>'unused-stream-0001');
  assert.equal(result.queue[0].type,'legacy_stream');
  assert.equal(result.queue[0].total,75);
  assert.equal(result.stream.id,'new-device-stream-001');
  assert.equal(data.getItem('cash-empire-click-stream-v3:OldName'),null);
});
