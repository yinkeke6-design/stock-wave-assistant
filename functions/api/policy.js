const SOURCES=[
 {name:"国务院政策文件库",url:"https://www.gov.cn/zhengce/zuixin/"},
 {name:"国务院",url:"https://www.gov.cn/"}
];
const THEMES=[
 ["人工智能/算力",["人工智能","大模型","算力","数据中心","智算","智能体","数据标注"]],
 ["半导体/集成电路",["集成电路","半导体","芯片","先进封装","光刻","存储"]],
 ["低空经济/商业航天",["低空经济","无人机","通用航空","商业航天","卫星互联网","火箭"]],
 ["新能源/储能",["储能","新型电力系统","光伏","风电","氢能","新能源"]],
 ["汽车/智能驾驶",["新能源汽车","智能网联汽车","自动驾驶","智能驾驶","汽车以旧换新"]],
 ["工业母机/机器人",["工业母机","机器人","人形机器人","数控机床","工业软件"]],
 ["医药/医疗器械",["创新药","生物医药","医疗器械","中医药","医保"]],
 ["消费/内需",["提振消费","消费品以旧换新","家电","文旅","养老","育儿"]],
 ["电网/电力设备",["特高压","电网投资","配电网","电力设备","电力市场"]],
 ["数据要素/数字经济",["数据要素","数据交易","数字经济","公共数据","数据基础设施"]],
 ["国防军工",["国防","军民融合","航空发动机","国防科技"]],
 ["环保/循环经济",["绿色低碳","节能降碳","循环经济","污染防治"]]
];
const POLICY=/政策|意见|通知|规划|方案|措施|办法|条例|指导意见|行动计划|实施方案|工作要点|决定/;
const NOISE=/节假日|放假|领导.*调研|调研.*考察|答记者问|新闻发布会|民意征集|意见征集|征求意见|政策文件库|政策解读|工作动态|会议召开|会议强调/;
function clean(s){return String(s||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<!--([\s\S]*?)-->/g," ").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/\s+/g," ").trim()}
function classify(text){const hits=[];for(const [theme,words] of THEMES){const matched=words.filter(w=>text.includes(w));if(matched.length)hits.push({theme,keywords:matched.slice(0,5)})}return hits}
function dateFrom(s){const m=String(s).match(/20\d{2}[年./-]\d{1,2}[月./-]\d{1,2}日?/);return m?m[0]:""}
function absolute(href,base){try{return new URL(href,base).href}catch{return""}}
async function fetchPage(url){const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 (compatible; ASharePolicyBot/1.0)","Accept":"text/html,application/xhtml+xml"},signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error("政策网站 HTTP "+r.status);return await r.text()}
function getLinks(html,base){
 const out=[];
 const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
 const allowedTitle=/^(国务院|国务院办公厅|中共中央|中共中央办公厅|国家发展改革委|财政部|工业和信息化部|国家能源局|国家数据局|国家卫生健康委).{0,80}(关于|发布|印发|公布|制定|实施|条例|办法|规定|规划|方案|意见|通知|决定)/;
 const formalEnd=/(条例|办法|规定|规划纲要|行动计划|实施方案|指导意见|若干措施|决定|通知|意见)$/;
 while(true){
  const m=re.exec(html);if(!m)break;
  const title=clean(m[2]),url=absolute(m[1],base);
  if(title.length<8||title.length>100||NOISE.test(title)||/选举|节假日|放假|答记者问|新闻发布会|政策文件库|查询|征集|征求意见|解读|调研|考察|以人民为中心/.test(title))continue;
  if(!url||!/(^|\.)gov\.cn$/.test(new URL(url).hostname)||url===base)continue;
  const path=new URL(url).pathname;
  if(!path.includes("/zhengce/content/"))continue;
  if(!(allowedTitle.test(title)||formalEnd.test(title)))continue;
  out.push({title,url});
 }
 return [...new Map(out.map(x=>[x.url,x])).values()];
}
function extractDoc(html,link,source){
 const title=clean((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||link.title);
 const date= dateFrom(html.match(/20\d{2}[年./-]\d{1,2}[月./-]\d{1,2}日?/ )?.[0]||"");
 const main=(html.match(/<(?:div|article)[^>]*(?:id|class)=["'][^"']*(?:文章|正文|content|article|TRS_Editor)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|article)>/i)||[])[1]||html;
 const extracted=clean(main);const body=(extracted.length>=180?extracted:clean(html)).slice(0,14000);
 if(body.length<180)return null;
 const combined=title+" "+body;
 const themes=classify(combined);
 const substantive=/(支持|推动|促进|加快|建设|培育|发展|实施|鼓励|专项|资金|补贴|投资|改造|创新|产业|企业|项目|技术)/.test(body);
 if(!substantive||NOISE.test(title)||!POLICY.test(title))return null;
 const tools=["财政资金/补贴","税收支持","政府采购","重大项目/投资","试点示范","标准/监管","金融支持"].filter(x=>({ "财政资金/补贴":/财政资金|专项资金|补贴|奖补/.test(body),"税收支持":/税收|税费|加计扣除/.test(body),"政府采购":/政府采购/.test(body),"重大项目/投资":/重大项目|投资建设|基础设施建设/.test(body),"试点示范":/试点|示范/.test(body),"标准/监管":/标准体系|监管|准入/.test(body),"金融支持":/信贷|融资|金融支持/.test(body)})[x]);
 const summary=body.slice(0,260)+(body.length>260?"…":"");
 return{title,url:link.url,source,date,policyType:"政策文件候选（需核对原文效力）",themes,tools,summary,bodyLength:body.length};
}
export async function onRequestGet(){
 const errors=[];
 for(const source of SOURCES){
  try{
   const html=await fetchPage(source.url),links=getLinks(html,source.url).slice(0,12);
   const docs=await Promise.all(links.map(async link=>{try{return extractDoc(await fetchPage(link.url),link,source.name)}catch{return null}}));
   const items=docs.filter(Boolean).slice(0,8);
   if(items.length)return Response.json({ok:true,source:source.name,items,updatedAt:new Date().toISOString(),note:"已尝试读取政策原文并按正文关键词归类。行业标签是程序辅助识别，不代表官方认定；政策力度、适用对象和上市公司受益关系仍需逐条核实。仅展示正式政策正文页面候选，新闻、调研、节假日、答记者问、征求意见及政策导航页面会被过滤；原文无法读取或正文不足的条目不展示。"}, {headers:{"cache-control":"public, max-age=900"}});
   errors.push(source.name+"：未能从页面链接中提取到足够完整的政策正文");
  }catch(e){errors.push(source.name+"："+(e?.message||"请求失败"))}
 }
 return Response.json({ok:false,error:"暂时无法读取足够完整的官方政策原文",details:errors},{status:502,headers:{"cache-control":"no-store"}});
}
