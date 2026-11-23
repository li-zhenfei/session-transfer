/*!
 * session-tool \u2014\u2014 \u4f1a\u8bdd\u642c\u8fd0\u5de5\u5177\uff08cookie + localStorage + sessionStorage\uff09
 * \u65e0 token\u3001\u65e0\u540e\u7aef\uff1a\u5bfc\u51fa\u7684\u4f1a\u8bdd\u538b\u7f29\u540e\u76f4\u63a5\u4f5c\u4e3a\u4e00\u6bb5\u6587\u672c\u4f20\u9012\u3002
 * \u7528\u6cd5\uff1a\u6574\u6bb5\u590d\u5236\u5230\u6d4f\u89c8\u5668\u63a7\u5236\u53f0\u56de\u8f66\u3002
 *   \u5f39\u6846\u76f4\u63a5\u56de\u8f66 = \u5bfc\u51fa\u5f53\u524d\u4f1a\u8bdd\uff0c\u5f97\u5230\u4e00\u6bb5\u5bfc\u5165\u7801
 *   \u5f39\u6846\u7c98\u8d34\u522b\u4eba\u7684\u5bfc\u5165\u7801 = \u5bfc\u5165\u5e76\u81ea\u52a8\u5237\u65b0
 */
(function () {
  'use strict';

  // ---------- \u7f16\u89e3\u7801 ----------
  function utf8ToBin(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return bin;
  }
  function binToUtf8(bin) {
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function bytesToB64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }
  function b64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  // \u683c\u5f0f\uff1aS1g + base64(gzip) \uff1bS1r + base64(\u539f\u6587)\uff08\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u538b\u7f29\u65f6\u964d\u7ea7\uff09
  async function encode(text) {
    if (typeof CompressionStream === 'undefined') return 'S1r' + btoa(utf8ToBin(text));
    const stream = new Blob([new TextEncoder().encode(text)]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return 'S1g' + bytesToB64(new Uint8Array(buf));
  }

  async function decode(code) {
    code = code.trim();
    if (code.indexOf('S1g') === 0) {
      if (typeof DecompressionStream === 'undefined') throw new Error('\u5f53\u524d\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u89e3\u538b\uff0c\u8bf7\u6362 Chrome/Edge');
      const stream = new Blob([b64ToBytes(code.slice(3))]).stream().pipeThrough(new DecompressionStream('gzip'));
      return await new Response(stream).text();
    }
    if (code.indexOf('S1r') === 0) return binToUtf8(atob(code.slice(3)));
    throw new Error('\u5bfc\u5165\u7801\u683c\u5f0f\u4e0d\u6b63\u786e\uff08\u5e94\u4ee5 S1g \u5f00\u5934\uff09');
  }

  // ---------- \u91c7\u96c6 / \u5199\u56de ----------
  function collectStorage(store) {
    const obj = {};
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      obj[k] = store.getItem(k);
    }
    return obj;
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
    const payload = {
      v: 2,
      ts: new Date().toISOString(),
      url: location.href,
      host: location.hostname,
      ua: navigator.userAgent,
      cookie: document.cookie,
      localStorage: collectStorage(localStorage),
      sessionStorage: collectStorage(sessionStorage),
    };
    const code = await encode(JSON.stringify(payload));
    const copied = await copyText(code);
    console.log('%c\u2705 \u5bfc\u51fa\u6210\u529f' + (copied ? '\uff08\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f\uff09' : ''), 'color:green;font-weight:bold');
    if (code.length > 30000) {
      console.warn('\u26a0\ufe0f \u5bfc\u5165\u7801\u7ea6 ' + Math.round(code.length / 1024) + 'KB\uff0c\u8bf7\u7528\u804a\u5929\u5de5\u5177\u53d1\u9001');
    }
    prompt('\u5bfc\u51fa\u6210\u529f\uff01\u5bfc\u5165\u7801\u5982\u4e0b\uff08\u5df2\u5c1d\u8bd5\u590d\u5236\uff0cCtrl+C \u53ef\u624b\u52a8\u590d\u5236\uff09\uff1a', code);
    return code;
  }

  async function importSession(code, opts) {
    opts = opts || {};
    const payload = JSON.parse(await decode(code));
    if (payload.host && payload.host !== location.hostname) {
      console.warn('\u26a0\ufe0f \u5bfc\u51fa\u9875\u9762 host\uff08' + payload.host + '\uff09\u4e0e\u5f53\u524d\u9875\u9762\uff08' + location.hostname + '\uff09\u4e0d\u4e00\u81f4\uff0ccookie \u53ef\u80fd\u5199\u4e0d\u8fdb\u53bb');
    }
    if (opts.wipe !== false) {
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
    console.log('%c\u2705 \u5bfc\u5165\u5b8c\u6210', 'color:green;font-weight:bold');
    return true;
  }

  function help() {
    console.log(
      '\u4f1a\u8bdd\u642c\u8fd0\u5de5\u5177 session-tool\uff08\u65e0 token / \u65e0\u540e\u7aef\uff09\n' +
      '  \uff08\u76f4\u63a5\u7c98\u8d34\u811a\u672c\u5373\u8fdb\u5165\u4ea4\u4e92\uff09\n' +
      '  __sess.export()                     \u5bfc\u51fa\u5f53\u524d\u9875\u9762\u4f1a\u8bdd\uff0c\u8fd4\u56de\u5bfc\u5165\u7801\n' +
      '  __sess.import(code)                 \u5bfc\u5165\u4f1a\u8bdd\uff08\u9ed8\u8ba4\u6e05\u7a7a\u672c\u5730\uff09\n' +
      '  __sess.import(code, {wipe:false})   \u5bfc\u5165\u4f46\u4e0d\u6e05\u7a7a\u672c\u5730\n'
    );
  }

  window.__sess = { export: exportSession, import: importSession, help: help };
  console.log('%csession-tool \u5df2\u5c31\u7eea', 'color:#09f');

  // ---------- \u5355\u4e00\u5165\u53e3\uff1a\u7c98\u5b8c\u81ea\u52a8\u6267\u884c ----------
  (async function flow() {
    try {
      const input = prompt('\u7c98\u8d34\u5bfc\u5165\u7801\uff08\u76f4\u63a5\u56de\u8f66 = \u5bfc\u51fa\u5f53\u524d\u4f1a\u8bdd\uff09');
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
