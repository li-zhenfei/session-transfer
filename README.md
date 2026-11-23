# session-tool —— 会话搬运工具

跨环境搬运登录态（cookie + localStorage + sessionStorage）的调试工具，替代挂在个人域名 `api.1996wz.cn` 上的旧工具（个人源站不稳导致频繁 502，且数据永久留存第三方、无鉴权）。

**用法和旧工具一样：往浏览器控制台粘一段 JS 就行。**

**本版无 token、无后端存储**：导出的会话压缩成一段文本（导入码）由你直接发给对方，工具本身不保存任何会话数据。

---

## 用法

**每人：** 复制下面整行，粘进控制台回车（约 160 字符，不含任何密钥）：

```js
(async()=>{eval(atob((await(await fetch('https://api.github.com/repos/li-zhenfei/session-transfer/contents/s.js')).json()).content))})()
```

然后弹框二选一：

| 你要做什么 | 操作 |
| --- | --- |
| **导出**（把当前登录态给别人） | 弹框直接**回车** → 弹出**导入码**（已尝试复制到剪贴板，Ctrl+C 可手动复制） |
| **导入**（拿到别人的登录态） | 弹框里**粘贴导入码** → 回车 → 自动还原 → 确认后页面自动刷新 |

把导入码发给对方（微信/企业微信/聊天工具均可，是一段 `S1g` 开头的文本）。

> 弹框里按「取消」等同回车（= 导出）。
> 若页面 CSP 禁止 `eval`（控制台报 `EvalError`），改用下面的「整段粘贴」方式。

### 备选：整段粘贴（无需托管）

1. 复制 [session-tool.js](session-tool.js) 全文
2. `F12` → **Console** → 粘贴 → 回车
3. 弹框交互同上

适合：内网访问不到 `api.github.com`，或页面 CSP 限制动态执行。

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
| `__sess.export()` | 导出，返回导入码 |
| `__sess.import(code)` | 导入（默认清空本地 localStorage / sessionStorage） |
| `__sess.import(code, {wipe:false})` | 导入但不清空本地（可能新旧混杂） |
| `__sess.help()` | 命令说明 |

---

## 托管（仅工具 owner，一次性）

- 仓库 `li-zhenfei/session-transfer` **必须是 public**：一行 loader 匿名读取 `s.js`，无需身份认证
- 仓库里只放工具代码（`README.md` + `s.js`），**不含任何密钥，也不存放会话数据**
- 更新工具：把 `session-tool.js` 转成 ASCII 安全版（`s.js`）后覆盖仓库根目录同名文件
  - ASCII 转义的作用：让 loader 的 `atob` + `eval` 直接可执行，不依赖 `TextDecoder`

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
| `导入码格式不正确（应以 S1g 开头）` | 粘贴内容不完整或被截断，重新复制整段 |
| `当前浏览器不支持解压，请换 Chrome/Edge` | 导出端用了 gzip，导入端浏览器太老 |
| 警告 host 不一致 | 导出与导入页面域名不同，cookie 写不进去 |
| `EvalError` | 页面 CSP 禁止 `eval`，改用整段粘贴 |
