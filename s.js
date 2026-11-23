/*!
 * session-tool —— 会话搬运工具（导出/导入 cookie + localStorage + sessionStorage）
 * 用法：整段复制到浏览器控制台回车即可。
 *   弹框直接回车 = 导出当前会话，得到 6 位导入码
 *   弹框粘贴别人的导入码 = 导入并自动刷新
 * 数据通道：GitHub 私有仓库（api.github.com）
 */
(function () {
  'use strict';

  // ==================== 配置块（仅工具 owner 需要改一次） ====================
  const CFG = {
    REPO: 'your-name/session-transfer', // TODO: 你的私有仓库 owner/repo
    TOKEN: 'github_pat_XXXXXXXX',       // TODO: fine-grained PAT（仅此仓库 Contents 读写）
    BRANCH: 'main',                     // 仓库默认分支（老仓库可能是 master）
    DIR: 'sessions',                    // 会话文件目录
  };
  // 一行版 loader 会把配置塞进 window.__SESS_CFG，优先级高于上面的默认值
  if (typeof window !== 'undefined' && window.__SESS_CFG) Object.assign(CFG, window.__SESS_CFG);
  // ========================================================================

  // ---------- UTF-8 安全 base64（支持中文，分块避免栈溢出） ----------
  function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }
  function b64ToUtf8(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // ---------- 存储适配器（换后端时整体替换本对象） ----------
  const shaCache = new Map(); // GitHub 删除文件需要 sha
  const ADAPTER = {
    req(path, opts) {
      return fetch('https://api.github.com/repos/' + CFG.REPO + '/contents/' + path, Object.assign({
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer ' + CFG.TOKEN,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }, opts));
    },
    async put(key, text) {
      const res = await ADAPTER.req(CFG.DIR + '/' + key + '.json', {
        method: 'PUT',
        body: JSON.stringify({
          message: 'session ' + key,
          branch: CFG.BRANCH,
          content: utf8ToB64(text),
        }),
      });
      if (!res.ok) throw new Error('上传失败 HTTP ' + res.status + '：' + (await res.text()).slice(0, 300));
    },
    async get(key) {
      const res = await ADAPTER.req(CFG.DIR + '/' + key + '.json?ref=' + CFG.BRANCH);
      if (!res.ok) throw new Error('读取失败 HTTP ' + res.status + '（导入码不存在、已被使用，或网络不通）');
      const meta = await res.json();
      shaCache.set(key, meta.sha);
      return b64ToUtf8(meta.content);
    },
    async del(key) {
      const sha = shaCache.get(key);
      if (!sha) throw new Error('缺少 sha（需先 get 再 del）');
      const res = await ADAPTER.req(CFG.DIR + '/' + key + '.json', {
        method: 'DELETE',
        body: JSON.stringify({ message: 'burn ' + key, branch: CFG.BRANCH, sha: sha }),
      });
      if (!res.ok) throw new Error('删除失败 HTTP ' + res.status);
    },
  };

  // ---------- 工具函数 ----------
  function collectStorage(store) {
    const obj = {};
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      obj[k] = store.getItem(k);
    }
    return obj;
  }

  function genKey() {
    // 6 位小写字母数字，便于口述/手打
    return Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 4);
  }

  function checkCfg() {
    if (!CFG.TOKEN || CFG.TOKEN.indexOf('XXXX') !== -1 || CFG.REPO.indexOf('your-name') !== -1) {
      throw new Error('工具尚未配置：请让 owner 在脚本顶部 CFG 里填写 REPO 和 TOKEN（见 README）');
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false; // 内网 http 页面无剪贴板权限，交给弹框兜底
    }
  }

  // ---------- 导出 / 导入 ----------
  async function exportSession() {
    checkCfg();
    const key = genKey();
    const payload = {
      v: 1,
      ts: new Date().toISOString(),
      url: location.href,
      host: location.hostname,
      ua: navigator.userAgent,
      cookie: document.cookie,
      localStorage: collectStorage(localStorage),
      sessionStorage: collectStorage(sessionStorage),
    };
    const text = JSON.stringify(payload);
    if (text.length > 900 * 1024) {
      console.warn('⚠️ 会话数据 ' + (text.length / 1024).toFixed(0) + 'KB，接近 GitHub 1MB 上限，建议先清理无用的 localStorage 键');
    }
    console.log('正在上传会话数据（' + (text.length / 1024).toFixed(1) + 'KB）...');
    await ADAPTER.put(key, text);
    const copied = await copyText(key);
    console.log('%c✅ 导出成功，导入码：' + key, 'color:green;font-weight:bold');
    prompt('导出成功！导入码如下（已尝试复制，Ctrl+C 可手动复制）：', key);
    return key;
  }

  async function importSession(key, opts) {
    checkCfg();
    opts = opts || {};
    const wipe = opts.wipe !== false; // 默认清空本地，避免新旧会话混杂
    const keep = opts.keep === true;  // 默认导入后删除远端
    const text = await ADAPTER.get(key);
    const payload = JSON.parse(text);
    if (payload.host && payload.host !== location.hostname) {
      console.warn('⚠️ 导出页面 host（' + payload.host + '）与当前页面（' + location.hostname + '）不一致，cookie 可能写不进去');
    }
    if (wipe) {
      localStorage.clear();
      sessionStorage.clear();
    }
    if (payload.localStorage) {
      Object.keys(payload.localStorage).forEach(function (k) { localStorage.setItem(k, payload.localStorage[k]); });
    }
    if (payload.sessionStorage) {
      Object.keys(payload.sessionStorage).forEach(function (k) { sessionStorage.setItem(k, payload.sessionStorage[k]); });
    }
    if (payload.cookie) {
      payload.cookie.split(';').forEach(function (c) {
        c = c.trim();
        if (c) document.cookie = c + '; domain=' + location.hostname + '; path=/';
      });
    }
    if (!keep) {
      try { await ADAPTER.del(key); } catch (e) { console.warn('即读即焚删除失败（不影响本次导入）：' + e.message); }
    }
    console.log('%c✅ 导入完成' + (keep ? '' : '（远端文件已删除）'), 'color:green;font-weight:bold');
    return true;
  }

  function help() {
    console.log(
      '会话搬运工具 session-tool\n' +
      '  （直接粘贴脚本即进入交互）\n' +
      '  __sess.export()                     导出当前页面会话，返回导入码\n' +
      "  __sess.import('key')                导入会话（默认清空本地，成功后删除远端）\n" +
      "  __sess.import('key', {keep:true})   导入但保留远端文件\n" +
      "  __sess.import('key', {wipe:false})  导入但不清空本地\n" +
      '数据仓库：' + CFG.REPO + '（分支 ' + CFG.BRANCH + '，目录 ' + CFG.DIR + '/）'
    );
  }

  window.__sess = { export: exportSession, import: importSession, help: help };
  console.log('%csession-tool 已就绪', 'color:#09f');

  // ---------- 单一入口：粘完自动执行 ----------
  (async function flow() {
    try {
      checkCfg();
      const input = prompt('导入码（直接回车 = 导出当前会话）');
      if (input && input.trim()) {
        await importSession(input.trim(), {});
        if (confirm('导入完成，是否刷新页面？')) location.reload();
      } else {
        await exportSession();
      }
    } catch (e) {
      console.error('❌ ' + e.message);
      help();
    }
  })();
})();
