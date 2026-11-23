# session-tool —— 会话搬运工具

跨环境搬运登录态（cookie + localStorage + sessionStorage）的调试工具，替代挂在个人域名 `api.1996wz.cn` 上的旧工具（个人源站不稳导致频繁 502，且数据永久留存第三方、无鉴权）。

**用法和旧工具一样：往浏览器控制台粘一段 JS 就行。**

**本版无 token、无后端存储**：导出的会话压缩成一段文本（导入码）由你直接发给对方，工具本身不保存任何会话数据。

---

## 用法

**导出（把当前登录态给别人）：** 复制下面整行，粘进控制台回车。工具会把「导入行」自动复制到剪贴板，页面顶部绿色小条提示（**不弹窗、不需要点击**），直接发给对方即可。若浏览器仍拦截自动复制，页面中间会出现一个已全选的文本框，按 `Ctrl+C` 即可。

```js
(async()=>{var __c=(typeof copy==="function")?copy:null;var U=["https://cdn.jsdelivr.net/gh/li-zhenfei/session-transfer@27f8da6f2686198b78f4b26c7f78aa16824f526c/s.js","https://gcore.jsdelivr.net/gh/li-zhenfei/session-transfer@27f8da6f2686198b78f4b26c7f78aa16824f526c/s.js","https://fastly.jsdelivr.net/gh/li-zhenfei/session-transfer@27f8da6f2686198b78f4b26c7f78aa16824f526c/s.js","https://raw.githubusercontent.com/li-zhenfei/session-transfer/27f8da6f2686198b78f4b26c7f78aa16824f526c/s.js","https://api.github.com/repos/li-zhenfei/session-transfer/contents/s.js?ref=27f8da6f2686198b78f4b26c7f78aa16824f526c"],t=null,e0=null;for(var i=0;i<U.length;i++){try{var c=new AbortController(),k=setTimeout(function(){c.abort()},10000);var r=await fetch(U[i],{cache:"no-store",signal:c.signal});clearTimeout(k);if(!r.ok)throw new Error("HTTP "+r.status);if(U[i].indexOf("api.github.com")>=0){var j=await r.json();t=atob((j.content||"").replace(/\s/g,""));}else t=await r.text();if(t&&t.indexOf("__sess.add")>=0)break;t=null;}catch(err){e0=err;t=null}}if(!t)throw new Error("脚本加载失败："+(e0?e0.message:"所有线路均不可用"));eval(t);__sess.add(__c)})().catch(e=>alert("加载失败："+e.message))
```

> **多线路兜底**：内置 5 条线路（jsDelivr 的 cdn / gcore / fastly + GitHub raw + GitHub API），逐条尝试、每条 10 秒超时，任意一条成功即停。某条线路偶发 `net::ERR_CONNECTION_CLOSED` 不会让整次粘贴失败。
> 地址固定到具体提交（不是 `@main`）。jsDelivr 对分支的缓存刷新很慢，用 `@main` 会有人拿到旧版本；固定提交后内容不可变、人人一致。

**导入（拿到别人的登录态）：** 对方发来的是一整行以 `(async()=>{var U=[` 开头的代码，**原样粘进控制台回车**即可。工具自动写回 cookie / localStorage / sessionStorage，然后刷新页面。

```
导出方：粘「导出行」→ 自动复制「导入行」→ 发给对方
导入方：粘「导入行」→ 自动写回 → 自动刷新
```

与源工具（run.js）的交互完全一致：导出拿一段代码，对方粘贴执行。区别只是这段代码里直接带着会话数据（无后端存储）。

> 走 jsDelivr CDN，不受 GitHub 未登录接口「60 次/小时/IP」限流影响。
> 导入行长度随会话大小变化，几 KB 到上百 KB；较大时建议用聊天工具的**文件**发送。

### 备选：整段粘贴（所有线路都不通时）

> 加载行已经内置 GitHub API 兜底（未登录限 60 次/小时/IP，共享出口 IP 可能 403）。只有**5 条线路全部失败**（弹「脚本加载失败」）或页面禁止 `eval` 时，才需要走这里。

1. 复制 [session-tool.js](session-tool.js) 全文
2. `F12` → **Console** → 粘贴 → 回车，然后手动执行 `__sess.add()`

适合：内网访问不到 `cdn.jsdelivr.net` / `api.github.com`，或页面 CSP 限制动态执行。

---

## 导入码格式

- `S1g` + base64(gzip 后的 JSON)：正常情况
- `S1r` + base64(JSON 原文)：浏览器不支持 `CompressionStream` 时的自动降级，仍可被正常导入
- 内容：`cookie`、`localStorage`、`sessionStorage`、来源 URL / host / UA
- 长度随会话大小变化，一般几 KB；几万字符也能直接发聊天工具（建议用文件发送）

