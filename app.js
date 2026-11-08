const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString("zh-CN",{maximumFractionDigits:2});
let latest=[];
function getWatch(){try{return JSON.parse(localStorage.getItem("wave_watch")||"[]")}catch{return[]}}
function setWatch(a){localStorage.setItem("wave_watch",JSON.stringify(a));renderWatch()}
function renderCard(s,watch=false){
 const pct=Number(s.change||0), cls=pct>=0?"up":"down";
 return `<article class="stock"><div class="stock-top"><div><span class="stock-name">${esc(s.name)}</span><span class="code">${esc(s.code)}</span></div><div class="price">${fmt(s.price)} <span class="${cls}">${pct>=0?"+":""}${pct.toFixed(2)}%</span></div></div>
 <div class="tags"><span class="tag">趋势分 ${s.score??"—"}</span><span class="tag">MA20 ${fmt(s.ma20)}</span><span class="tag">成交额 ${s.amountText||"—"}</span></div>
 <div class="reason">${esc(s.reason||"加入自选，等待进一步观察。")}</div>
 <div class="stock-actions"><button class="small" onclick="toggleWatch('${esc(s.code)}')">${watch?"移出自选":"加入自选"}</button></div></article>`;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderWatch(){const w=getWatch();$("watchlist").innerHTML=w.length?w.map(s=>renderCard(s,true)).join(""):'<div class="empty">暂时没有自选股。</div>'}
window.toggleWatch=code=>{let w=getWatch();if(w.some(x=>x.code===code))w=w.filter(x=>x.code!==code);else{const s=latest.find(x=>x.code===code);if(s)w.unshift(s)}setWatch(w)};
async function scan(){
 $("scanBtn").disabled=true;$("scanHint").textContent="正在扫描…";$("results").innerHTML='<div class="empty">正在获取公开行情并计算趋势，请稍候。</div>';
 try{
  const r=await fetch("/api/scan");const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"行情接口暂不可用");
  latest=j.items||[];$("count").textContent=fmt(j.scanned);$("qualified").textContent=fmt(latest.length);$("date").textContent=j.date||"—";$("marketStatus").textContent="行情获取成功 · "+(j.date||"日期未知");
  $("scanHint").textContent=j.note||"按趋势条件筛选";
  $("results").innerHTML=latest.length?latest.map(s=>renderCard(s)).join(""):'<div class="empty">本次没有符合条件的股票，不凑数。</div>';
 }catch(e){$("results").innerHTML=`<div class="error">获取失败：${esc(e.message)}<br>请稍后重试；也可能是公开数据源限流或接口调整。</div>`;$("marketStatus").textContent="行情获取失败";$("scanHint").textContent="未完成"}
 finally{$("scanBtn").disabled=false}
}
$("scanBtn").addEventListener("click",scan);$("refreshBtn").addEventListener("click",scan);renderWatch();