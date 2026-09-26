(function(root){
  'use strict';
  const lifetime=[0,10,100,1000,10000,100000,1000000,10000000,100000000,1000000000,10000000000,1000000000000,100000000000000,1e16,1e18,1e20,1e23,1e26];
  const rate=[0,1,3,10,50,200,1000,10000,100000,1000000,10000000,100000000,1e9,1e10,1e11,1e12,1e13,1e14];
  function stage(bestRate,lifetimeEarned){
    let result=0;
    for(let i=1;i<lifetime.length;i++)if(lifetimeEarned>=lifetime[i]||bestRate>=rate[i])result=i;
    return result;
  }
  const api={stage,thresholds:{lifetime,rate}};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClickTheCashWealth=api;
})(globalThis);