导入端与导出端 **host 必须一致**，否则 cookie 写不进去（工具会警告）。

---

## 高级用法（`__sess.*`）

粘贴脚本后 `window.__sess` 可用：

| 命令 | 说明 |
| --- | --- |
| `__sess.add()` | 导出当前会话，生成并复制「导入行」（导出行在第一个 `await` 之前捕获控制台 `copy()`，`await` 之后仍可用；无手势/无权限弹窗） |
| `__sess.get(code)` | 导入指定导入码（不刷新） |
| `__sess.export()` | 只生成 `S1g` 导入码（不复制、不提示） |
| `__sess.import(code)` | 导入（默认清空本地 localStorage / sessionStorage） |
| `__sess.import(code, {wipe:false})` | 导入但不清空本地（可能新旧混杂） |
| `__sess.line()` | 打印导出端的加载行（多线路兜底，改线路/提交号后用它对文档） |
| `__sess.help()` | 命令说明 |

---

## 托管（仅工具 owner，一次性）

- 仓库 `li-zhenfei/session-transfer` **必须是 public**：jsDelivr 与 GitHub API 都要匿名读取 `s.js`，无需身份认证
- 仓库里只放工具代码（`README.md` + `s.js`），**不含任何密钥，也不存放会话数据**
- 更新工具：把 `session-tool.js` 转成 ASCII 安全版（`s.js`）后覆盖仓库根目录同名文件
  - ASCII 转义的作用：让 loader 的 `atob` + `eval`（备选 loader）直接可执行，不依赖 `TextDecoder`
- **jsDelivr 缓存**：分支（`@main`）缓存刷新生效很慢、且各边缘节点不一致。因此：
  1. `session-tool.js` 里的 `SHA` 固定为**具体提交号**（每次发版更新），5 条线路都由它拼出
  2. 发版流程：改好源码 → 上传 `s.js` 得到新提交号 → 把源码里的 `SHA` 改成新提交号 → 再上传一次 → 用 `__sess.line()` 打印新的导出行贴回本文档
  3. 固定提交的 URL 内容不可变、无需 purge，人人拿到同一版本
  4. 加载行内置 5 条线路轮询，任何一条线路故障都会自动切下一条

生成 `s.js`（把所有非 ASCII 字符转成 `\uXXXX`）：

```js
const fs = require('fs');
const src = fs.readFileSync('session-tool.js', 'utf8');
const out = src.replace(/[^\x00-\x7F]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
new Function(out); // 语法校验
fs.writeFileSync('s.js', out, 'ascii');
```

---

## 安全红线

- 导入码 **等价于一次性密码**：里面有 cookie / token，只发给需要的人，别发大群、别贴公开渠道
- 用完即弃，不做长期备份；会话失效后导入码自然作废
- **仅测试账号使用**，不搬运真实患者数据在用的生产会话
- 工具代码本身不含任何密钥；`s.js` 公开托管没有泄密面

---

## 技术限制

- `document.cookie` **读不到 httpOnly cookie**（浏览器固有限制，旧工具同样如此）
- 无法跨 host 复用 cookie
- gzip 压缩依赖 `CompressionStream`（Chrome/Edge 80+、Firefox 113+、Safari 16.4+）；老浏览器自动降级为 `S1r`，码会变长
- 页面 CSP 禁止 `eval` 时只能用「整段粘贴」

## 常见报错

| 提示 | 原因 |
| --- | --- |
| `加载失败 HTTP 403` | 走到 GitHub API 那条兜底线路，且当前出口 IP 的 60 次/小时配额已用完 → 前几条线路通常已成功，不会走到这里 |
| `加载失败 HTTP 404` | 提交号写错，或 `s.js` 被删 |
| `net::ERR_CONNECTION_CLOSED` | 某条线路被代理/安全设备断开；加载行会自动换下一条，不需要手工处理 |
| `加载失败：failed to fetch` | 5 条线路都不通 → 改用「整段粘贴」 |
| `这看起来是脚本或网址，不是导入行` | 只粘了 loader 却没有带导入码；导入请粘贴对方发来的**整行** |
| `导入码格式不正确（应以 S1g 开头）` | 粘贴内容不完整或被截断，重新复制整行 |
| `当前浏览器不支持解压，请换 Chrome/Edge` | 导出端用了 gzip，导入端浏览器太老 |
| 警告 host 不一致 | 导出与导入页面域名不同，cookie 写不进去 |
| `EvalError` | 页面 CSP 禁止 `eval`，改用整段粘贴 |
