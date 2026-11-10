const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString("zh-CN",{maximumFractionDigits:2});
let latest=[];
function getWatch(){try{return JSON.parse(localStorage.getItem("wave_watch")||"[]")}catch{return[]}}
function setWatch(a){localStorage.setItem("wave_watch",JSON.stringify(a));renderWatch()}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function loadPolicy(){
 const box=$("policyList");if(!box)return;box.innerHTML='<div class="empty">正在读取国务院政策原文…</div>';
 try{
  const r=await fetch("/api/policy"),j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"政策来源暂不可用");
  $("policyStatus").textContent="原文分析："+(j.items||[]).length+"条";
  box.innerHTML=(j.items||[]).length?j.items.map(p=>{
   const themes=(p.themes||[]).map(t=>'<span class="tag">'+esc(t.theme)+'：'+esc((t.keywords||[]).join("、"))+'</span>').join("");
   const tools=(p.tools||[]).map(t=>'<span class="tag">'+esc(t)+'</span>').join("");
   const safeUrl=/^https:\/\/[^/]*gov\.cn\//.test(String(p.url||""))?p.url:"#";
   return '<article class="stock"><div class="stock-name">'+esc(p.title)+'</div><div class="tags">'+(themes||'<span class="tag">正文未匹配重点行业</span>')+'</div><div class="reason">'+esc(p.date||"日期以原文为准")+' · '+esc(p.policyType||"政策线索")+' · '+esc(p.source||"国务院")+'</div>'+(tools?'<div class="tags">'+tools+'</div>':"")+'<div class="reason">'+esc(p.summary||"")+'</div><div class="stock-actions"><a class="small" href="'+esc(safeUrl)+'" target="_blank" rel="noopener">查看政策原文</a></div></article>';
  }).join(""):'<div class="empty">暂无可核实的政策正文，不用新闻标题凑数。</div>';
 }catch(e){$("policyStatus").textContent="政策原文暂不可用";box.innerHTML='<div class="error">'+esc(e.message)+'。不会用虚构政策填充结果。</div>'}
}
function renderCard(s,watch=false){const pct=Number(s.change||0),cls=pct>=0?"up":"down";return '<article class="stock"><div class="stock-top"><div><span class="stock-name">'+esc(s.name)+'</span><span class="code">'+esc(s.code)+'</span></div><div class="price">'+fmt(s.price)+' <span class="'+cls+'">'+(pct>=0?"+":"")+pct.toFixed(2)+'%</span></div></div><div class="tags"><span class="tag">'+esc(s.stage||"自选股")+'</span><span class="tag">评分 '+(s.score??"—")+'</span><span class="tag">横盘 '+(s.boxDays||"—")+'日</span><span class="tag">箱顶 '+fmt(s.boxHigh)+'</span><span class="tag">箱底 '+fmt(s.boxLow)+'</span><span class="tag">近5/20日均量 '+fmt(s.volumeRatio)+'</span><span class="tag">振幅收敛比 '+fmt(s.contraction)+'</span></div><div class="reason">所属板块：'+esc(s.board||"—")+' · 箱体宽度：'+(s.boxWidth??"—")+'%<br>'+esc(s.reason||"加入自选，等待进一步观察。")+'</div><div class="stock-actions"><button class="small" onclick="toggleWatch(\''+esc(s.code)+'\')">'+(watch?"移出自选":"加入自选")+'</button></div></article>'}
function renderWatch(){const w=getWatch();$("watchlist").innerHTML=w.length?w.map(s=>renderCard(s,true)).join(""):'<div class="empty">暂时没有自选股。</div>'}
window.toggleWatch=code=>{let w=getWatch();if(w.some(x=>x.code===code))w=w.filter(x=>x.code!==code);else{const s=latest.find(x=>x.code===code);if(s)w.unshift(s)}setWatch(w)};
async function scan(){$("scanBtn").disabled=true;$("scanHint").textContent="正在扫描板块和成分股…";$("results").innerHTML='<div class="empty">正在获取板块行情和成分股日线，可能需要一些时间。</div>';try{const r=await fetch("/api/scan"),j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"行情接口暂不可用");latest=j.items||[];$("count").textContent=fmt(j.scanned);$("qualified").textContent=fmt(j.qualified);$("date").textContent=j.date||"—";$("marketStatus").textContent="板块扫描完成 · "+(j.date||"日期未知");$("scanHint").textContent=(j.note||"板块联动 + 箱体突破筛选");$("boards").innerHTML=(j.boards||[]).map(b=>'<span class="tag">'+esc(b.name)+' '+(b.change>=0?"+":"")+Number(b.change).toFixed(2)+'% · '+b.count+'只候选</span>').join("")||"暂无板块";const stages=["即将突破观察","刚刚放量突破","突破回踩确认"];$("results").innerHTML=latest.length?stages.map(stage=>{const list=latest.filter(x=>x.stage===stage);return list.length?'<div class="stage"><h3>'+stage+'（'+list.length+'）</h3>'+list.map(s=>renderCard(s)).join("")+'</div>':""}).join(""):'<div class="empty">本次没有符合严格条件的股票，不凑数。</div>'}catch(e){$("results").innerHTML='<div class="error">获取失败：'+esc(e.message)+'<br>公开行情接口可能限流或调整，请稍后重试。</div>';$("marketStatus").textContent="行情获取失败";$("scanHint").textContent="未完成"}finally{$("scanBtn").disabled=false}}
$("scanBtn").addEventListener("click",scan);$("refreshBtn").addEventListener("click",scan);renderWatch();loadPolicy();
