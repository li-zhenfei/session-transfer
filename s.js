/*!
 * session-tool \u2014\u2014 \u4f1a\u8bdd\u642c\u8fd0\u5de5\u5177\uff08\u5bfc\u51fa/\u5bfc\u5165 cookie + localStorage + sessionStorage\uff09
 * \u7528\u6cd5\uff1a\u6574\u6bb5\u590d\u5236\u5230\u6d4f\u89c8\u5668\u63a7\u5236\u53f0\u56de\u8f66\u5373\u53ef\u3002
 *   \u5f39\u6846\u76f4\u63a5\u56de\u8f66 = \u5bfc\u51fa\u5f53\u524d\u4f1a\u8bdd\uff0c\u5f97\u5230 6 \u4f4d\u5bfc\u5165\u7801
 *   \u5f39\u6846\u7c98\u8d34\u522b\u4eba\u7684\u5bfc\u5165\u7801 = \u5bfc\u5165\u5e76\u81ea\u52a8\u5237\u65b0
 * \u6570\u636e\u901a\u9053\uff1aGitHub \u79c1\u6709\u4ed3\u5e93\uff08api.github.com\uff09
 */
(function () {
  'use strict';

  // ==================== \u914d\u7f6e\u5757\uff08\u4ec5\u5de5\u5177 owner \u9700\u8981\u6539\u4e00\u6b21\uff09 ====================
  const CFG = {
    REPO: 'li-zhenfei/session-transfer', // TODO: \u4f60\u7684\u79c1\u6709\u4ed3\u5e93 owner/repo
    TOKEN: '',                          // \u53ef\u7559\u7a7a\uff1a\u7559\u7a7a\u65f6\u9996\u6b21\u4f7f\u7528\u4f1a\u63d0\u793a\u8f93\u5165\u5e76\u7f13\u5b58\u5728\u5f53\u524d\u6807\u7b7e\u9875
    BRANCH: 'main',                     // \u4ed3\u5e93\u9ed8\u8ba4\u5206\u652f\uff08\u8001\u4ed3\u5e93\u53ef\u80fd\u662f master\uff09
    DIR: 'sessions',                    // \u4f1a\u8bdd\u6587\u4ef6\u76ee\u5f55
  };
  const PAT_KEY = '__sess';             // PAT \u5728 sessionStorage \u91cc\u7684\u952e\uff08\u4e0d\u4f1a\u88ab\u5bfc\u51fa/\u6e05\u7a7a\uff09
  // \u4e00\u884c\u7248 loader \u4f1a\u628a\u914d\u7f6e\u585e\u8fdb window.__SESS_CFG\uff0c\u4f18\u5148\u7ea7\u9ad8\u4e8e\u4e0a\u9762\u7684\u9ed8\u8ba4\u503c
  if (typeof window !== 'undefined' && window.__SESS_CFG) Object.assign(CFG, window.__SESS_CFG);
  // ========================================================================

  function getToken() {
    if (CFG.TOKEN && CFG.TOKEN.indexOf('XXXX') === -1) return CFG.TOKEN;
    let t = sessionStorage.getItem(PAT_KEY);
    if (!t) {
      t = prompt('\u9996\u6b21\u4f7f\u7528\uff0c\u8bf7\u8f93\u5165 GitHub PAT\uff08\u4ec5\u5f53\u524d\u6807\u7b7e\u9875\u6709\u6548\uff09');
      if (!t) throw new Error('\u672a\u63d0\u4f9b PAT');
      t = t.trim();
      sessionStorage.setItem(PAT_KEY, t);
    }
    return t;
  }

  // ---------- UTF-8 \u5b89\u5168 base64\uff08\u652f\u6301\u4e2d\u6587\uff0c\u5206\u5757\u907f\u514d\u6808\u6ea2\u51fa\uff09 ----------
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

  // ---------- \u5b58\u50a8\u9002\u914d\u5668\uff08\u6362\u540e\u7aef\u65f6\u6574\u4f53\u66ff\u6362\u672c\u5bf9\u8c61\uff09 ----------
  const shaCache = new Map(); // GitHub \u5220\u9664\u6587\u4ef6\u9700\u8981 sha
  const ADAPTER = {
    req(path, opts) {
      return fetch('https://api.github.com/repos/' + CFG.REPO + '/contents/' + path, Object.assign({
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer ' + getToken(),
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
      if (!res.ok) throw new Error('\u4e0a\u4f20\u5931\u8d25 HTTP ' + res.status + '\uff1a' + (await res.text()).slice(0, 300));
    },
    async get(key) {
      const res = await ADAPTER.req(CFG.DIR + '/' + key + '.json?ref=' + CFG.BRANCH);
      if (!res.ok) throw new Error('\u8bfb\u53d6\u5931\u8d25 HTTP ' + res.status + '\uff08\u5bfc\u5165\u7801\u4e0d\u5b58\u5728\u3001\u5df2\u88ab\u4f7f\u7528\uff0c\u6216\u7f51\u7edc\u4e0d\u901a\uff09');
      const meta = await res.json();
      shaCache.set(key, meta.sha);
      return b64ToUtf8(meta.content);
    },
    async del(key) {
      const sha = shaCache.get(key);
      if (!sha) throw new Error('\u7f3a\u5c11 sha\uff08\u9700\u5148 get \u518d del\uff09');
      const res = await ADAPTER.req(CFG.DIR + '/' + key + '.json', {
        method: 'DELETE',
        body: JSON.stringify({ message: 'burn ' + key, branch: CFG.BRANCH, sha: sha }),
      });
      if (!res.ok) throw new Error('\u5220\u9664\u5931\u8d25 HTTP ' + res.status);
    },
  };

  // ---------- \u5de5\u5177\u51fd\u6570 ----------
  function collectStorage(store) {
    const obj = {};
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k === PAT_KEY) continue; // \u4e0d\u8981\u628a PAT \u5bfc\u51fa\u5230\u4ed3\u5e93
      obj[k] = store.getItem(k);
    }
    return obj;
  }

  function genKey() {
    // 6 \u4f4d\u5c0f\u5199\u5b57\u6bcd\u6570\u5b57\uff0c\u4fbf\u4e8e\u53e3\u8ff0/\u624b\u6253
    return Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 4);
  }

  function checkCfg() {
    if (!CFG.REPO || CFG.REPO.indexOf('your-name') !== -1) {
      throw new Error('\u5de5\u5177\u5c1a\u672a\u914d\u7f6e\uff1a\u8bf7\u8ba9 owner \u5728\u811a\u672c\u9876\u90e8 CFG \u91cc\u586b\u5199 REPO\uff08\u89c1 README\uff09');
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false; // \u5185\u7f51 http \u9875\u9762\u65e0\u526a\u8d34\u677f\u6743\u9650\uff0c\u4ea4\u7ed9\u5f39\u6846\u515c\u5e95
    }
  }

  // ---------- \u5bfc\u51fa / \u5bfc\u5165 ----------
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
      console.warn('\u26a0\ufe0f \u4f1a\u8bdd\u6570\u636e ' + (text.length / 1024).toFixed(0) + 'KB\uff0c\u63a5\u8fd1 GitHub 1MB \u4e0a\u9650\uff0c\u5efa\u8bae\u5148\u6e05\u7406\u65e0\u7528\u7684 localStorage \u952e');
    }
    console.log('\u6b63\u5728\u4e0a\u4f20\u4f1a\u8bdd\u6570\u636e\uff08' + (text.length / 1024).toFixed(1) + 'KB\uff09...');
    await ADAPTER.put(key, text);
    const copied = await copyText(key);
    console.log('%c\u2705 \u5bfc\u51fa\u6210\u529f\uff0c\u5bfc\u5165\u7801\uff1a' + key, 'color:green;font-weight:bold');
    prompt('\u5bfc\u51fa\u6210\u529f\uff01\u5bfc\u5165\u7801\u5982\u4e0b\uff08\u5df2\u5c1d\u8bd5\u590d\u5236\uff0cCtrl+C \u53ef\u624b\u52a8\u590d\u5236\uff09\uff1a', key);
    return key;
  }

  async function importSession(key, opts) {
    checkCfg();
    opts = opts || {};
    const wipe = opts.wipe !== false; // \u9ed8\u8ba4\u6e05\u7a7a\u672c\u5730\uff0c\u907f\u514d\u65b0\u65e7\u4f1a\u8bdd\u6df7\u6742
    const keep = opts.keep === true;  // \u9ed8\u8ba4\u5bfc\u5165\u540e\u5220\u9664\u8fdc\u7aef
    const text = await ADAPTER.get(key);
    const payload = JSON.parse(text);
    if (payload.host && payload.host !== location.hostname) {
      console.warn('\u26a0\ufe0f \u5bfc\u51fa\u9875\u9762 host\uff08' + payload.host + '\uff09\u4e0e\u5f53\u524d\u9875\u9762\uff08' + location.hostname + '\uff09\u4e0d\u4e00\u81f4\uff0ccookie \u53ef\u80fd\u5199\u4e0d\u8fdb\u53bb');
    }
    if (wipe) {
      const pat = sessionStorage.getItem(PAT_KEY); // \u6e05\u7a7a\u65f6\u4fdd\u7559 PAT
      localStorage.clear();
      sessionStorage.clear();
      if (pat) sessionStorage.setItem(PAT_KEY, pat);
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
      try { await ADAPTER.del(key); } catch (e) { console.warn('\u5373\u8bfb\u5373\u711a\u5220\u9664\u5931\u8d25\uff08\u4e0d\u5f71\u54cd\u672c\u6b21\u5bfc\u5165\uff09\uff1a' + e.message); }
    }
    console.log('%c\u2705 \u5bfc\u5165\u5b8c\u6210' + (keep ? '' : '\uff08\u8fdc\u7aef\u6587\u4ef6\u5df2\u5220\u9664\uff09'), 'color:green;font-weight:bold');
    return true;
  }

  function help() {
    console.log(
      '\u4f1a\u8bdd\u642c\u8fd0\u5de5\u5177 session-tool\n' +
      '  \uff08\u76f4\u63a5\u7c98\u8d34\u811a\u672c\u5373\u8fdb\u5165\u4ea4\u4e92\uff09\n' +
      '  __sess.export()                     \u5bfc\u51fa\u5f53\u524d\u9875\u9762\u4f1a\u8bdd\uff0c\u8fd4\u56de\u5bfc\u5165\u7801\n' +
      "  __sess.import('key')                \u5bfc\u5165\u4f1a\u8bdd\uff08\u9ed8\u8ba4\u6e05\u7a7a\u672c\u5730\uff0c\u6210\u529f\u540e\u5220\u9664\u8fdc\u7aef\uff09\n" +
      "  __sess.import('key', {keep:true})   \u5bfc\u5165\u4f46\u4fdd\u7559\u8fdc\u7aef\u6587\u4ef6\n" +
      "  __sess.import('key', {wipe:false})  \u5bfc\u5165\u4f46\u4e0d\u6e05\u7a7a\u672c\u5730\n" +
      '\u6570\u636e\u4ed3\u5e93\uff1a' + CFG.REPO + '\uff08\u5206\u652f ' + CFG.BRANCH + '\uff0c\u76ee\u5f55 ' + CFG.DIR + '/\uff09'
    );
  }

  window.__sess = { export: exportSession, import: importSession, help: help };
  console.log('%csession-tool \u5df2\u5c31\u7eea', 'color:#09f');

  // ---------- \u5355\u4e00\u5165\u53e3\uff1a\u7c98\u5b8c\u81ea\u52a8\u6267\u884c ----------
  (async function flow() {
    try {
      checkCfg();
      const input = prompt('\u5bfc\u5165\u7801\uff08\u76f4\u63a5\u56de\u8f66 = \u5bfc\u51fa\u5f53\u524d\u4f1a\u8bdd\uff09');
      if (input && input.trim()) {
        await importSession(input.trim(), {});
        if (confirm('\u5bfc\u5165\u5b8c\u6210\uff0c\u662f\u5426\u5237\u65b0\u9875\u9762\uff1f')) location.reload();
      } else {
        await exportSession();
      }
    } catch (e) {
      console.error('\u274c ' + e.message);
      help();
    }
  })();
})();
