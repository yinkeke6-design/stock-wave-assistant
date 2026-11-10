const BASE="https://push2.eastmoney.com";
const HIST="https://push2his.eastmoney.com";
const headers={"User-Agent":"Mozilla/5.0","Referer":"https://quote.eastmoney.com/"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store"}});
async function getJson(url){const urls=[url];if(url.startsWith(BASE+"/"))urls.push(url.replace(BASE,"https://push2delay.eastmoney.com"));let last="未知错误";for(const target of urls){for(let i=0;i<2;i++){try{const r=await fetch(target,{headers,signal:AbortSignal.timeout(9000)});if(!r.ok){last="行情源 HTTP "+r.status;continue}return await r.json()}catch(e){last=e?.message||"网络请求失败"}}}throw new Error(last+"（主行情域名及备用域名均未成功）")}
function secid(code){return (/^(6|5|9)/.test(code)?"1.":"0.")+code}
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:0}
async function pool(items,limit,fn){const out=new Array(items.length);let next=0;await Promise.all(Array.from({length:limit},async()=>{while(true){const i=next++;if(i>=items.length)return;try{out[i]=await fn(items[i],i)}catch{out[i]=null}}}));return out}
let latestMarketDate="";
async function kline(code){const url=HIST+"/api/qt/stock/kline/get?secid="+secid(code)+"&klt=101&fqt=1&beg=20250101&end=20500101&lmt=130&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61";const h=await getJson(url);const rows=(h?.data?.klines||[]).map(k=>k.split(","));const d=rows.at(-1)?.[0]||"";if(d&&d>latestMarketDate)latestMarketDate=d;return rows}
function analyze(rows,q,b){
 if(rows.length<85)return null;
 const a=rows.map(r=>({date:r[0],close:+r[2],high:+r[3],low:+r[4],vol:+r[5]||0})).filter(x=>x.close>0&&x.high>0&&x.low>0);
 if(a.length<85)return null;
 const last=a.at(-1),prev=a.at(-2),hist=a.slice(-66,-6);
 if(hist.length<50)return null;
 const hi=Math.max(...hist.map(x=>x.high)),lo=Math.min(...hist.map(x=>x.low)),width=(hi-lo)/lo,pos=(last.close-lo)/(hi-lo||1);
 const near=last.close>=hi*.94&&last.close<=hi*1.025;
 const v5=mean(a.slice(-5).map(x=>x.vol)),v20=mean(a.slice(-26,-1).map(x=>x.vol));
 const ma20=mean(a.slice(-20).map(x=>x.close)),ma60=mean(a.slice(-60).map(x=>x.close)),change=Number(q.f3)||0;
 const rangePct=x=>(x.high-x.low)/x.close;
 const recentRange=mean(a.slice(-20).map(rangePct)),priorRange=mean(a.slice(-40,-20).map(rangePct));
 const contraction=priorRange>0?recentRange/priorRange:1;
 const breakout=last.close>hi*1.015&&last.vol>v20*1.35&&change<=8.5;
 const pullback=prev.close>hi*1.015&&last.close>=hi*.985&&last.close<=hi*1.025&&change<=5;
 let stage="",score=0,why=[];
 if(pullback){stage="突破回踩确认";score+=27;why.push("突破后回踩箱顶附近")}
 else if(breakout){stage="刚刚放量突破";score+=25;why.push("收盘有效站上箱顶且当日放量")}
 else if(near){stage="即将突破观察";score+=25;why.push("股价接近箱体上沿")}
 else return null;
 if(width>=.08&&width<=.25){score+=20;why.push("箱体宽度控制在25%以内")}else return null;
 if(contraction<=.88){score+=15;why.push("近20日振幅较前20日收敛")}else if(contraction<=1.0){score+=8;why.push("近期振幅略有收敛")}else return null;
 if(v20>0&&v5/v20<.9){score+=10;why.push("近5日均量低于近20日均量")}
 if(pos>=.82){score+=10;why.push("处于箱体上部")}
 if(last.close>=ma20){score+=8;why.push("收盘站在20日线上方")}
 if(ma20>=ma60*.97){score+=5;why.push("中期均线未明显走弱")}
 if(change>7){score-=8;why.push("当日涨幅偏大，谨防追高")}
 return{code:String(q.f12),name:String(q.f14),price:Number(q.f2),change,score,stage,board:b.name,boxHigh:Number(hi.toFixed(2)),boxLow:Number(lo.toFixed(2)),boxDays:hist.length,boxWidth:Number((width*100).toFixed(1)),volumeRatio:Number((v20?v5/v20:0).toFixed(2)),contraction:Number(contraction.toFixed(2)),date:last.date,reason:why.join("；")+"。历史形态初筛，需人工核对。"}
}
export async function onRequestGet({request}){latestMarketDate="";const u=new URL(request.url);if(!u.pathname.endsWith("/api/scan"))return json({ok:false,error:"Not found"},404);try{
 const boardUrl=BASE+"/api/qt/clist/get?pn=1&pz=500&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:2,m:90+t:3&fields=f12,f14,f2,f3,f5,f6,f8";
 let br;try{br=await getJson(boardUrl)}catch(e){throw new Error("获取强势板块列表失败："+e.message)}
 const boards=(br?.data?.diff||[]).filter(x=>x.f12&&x.f14&&Number(x.f2)>0).sort((a,b)=>(Number(b.f3)||0)-(Number(a.f3)||0)).slice(0,8).map(x=>({code:String(x.f12),name:String(x.f14),change:Number(x.f3)||0}));
 if(!boards.length)throw new Error("未取得板块列表，可能是行情接口调整或限流");
 const groupResults=await pool(boards,4,async b=>{
  const url=BASE+"/api/qt/clist/get?pn=1&pz=80&po=1&np=1&fltt=2&invt=2&fid=f6&fs=b:"+b.code+"&fields=f12,f14,f2,f3,f5,f6,f8";
  const data=await getJson(url);
  const members=(data?.data?.diff||[]).filter(x=>x.f12&&x.f14&&Number(x.f2)>0&&!String(x.f14).includes("ST")).slice(0,15);
  const found=await pool(members,8,async q=>analyze(await kline(String(q.f12)),q,b));
  return{board:b,members:members.length,items:found.filter(Boolean)}
 });
 const failed=groupResults.filter(g=>!g),groups=groupResults.filter(Boolean);
 if(!groups.length)throw new Error("所有强势板块成分股请求均失败，请稍后重试或检查行情接口");
 const all=groups.flatMap(g=>g.items||[]).sort((a,b)=>b.score-a.score),unique=[...new Map(all.map(x=>[x.code,x])).values()];
 const stages=["即将突破观察","刚刚放量突破","突破回踩确认"];
 const items=stages.flatMap(s=>unique.filter(x=>x.stage===s).sort((a,b)=>b.score-a.score).slice(0,15));
 const date=latestMarketDate||groups.flatMap(g=>g.items||[]).map(x=>x.date).filter(Boolean).sort().at(-1)||"—";
 return json({ok:true,scanned:groups.reduce((n,g)=>n+(g.members||0),0),qualified:unique.length,items,boards:groups.map(g=>({name:g.board.name,change:g.board.change,count:(g.items||[]).length})),failedBoards:failed.length,date,note:"扫描涨幅靠前的最多8个板块，每板块最多15只成分股，先控制请求量以避免行情接口长时间无响应。候选须满足箱体宽度不超过25%、近期振幅收敛及趋势条件；无合格标的不凑数。"}
 )}catch(e){return json({ok:false,error:"扫描失败："+e.message},502)}}
