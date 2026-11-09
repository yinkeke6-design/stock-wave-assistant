const SOURCES=[
  {name:"国务院政策文件库",url:"https://www.gov.cn/zhengce/zuixin/"},
  {name:"国务院",url:"https://www.gov.cn/"}
];
const THEMES=[
  ["人工智能/算力","人工智能","大模型","算力","数据中心","智算","智能体"],
  ["半导体/集成电路","集成电路","半导体","芯片","先进封装","光刻","存储"],
  ["低空经济/商业航天","低空经济","无人机","通用航空","商业航天","卫星互联网","火箭"],
  ["新能源/储能","储能","新型电力系统","光伏","风电","氢能","新能源"],
  ["汽车/智能驾驶","新能源汽车","智能网联汽车","自动驾驶","智能驾驶","汽车以旧换新"],
  ["工业母机/机器人","工业母机","机器人","人形机器人","数控机床","工业软件"],
  ["医药/医疗器械","创新药","生物医药","医疗器械","中医药","医保"],
  ["消费/内需","提振消费","消费品以旧换新","家电","文旅","养老","育儿"],
  ["电网/电力设备","特高压","电网投资","配电网","电力设备","电力市场"],
  ["数据要素/数字经济","数据要素","数据交易","数字经济","公共数据","数据基础设施"],
  ["国防军工","国防","军民融合","航空发动机","国防科技"],
  ["环保/循环经济","绿色低碳","节能降碳","循环经济","污染防治"]
];
function clean(s){return String(s||"").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim()}
function classify(title){const hits=[];for(const [theme,...words] of THEMES){const matched=words.filter(w=>title.includes(w));if(matched.length)hits.push({theme,keywords:matched})}return hits}
function dateFrom(s){const m=String(s).match(/20\d{2}[年./-]\d{1,2}[月./-]\d{1,2}日?/);return m?m[0]:""}
async function fetchPage(url){const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 (compatible; ASharePolicyBot/1.0)","Accept":"text/html,application/xhtml+xml"}});if(!r.ok)throw new Error("政策网站 HTTP "+r.status);return await r.text()}
export async function onRequestGet(){const errors=[];for(const source of SOURCES){try{const html=await fetchPage(source.url);const found=[];const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;while((m=re.exec(html))!==null){const title=clean(m[2]);if(title.length<8||title.length>100)continue;if(!/(政策|意见|通知|规划|方案|措施|办法|条例|指导|行动|实施|工作要点)/.test(title))continue;let url;try{url=new URL(m[1],source.url).href}catch{continue}if(!/gov\.cn$/.test(new URL(url).hostname)||url===source.url)continue;const themes=classify(title);found.push({title,url,source:source.name,date:dateFrom(title),themes})}const unique=[...new Map(found.map(x=>[x.url,x])).values()].slice(0,35);if(unique.length)return Response.json({ok:true,source:source.name,items:unique,updatedAt:new Date().toISOString(),note:"仅抓取国务院网站公开页面标题并按关键词提示可能关联的行业；关键词匹配不是官方产业认定，需打开原文核实政策方向、适用范围和实施时间。"} ,{headers:{"cache-control":"public, max-age=900"}});errors.push(source.name+"：页面未解析到政策条目")}catch(e){errors.push(source.name+"："+(e?.message||"请求失败"))}}return Response.json({ok:false,error:"暂时无法读取官方政策页面",details:errors},{status:502,headers:{"cache-control":"no-store"}})}
