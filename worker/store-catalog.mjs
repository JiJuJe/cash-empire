const pack=(prefix,slots)=>Object.fromEntries(slots.map(slot=>[slot,prefix+'_'+slot]));
export const COSMETIC_SLOTS=['pile','click','background','cards','profile','tap'];
const all=['pile','click','background','cards','profile'];
export const PRODUCTS=[
  {id:'double_money',name:'2x Money',description:'Permanent 2x money earned.',category:'power',priceCents:200,icon:'2×'},
  {id:'booster_slot_5',name:'Booster Slot 5',description:'Permanent fifth booster slot.',category:'power',priceCents:149,icon:'◇'},
  {id:'booster_slot_6',name:'Booster Slot 6',description:'Permanent sixth booster slot.',category:'power',priceCents:199,icon:'◇'},
  {id:'emerald_style',name:'Emerald Style Pack',description:'Four emerald looks for your empire.',category:'cosmetics',priceCents:149,icon:'◆',cosmetics:pack('emerald',['pile','click','cards','profile'])},
  {id:'diamond_style',name:'Diamond Style Pack',description:'Four icy diamond looks.',category:'cosmetics',priceCents:199,icon:'◆',cosmetics:pack('diamond',['pile','click','cards','profile'])},
  {id:'pink_diamond_style',name:'Pink Diamond Style Pack',description:'Four pink crystal looks.',category:'cosmetics',priceCents:249,icon:'◆',cosmetics:pack('pink_diamond',['pile','click','cards','profile'])},
  {id:'obsidian_style',name:'Obsidian Style Pack',description:'Four dark purple looks.',category:'cosmetics',priceCents:299,icon:'◆',cosmetics:pack('obsidian',['pile','click','cards','profile'])},
  {id:'neon_click_effect',name:'Neon Cash Click Effect',description:'Bright green click feedback.',category:'cosmetics',priceCents:99,icon:'✦',cosmetics:{click:'neon_click'}},
  {id:'black_gold_business_cards',name:'Black & Gold Business Cards',description:'Elegant cards for every business.',category:'cosmetics',priceCents:99,icon:'▣',cosmetics:{cards:'black_gold_cards'}},
  {id:'vault_background',name:'Vault Background',description:'A warm gold vault backdrop.',category:'cosmetics',priceCents:149,icon:'▤',cosmetics:{background:'vault_background'}},
  {id:'supporter_badge',name:'Supporter Profile Badge',description:'A badge beside your game name.',category:'cosmetics',priceCents:99,icon:'✧',cosmetics:{profile:'supporter_profile'}},
  {id:'luxury_vault_theme',name:'Luxury Vault Theme',description:'A complete black and gold look.',category:'themes',priceCents:599,icon:'♛',cosmetics:pack('luxury',all)},
  {id:'cosmic_empire_theme',name:'Cosmic Empire Theme',description:'A complete cosmic look.',category:'themes',priceCents:799,icon:'✦',cosmetics:pack('cosmic',all)},
  {id:'crate_wood',name:'Wood Crate',description:'One Wood Crate for your inventory. Preview reward odds before opening.',category:'crates',priceCents:50,icon:'▣',repeatable:true},
  {id:'crate_iron',name:'Iron Crate',description:'One Iron Crate for your inventory. Preview reward odds before opening.',category:'crates',priceCents:100,icon:'▣',repeatable:true},
  {id:'crate_royal',name:'Royal Crate',description:'One Royal Crate for your inventory. Preview reward odds before opening.',category:'crates',priceCents:300,icon:'▣',repeatable:true},
  {id:'daily_task_refresh',name:'Daily Task Refresh',description:'Start one extra daily task round after claiming every daily reward.',category:'tasks',priceCents:100,icon:'↻',repeatable:true},
  {id:'weekly_task_refresh',name:'Weekly Task Refresh',description:'Start one extra weekly task round after claiming every weekly reward.',category:'tasks',priceCents:500,icon:'↻',repeatable:true}
];
export const PRODUCT_BY_ID=new Map(PRODUCTS.map(product=>[product.id,product]));
export const COSMETIC_BY_ID=new Map(PRODUCTS.flatMap(product=>Object.entries(product.cosmetics||{}).map(([slot,id])=>[id,{id,slot,name:product.name}])));
export function publicCatalog(){return PRODUCTS.map(({id,name,description,category,priceCents,icon,cosmetics,repeatable})=>({id,name,description,category,priceCents,icon,cosmetics:cosmetics||{},repeatable:Boolean(repeatable)}));}
