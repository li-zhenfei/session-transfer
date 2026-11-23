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
  var SHA = 'feb8426d4dcfb94bb25c3a1f3d8841bdaee98665';
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

  // \u62f7\u8d1d\uff1aDevTools \u63a7\u5236\u53f0\u81ea\u5e26 copy()\uff0c\u65e0\u624b\u52bf\u8981\u6c42\u3001\u4e0d\u5f39\u6743\u9650\u3002
  // \u5173\u952e\uff1acopy() \u53ea\u5728\u63a7\u5236\u53f0\u300c\u540c\u6b65\u6267\u884c\u9636\u6bb5\u300d\u5b58\u5728\uff0cawait \u4e4b\u540e\u5c31\u6ca1\u4e86\uff08\u5b9e\u6d4b\uff09\uff0c
  // \u6240\u4ee5\u5fc5\u987b\u7531\u8c03\u7528\u65b9\u5728\u7b2c\u4e00\u4e2a await \u4e4b\u524d\u628a copy \u6293\u6210\u53d8\u91cf\u4f20\u8fdb\u6765\uff08cp\uff09\u3002
  // \u9875\u9762\u73af\u5883\u91cc\u6ca1\u6709 copy() \u65f6\u9000\u56de execCommand + \u9690\u85cf textarea\uff1b
  // \u4e0d\u7528 navigator.clipboard\u2014\u2014\u90e8\u5206\u6d4f\u89c8\u5668\u4f1a\u5f39\u300c\u5141\u8bb8\u8bbf\u95ee\u526a\u8d34\u677f\u300d\u8981\u6c42\u70b9\u4e00\u6b21\u3002
  function copyText(text, cp) {
    try {
      if (typeof cp === 'function') { cp(text); return true; }
    } catch (e) { /* \u7ee7\u7eed */ }
    try {
      if (typeof copy === 'function') { copy(text); return true; }
    } catch (e) { /* \u9875\u9762\u73af\u5883\u6ca1\u6709 copy()\uff0c\u7ee7\u7eed */ }
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
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
      ta.style.zIndex = '-1';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      if (ta.setSelectionRange) ta.setSelectionRange(0, text.length);
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch (e) {
      return false;
    }
  }

  // \u4e0d\u7528 alert\uff08\u8981\u70b9\u4e00\u6b21\u786e\u5b9a\uff09\uff1a\u9875\u9762\u9876\u90e8\u7eff\u8272\u5c0f\u6761\uff0c2.5 \u79d2\u81ea\u52a8\u6d88\u5931
  function toast(msg, ok) {
    try {
      var d = document.getElementById('__sess_toast');
      if (!d) {
        d = document.createElement('div');
        d.id = '__sess_toast';
        document.body.appendChild(d);
      }
      d.textContent = msg;
      d.style.cssText = 'position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:2147483647;' +
        'background:' + (ok ? '#0a7d32' : '#b3261e') + ';color:#fff;padding:10px 16px;border-radius:6px;' +
        'font:14px/1.5 sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:80vw;word-break:break-all';
      d.style.display = 'block';
      clearTimeout(toast._timer);
      toast._timer = setTimeout(function () { d.style.display = 'none'; }, 2500);
    } catch (e) { /* \u9875\u9762\u5f02\u5e38\u4e5f\u4e0d\u5f71\u54cd\u5bfc\u51fa */ }
  }

  // \u81ea\u52a8\u590d\u5236\u5931\u8d25\u65f6\u7684\u515c\u5e95\uff1a\u9875\u9762\u4e0a\u7ed9\u4e00\u4e2a\u5df2\u5168\u9009\u7684\u6587\u672c\u6846\uff0c\u6309 Ctrl+C \u5373\u53ef\uff0c\u65e0\u9700\u9f20\u6807
  function showCopyBox(text) {
    try {
      var box = document.getElementById('__sess_box');
      if (!box) {
        box = document.createElement('div');
        box.id = '__sess_box';
        box.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;' +
          'background:#fff;border:2px solid #09f;border-radius:8px;padding:12px;' +
          'box-shadow:0 8px 32px rgba(0,0,0,.4);width:min(720px,90vw)';
        var tip = document.createElement('div');
        tip.textContent = '\u81ea\u52a8\u590d\u5236\u88ab\u6d4f\u89c8\u5668\u62e6\u622a\uff1a\u5185\u5bb9\u5df2\u5168\u9009\uff0c\u6309 Ctrl+C \u590d\u5236';
        tip.style.cssText = 'font:14px/1.6 sans-serif;color:#333;margin-bottom:8px';
        var ta = document.createElement('textarea');
        ta.id = '__sess_box_text';
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'width:100%;height:160px;font:12px/1.4 monospace;box-sizing:border-box';
        var close = document.createElement('button');
        close.textContent = '\u5173\u95ed';
        close.style.cssText = 'margin-top:8px;padding:4px 12px;cursor:pointer';
        close.onclick = function () { box.style.display = 'none'; };
        box.appendChild(tip);
        box.appendChild(ta);
        box.appendChild(close);
        document.body.appendChild(box);
      }
      var t = document.getElementById('__sess_box_text');
      t.value = text;
      box.style.display = 'block';
      t.focus();
      t.select();
      if (t.setSelectionRange) t.setSelectionRange(0, text.length);
    } catch (e) { /* \u5ffd\u7565 */ }
  }

  // \u5bfc\u51fa\u7aef\u5206\u53d1\u7528\u7684\u90a3\u4e00\u884c\uff08README \u91cc\u7684\u5c31\u662f\u5b83\uff0c\u6539\u7ebf\u8def/\u63d0\u4ea4\u53f7\u540e\u540c\u6b65\u66f4\u65b0\uff09
  // \u5f00\u5934\u7684 __c \u5fc5\u987b\u5728\u4efb\u4f55 await \u4e4b\u524d\u6267\u884c\uff1a\u63a7\u5236\u53f0 copy() \u53ea\u5728\u540c\u6b65\u9636\u6bb5\u5b58\u5728\u3002
  function buildExportLine() {
    return '(async()=>{var __c=(typeof copy==="function")?copy:null;' + loaderBody() + '__sess.add(__c)' +
      '})().catch(e=>alert("\u52a0\u8f7d\u5931\u8d25\uff1a"+e.message))';
  }

  /* ---------- \u5165\u53e3 ---------- */
  async function add(cp) {
    // \u76f4\u63a5\u7c98\u8d34 __sess.add() \u65f6\uff0c\u8fd9\u91cc\u540c\u6b65\u6267\u884c\uff0c\u80fd\u62ff\u5230\u63a7\u5236\u53f0\u7684 copy()\uff1b
    // \u7531\u5bfc\u51fa\u884c\u8c03\u7528\u65f6\uff0ccopy \u65e9\u5df2\u968f await \u6d88\u5931\uff0c\u9760\u5916\u5c42\u4f20\u8fdb\u6765\u7684 cp\u3002
    if (typeof cp !== 'function') {
      try { if (typeof copy === 'function') cp = copy; } catch (e) { /* \u5ffd\u7565 */ }
    }
    const code = await exportCode();
    const line = buildImportLine(code);
    console.log(line);
    if (copyText(line, cp)) {
      var msg = '\u2705 \u5bfc\u5165\u884c\u5df2\u590d\u5236\uff0c\u76f4\u63a5\u53d1\u7ed9\u5bf9\u65b9';
      if (code.length > 30000) msg += '\uff08\u7ea6 ' + Math.round(code.length / 1024) + 'KB\uff0c\u8f83\u5927\uff0c\u5efa\u8bae\u7528\u6587\u4ef6\u53d1\u9001\uff09';
      toast(msg, true);
    } else {
      toast('\u81ea\u52a8\u590d\u5236\u88ab\u62e6\u622a\uff0c\u8bf7\u5728\u4e0b\u65b9\u6587\u672c\u6846\u6309 Ctrl+C', false);
      showCopyBox(line);
    }
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
