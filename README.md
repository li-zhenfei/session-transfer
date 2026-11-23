# session-tool —— 会话搬运工具

跨环境搬运登录态（cookie + localStorage + sessionStorage）的调试工具，替代挂在个人域名 `api.1996wz.cn` 上的旧工具（个人源站不稳导致频繁 502，且数据永久留存第三方、无鉴权）。

**用法和旧工具一样：往浏览器控制台粘一段 JS 就行。**

**本版无 token、无后端存储**：导出的会话压缩成一段文本（导入码）由你直接发给对方，工具本身不保存任何会话数据。

---

## 用法

**导出（把当前登录态给别人）：** 复制下面整行，粘进控制台回车。工具会把「导入行」自动复制到剪贴板，页面顶部绿色小条提示（**不弹窗、不需要点击**），直接发给对方即可。若浏览器仍拦截自动复制，页面中间会出现一个已全选的文本框，按 `Ctrl+C` 即可。

> 这一行**自带整个工具**（内嵌 gzip + base64，约 6.3KB），粘贴后不发起任何网络请求——不依赖 CDN、不受代理/防火墙/内网限制，断网也能用。

```js
(async()=>{var __c=(typeof copy==="function")?copy:null;if(typeof DecompressionStream==="undefined")throw new Error("浏览器太旧，不支持解压，请换 Chrome/Edge");var b="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",s=atob(b),u=new Uint8Array(s.length),i;for(i=0;i<s.length;i++)u[i]=s.charCodeAt(i);var t=await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"))).text();eval(t);__sess.add(__c)})().catch(e=>alert("加载失败："+e.message))
```

> **为什么不用 CDN**：此前导出行从 jsDelivr / GitHub 拉脚本，现场多次遇到 `net::ERR_CONNECTION_CLOSED` 和整条线路超时（代理/安全设备不稳定），5 条线路全挂时直接失败。现在把脚本压进导出行本身，彻底去掉运行时网络依赖；导入行也只内联解码逻辑，不加载任何外部代码。

**导入（拿到别人的登录态）：** 对方发来的是一整行以 `(async()=>{var C=` 开头的代码，**原样粘进控制台回车**即可。工具自动写回 cookie / localStorage / sessionStorage，然后刷新页面。

```
导出方：粘「导出行」→ 自动复制「导入行」→ 发给对方
导入方：粘「导入行」→ 自动写回 → 自动刷新
```

与源工具（run.js）的交互完全一致：导出拿一段代码，对方粘贴执行。区别只是这段代码里直接带着会话数据（无后端存储）。

> 导出行与导入行都不联网，不受 CDN、GitHub 接口限流、代理和安全设备影响。
> 导入行长度随会话大小变化，几 KB 到上百 KB；较大时建议用聊天工具的**文件**发送。

### 备选：整段粘贴（页面禁止 `eval` 时）

> 导出行需要 `eval` 来执行内嵌脚本。若页面 CSP 禁止 `eval`，只能整段粘贴：

1. 复制 [session-tool.js](session-tool.js) 全文
2. `F12` → **Console** → 粘贴 → 回车，然后手动执行 `__sess.add()`

适合：页面 CSP 限制动态执行。

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
| `__sess.help()` | 命令说明 |

---

## 托管与发版（仅工具 owner）

- 仓库 `li-zhenfei/session-transfer` 只用于**存放/分发文档和源码**，工具运行时**不访问它**（导出行自带脚本、导入行自带解码逻辑），因此不需要 CDN、不需要 public 之外的特殊权限，也不存在限流或缓存问题
- 仓库里只放（`README.md` + `s.js`），**不含任何密钥，也不存放会话数据**
- 发版流程：
  1. 改 `session-tool.js`
  2. 生成 ASCII 安全版 `s.js`（见下方代码块）
  3. 用 `s.js` 生成**自包含导出行**：`gzip` → `base64`，套上 `(async()=>{var __c=…eval(t);__sess.add(__c)})()` 外壳（`D:/tmp/build-line.js` 已封装）
  4. 把导出行替换到本文档的代码块（`D:/tmp/update-readme-line.js`），并 `node D:/tmp/check-readme-line.js` 校验：README 行 = 生成行、零网络、`copy` 捕获早于第一个 `await`、内嵌负载解压后与 `s.js` 完全一致
  5. 上传 `s.js` 与 `README.md`
- 导出行约 6.3KB（源 14KB 的 gzip+base64），每次改工具都要同步重新生成

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
- **导出行**自带 gzip 脚本，需要 `DecompressionStream`（Chrome/Edge 80+、Firefox 113+、Safari 16.4+）；太老的浏览器会提示「浏览器太旧」
- gzip 压缩同样依赖 `CompressionStream`；老浏览器导出时自动降级为 `S1r`（不压缩），码会变长
- 页面 CSP 禁止 `eval` 时只能用「整段粘贴」

## 常见报错

| 提示 | 原因 |
| --- | --- |
| `浏览器太旧，不支持解压，请换 Chrome/Edge` | 导出行需要 `DecompressionStream`，当前浏览器太老 |
| `这看起来是脚本或网址，不是导入行` | 只粘了脚本/网址；导入请粘贴对方发来的**整行** |
| `导入码格式不正确（应以 S1g 开头）` | 粘贴内容不完整或被截断，重新复制整行 |
| `当前浏览器不支持解压，请换 Chrome/Edge` | 导出端用了 gzip，导入端浏览器太老 |
| 警告 host 不一致 | 导出与导入页面域名不同，cookie 写不进去 |
| `EvalError` | 页面 CSP 禁止 `eval`，改用整段粘贴 |
