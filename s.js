/*!
 * session-tool \u2014\u2014 \u4f1a\u8bdd\u642c\u8fd0\u5de5\u5177\uff08cookie + localStorage + sessionStorage\uff09
 * \u4ea4\u4e92\u7167\u642c\u539f\u5de5\u5177\uff1a\u7c98\u8d34\u4e00\u884c \u2192 \u81ea\u52a8\u590d\u5236\u4e00\u884c \u2192 \u5bf9\u65b9\u7c98\u8d34\u90a3\u4e00\u884c\u3002
 * \u65e0 token\u3001\u65e0\u540e\u7aef\uff1a\u4f1a\u8bdd\u538b\u7f29\u540e\u76f4\u63a5\u5185\u5d4c\u5728\u300c\u5bfc\u5165\u884c\u300d\u91cc\u4f20\u9012\u3002
 *
 *   \u5bfc\u51fa\uff1a\u63a7\u5236\u53f0\u7c98\u8d34\u5bfc\u51fa\u884c \u2014\u2014 \u81ea\u52a8\u590d\u5236\u5bfc\u5165\u884c\u5e76\u63d0\u793a
 *   \u5bfc\u5165\uff1a\u63a7\u5236\u53f0\u7c98\u8d34\u5bf9\u65b9\u53d1\u6765\u7684\u5bfc\u5165\u884c \u2014\u2014 \u81ea\u52a8\u5199\u56de\u5e76\u5237\u65b0\u9875\u9762
 */
