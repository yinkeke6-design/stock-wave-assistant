const BASE = "https://push2.eastmoney.com";
const HIST = "https://push2his.eastmoney.com";
const headers = {"User-Agent":"Mozilla/5.0","Referer":"https://quote.eastmoney.com/"};
const json = (data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store"}});
async function getJson(url){const r=await fetch(url,{headers});if(!r.ok)throw new Error("行情源 HTTP "+r.status);return r.json()}
function secid(code){return (code.startsWith("6")?"1.":"0.")+code}
function avg(a,n){return a.slice(-n).reduce((s,x)=>s+x,0)/n}
function amountText(v){if(v>=1e8)return (v/1e8).toFixed(1)+"亿";if(v>=1e4)return (v/1e4).toFixed(0)+"万";return String(Math.round(v))}
export async function onRequestGet({request}) {
 const u=new URL(request.url);
 if(u.pathname.endsWith("/api/scan")){
  try{
   const listUrl=BASE+"/api/qt/clist/get?pn=1&pz=5000&po=1&np=1&fltt=2&invt=2&fid=f6&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f12,f14,f2,f3,f5,f6,f7,f8,f15,f16,f17";
   const raw=await getJson(listUrl);const diff=raw?.data?.diff||[];
   const stocks=diff.filter(x=>x.f12&&x.f14&&!String(x.f14).includes("ST")&&Number(x.f2)>0&&Number(x.f6)>5e7)
     .sort((a,b)=>Number(b.f6)-Number(a.f6)).slice(0,100);
   const scored=await Promise.all(stocks.map(async x=>{
    try{
     const url=HIST+"/api/qt/stock/kline/get?secid="+secid(String(x.f12))+"&klt=101&fqt=1&beg=20260101&end=20500101&lmt=80&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61";
     const h=await getJson(url);const rows=(h?.data?.klines||[]).map(k=>k.split(","));
     if(rows.length<30)return null;
     const close=rows.map(r=>Number(r[2])).filter(n=>n>0);const vols=rows.map(r=>Number(r[5])||0);
     if(close.length<30)return null;
     const ma5=avg(close,5),ma10=avg(close,10),ma20=avg(close,20),ma60=close.length>=60?avg(close,60):null;
     const last=close.at(-1),prev=close.at(-2),volNow=vols.at(-1),volAvg=avg(vols.slice(0,-1),5);
     let score=0,why=[];
     if(last>ma20){score+=25;why.push("收盘价在20日线上方")}
     if(ma5>ma10&&ma10>ma20){score+=25;why.push("5/10/20日均线多头排列")}
     if(ma20>(ma60||ma20*0.98)){score+=15;why.push("中期均线趋势偏强")}
     if(last>=prev){score+=10;why.push("当日收盘未走弱")}
     if(volAvg>0&&volNow<volAvg*1.5){score+=10;why.push("成交量未明显异常放大")}
     const change=Number(x.f3)||0;
     if(change>0&&change<7){score+=10;why.push("当日涨幅未过度追高")}
     if(last>ma20&&ma5>ma10&&ma10>ma20&&score>=70){
      return {code:String(x.f12),name:String(x.f14),price:Number(x.f2),change,amount:Number(x.f6),amountText:amountText(Number(x.f6)),ma20:Number(ma20.toFixed(2)),score,reason:why.join("；")+"。观察回踩20日线附近的承接，不作为直接买入信号。"};
     }
     return null;
    }catch{return null}
   }));
   const items=scored.filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,30);
   return json({ok:true,scanned:diff.length,qualified:items.length,items,date:new Date().toISOString().slice(0,10),note:"全市场行情初筛后，对成交额靠前的100只进行日线趋势复核；非全市场逐只技术扫描。"});
  }catch(e){return json({ok:false,error:"行情获取失败："+e.message},502)}
 }
 return json({ok:false,error:"Not found"},404);
}