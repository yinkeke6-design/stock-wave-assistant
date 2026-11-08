# A股波段助手（第一版骨架）

## 当前功能
- 手机网页界面，可添加到安卓桌面（浏览器菜单→添加到主屏幕）。
- 从东方财富公开行情接口读取全市场股票行情列表。
- 对成交额靠前的100只股票抓取日线，按均线趋势等规则筛选候选。
- 自选股保存在当前手机浏览器本地。

## 重要限制
1. 东方财富接口是公开但非官方承诺的接口，可能限流、变更或不可用。
2. 第一版不是对全市场每只股票逐一抓取历史K线，而是先读取全市场行情，再对成交额靠前的100只做技术复核。界面会明确说明。
3. 行情延迟和数据完整性需要在真实部署后验证；不能把它当作实时交易系统。
4. 目前没有自动下单，也不构成投资建议。

## 部署方式
这是 Cloudflare Pages Functions 项目。需要用 GitHub 连接 Pages 项目，项目根目录就是本目录。
- 上传整个项目到一个新的 GitHub 仓库（不要覆盖已有 EDG 仓库）。
- Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git。
- 选择新仓库，Framework preset 选 None，Build command 留空，Build output directory 填 `.`。
- 部署完成后打开 `https://你的项目名.pages.dev`。
- Pages Functions 会自动把 `functions/api/scan.js` 发布为 `/api/scan`。

## 下一步
部署后先测试行情接口是否可访问，再逐步加入板块强度、周线过滤、MACD、观察价位、个股详情和风险条件。