(function () {
  'use strict';

  // \u811a\u672c\u6258\u7ba1\u5730\u5740\uff1a\u591a\u7ebf\u8def\uff0c\u9010\u4e2a\u5c1d\u8bd5\u3002jsDelivr \u5076\u53d1\u8fde\u63a5\u88ab\u5173\uff08\u5b9e\u6d4b 7ms RST\uff09\uff0c
  // \u5355\u7ebf\u8def\u4f1a\u5bfc\u81f4\u6574\u6b21\u7c98\u8d34\u76f4\u63a5\u5931\u8d25\uff0c\u6240\u4ee5\u6bcf\u4e2a\u5730\u5740\u90fd\u8981\u515c\u5e95\u3002
  // \u987a\u5e8f\u6309\u5b9e\u6d4b\u901f\u5ea6\u6392\uff1bGitHub API \u6709\u9650\u6d41\u3001\u7f16\u7801\u4e5f\u4e0d\u540c\uff0c\u653e\u6700\u540e\u3002
  var SHA = 'ab0fac2c84533ba8afec175c5cceb6dd0c8bf11a';
  var HOSTS = [
    'https://cdn.jsdelivr.net/gh/li-zhenfei/session-transfer@' + SHA + '/s.js',
    'https://gcore.jsdelivr.net/gh/li-zhenfei/session-transfer@' + SHA + '/s.js',
    'https://fastly.jsdelivr.net/gh/li-zhenfei/session-transfer@' + SHA + '/s.js',
    'https://raw.githubusercontent.com/li-zhenfei/session-transfer/' + SHA + '/s.js',
    'https://api.github.com/repos/li-zhenfei/session-transfer/contents/s.js?ref=' + SHA
  ];

  /* ---------- \u7f16\u89e3\u7801 ---------- */
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
    if (/^(\(async|async\s*\(|javascript:)/.test(code) || /^https?:/.test(code)) {
      throw new Error('\u8fd9\u770b\u8d77\u6765\u662f\u811a\u672c\u6216\u7f51\u5740\uff0c\u4e0d\u662f\u5bfc\u5165\u884c');
    }
    throw new Error('\u5bfc\u5165\u7801\u683c\u5f0f\u4e0d\u6b63\u786e\uff08\u5e94\u4ee5 S1g \u5f00\u5934\uff09');
  }

  /* ---------- \u91c7\u96c6 / \u5199\u56de ---------- */
  function collectStorage(store) {
    const obj = {};
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      obj[k] = store.getItem(k);
    }
    return obj;
  }

  function buildPayload() {
    return {
      v: 2,
      ts: new Date().toISOString(),
      url: location.href,
      host: location.hostname,
      ua: navigator.userAgent,
      cookie: document.cookie,
      localStorage: collectStorage(localStorage),
      sessionStorage: collectStorage(sessionStorage),
    };
  }

  async function exportCode() {
    return await encode(JSON.stringify(buildPayload()));
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
    return payload;
  }

  /* ---------- \u5bfc\u5165\u884c\u751f\u6210 / \u526a\u8d34\u677f ---------- */
  // \u751f\u6210\u300c\u62c9\u811a\u672c \u2192 eval\u300d\u7684\u4ee3\u7801\u7247\u6bb5\uff1a\u9010\u6761\u7ebf\u8def\u5c1d\u8bd5\uff0c10 \u79d2\u8d85\u65f6\uff0c\u4efb\u4e00\u6761\u6210\u529f\u5373\u505c\u3002
  // \u751f\u6210\u7684\u811a\u672c\u5fc5\u987b\u662f\u7eaf ASCII\uff0c\u4fbf\u4e8e\u6574\u884c\u7c98\u8d34\u3002
  function loaderBody() {
    return 'var U=' + JSON.stringify(HOSTS) + ',t=null,e0=null;' +
      'for(var i=0;i<U.length;i++){try{' +
        'var c=new AbortController(),k=setTimeout(function(){c.abort()},10000);' +
        'var r=await fetch(U[i],{cache:"no-store",signal:c.signal});clearTimeout(k);' +
        'if(!r.ok)throw new Error("HTTP "+r.status);' +
        'if(U[i].indexOf("api.github.com")>=0){var j=await r.json();t=atob((j.content||"").replace(/\\s/g,""));}' +
        'else t=await r.text();' +
        'if(t&&t.indexOf("__sess.add")>=0)break;t=null;' +
      '}catch(err){e0=err;t=null}}' +
      'if(!t)throw new Error("\u811a\u672c\u52a0\u8f7d\u5931\u8d25\uff1a"+(e0?e0.message:"\u6240\u6709\u7ebf\u8def\u5747\u4e0d\u53ef\u7528"));' +
      'eval(t);';
  }

  function buildImportLine(code) {
    return '(async()=>{' + loaderBody() +
      'await __sess.import(' + JSON.stringify(code) + ');location.reload()' +
      '})().catch(e=>alert("\u5bfc\u5165\u5931\u8d25\uff1a"+e.message))';
  }

  // \u4e0e\u6e90\u65b9\u6848\u4e00\u81f4\uff1a\u4f18\u5148 execCommand + \u9690\u85cf textarea\uff08http \u9875\u9762\u4e5f\u53ef\u7528\uff09
  function copyText(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.width = '2em';
      ta.style.height = '2em';
      ta.style.padding = '0';
      ta.style.border = 'none';
      ta.style.outline = 'none';
      ta.style.boxShadow = 'none';
      ta.style.background = 'transparent';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) return Promise.resolve(true);
    } catch (e) { /* \u7ee7\u7eed\u5c1d\u8bd5 Clipboard API */ }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    return Promise.resolve(false);
  }

  // \u5bfc\u51fa\u7aef\u5206\u53d1\u7528\u7684\u90a3\u4e00\u884c\uff08README \u91cc\u7684\u5c31\u662f\u5b83\uff0c\u6539\u7ebf\u8def/\u63d0\u4ea4\u53f7\u540e\u540c\u6b65\u66f4\u65b0\uff09
  function buildExportLine() {
    return '(async()=>{' + loaderBody() + '__sess.add()' +
      '})().catch(e=>alert("\u52a0\u8f7d\u5931\u8d25\uff1a"+e.message))';
  }

  /* ---------- \u5165\u53e3 ---------- */
  async function add() {
    const code = await exportCode();
    const line = buildImportLine(code);
    const copied = await copyText(line);
    console.log(line);
    var msg = copied
      ? '\u2705 \u5df2\u590d\u5236\uff0c\u76f4\u63a5\u53d1\u7ed9\u5bf9\u65b9\u7c98\u8d34\u6267\u884c\u5373\u53ef'
      : '\u2705 \u5df2\u751f\u6210\uff0c\u8bf7\u4ece\u63a7\u5236\u53f0\u590d\u5236\u4e0b\u9762\u8fd9\u884c\u53d1\u7ed9\u5bf9\u65b9\uff08\u81ea\u52a8\u590d\u5236\u5931\u8d25\uff09';
    if (code.length > 30000) {
      msg += '\n\u26a0\ufe0f \u8f83\u5927\uff08\u7ea6 ' + Math.round(code.length / 1024) + 'KB\uff09\uff0c\u5efa\u8bae\u7528\u804a\u5929\u5de5\u5177\u7684\u6587\u4ef6\u53d1\u9001';
    }
    alert(msg);
    return line;
  }

  async function get(code) {
    const payload = await importSession(code);
    console.log('%c\u2705 \u5199\u5165\u6210\u529f\uff0c\u8bf7\u5237\u65b0\u9875\u9762', 'color:green;font-weight:bold');
    return payload;
  }

  function help() {
    console.log(
      '\u4f1a\u8bdd\u642c\u8fd0\u5de5\u5177 session-tool\uff08\u65e0 token / \u65e0\u540e\u7aef\uff09\n' +
      '  \u5bfc\u51fa\uff1a\u7c98\u8d34\u6587\u6863\u91cc\u7684\u52a0\u8f7d\u884c\uff08\u7ed3\u5c3e\u662f __sess.add()\uff09\n' +
      '  \u5bfc\u5165\uff1a\u7c98\u8d34\u5bf9\u65b9\u53d1\u6765\u7684\u6574\u884c\uff08\u7ed3\u5c3e\u662f location.reload()\uff09\n' +
      '  __sess.add()            \u5bfc\u51fa\u5f53\u524d\u4f1a\u8bdd\uff0c\u590d\u5236\u5bfc\u5165\u884c\n' +
      '  __sess.get(code)        \u4ec5\u5bfc\u5165\uff0c\u4e0d\u5237\u65b0\n' +
      '  __sess.export()         \u4ec5\u751f\u6210\u5bfc\u5165\u7801\n' +
      '  __sess.line()           \u6253\u5370\u5bfc\u51fa\u7aef\u7684\u52a0\u8f7d\u884c\uff08\u591a\u7ebf\u8def\u515c\u5e95\uff09\n'
    );
  }

  window.__sess = { add: add, get: get, export: exportCode, import: importSession, help: help, line: buildExportLine };
  console.log('%csession-tool \u5df2\u5c31\u7eea', 'color:#09f');
})();
