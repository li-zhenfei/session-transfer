/*!
 * session-tool \u2014\u2014 \u4f1a\u8bdd\u642c\u8fd0\u5de5\u5177\uff08cookie + localStorage + sessionStorage\uff09
 * \u65e0 token\u3001\u65e0\u540e\u7aef\uff1a\u5bfc\u51fa\u7684\u4f1a\u8bdd\u538b\u7f29\u540e\u76f4\u63a5\u4f5c\u4e3a\u4e00\u6bb5\u6587\u672c\u4f20\u9012\u3002
 * \u7528\u6cd5\uff1a\u6574\u6bb5\u590d\u5236\u5230\u6d4f\u89c8\u5668\u63a7\u5236\u53f0\u56de\u8f66\uff0c\u9875\u9762\u4e2d\u592e\u51fa\u73b0\u64cd\u4f5c\u9762\u677f\u3002
 *   \u300c\u5bfc\u51fa\u5f53\u524d\u4f1a\u8bdd\u300d\u2192 \u6587\u672c\u6846\u91cc\u751f\u6210\u5bfc\u5165\u7801\uff0c\u5df2\u5c1d\u8bd5\u590d\u5236\uff0cCtrl+C \u53ef\u624b\u52a8\u590d\u5236
 *   \u7c98\u8d34\u5bf9\u65b9\u7684\u5bfc\u5165\u7801 \u2192 \u300c\u5bfc\u5165\u300d\u2192 \u81ea\u52a8\u5199\u56de\u5e76\u5237\u65b0
 */
(function () {
  'use strict';

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
      throw new Error('\u8fd9\u770b\u8d77\u6765\u662f\u811a\u672c\u6216\u7f51\u5740\uff0c\u4e0d\u662f\u5bfc\u5165\u7801\uff08\u5bfc\u5165\u7801\u5e94\u4ee5 S1g \u5f00\u5934\uff09');
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

  async function exportSession() {
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

  function help() {
    console.log(
      '\u4f1a\u8bdd\u642c\u8fd0\u5de5\u5177 session-tool\uff08\u65e0 token / \u65e0\u540e\u7aef\uff09\n' +
      '  __sess.panel()                      \u91cd\u65b0\u6253\u5f00\u64cd\u4f5c\u9762\u677f\n' +
      '  __sess.export()                     \u5bfc\u51fa\u5f53\u524d\u9875\u9762\u4f1a\u8bdd\uff0c\u8fd4\u56de\u5bfc\u5165\u7801\uff08\u540c\u65f6\u6253\u5370\u5230\u63a7\u5236\u53f0\uff09\n' +
      '  __sess.import(code)                 \u5bfc\u5165\u4f1a\u8bdd\uff08\u9ed8\u8ba4\u6e05\u7a7a\u672c\u5730\uff09\n' +
      '  __sess.import(code, {wipe:false})   \u5bfc\u5165\u4f46\u4e0d\u6e05\u7a7a\u672c\u5730\n'
    );
  }

  /* ---------- \u9875\u9762\u5185\u64cd\u4f5c\u9762\u677f\uff08\u4e0d\u4f9d\u8d56 prompt/confirm\uff0c\u7c98\u8d34\u4e0d\u53d7\u9650\uff09 ---------- */
  var BTN = 'padding:8px 16px;border:1px solid #d0d0d0;background:#fff;border-radius:6px;cursor:pointer;font-size:14px;color:#222;font-family:inherit;';

  function makeEl(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }

  function legacyCopy(el) {
    try {
      el.focus();
      el.select();
      return document.execCommand('copy');
    } catch (e) {
      return false;
    }
  }

  function copyFrom(el, text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(el); }
      );
    }
    return Promise.resolve(legacyCopy(el));
  }

  function openPanel() {
    var old = document.getElementById('__sess_panel');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (!document.body) {
      console.error('\u274c \u5f53\u524d\u9875\u9762\u6ca1\u6709 body\uff0c\u65e0\u6cd5\u663e\u793a\u9762\u677f');
      return;
    }

    var wrap = makeEl('div', 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;');
    wrap.id = '__sess_panel';

    var card = makeEl('div', 'width:min(760px,92vw);max-height:88vh;background:#fff;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.35);padding:18px;box-sizing:border-box;font:14px/1.5 system-ui,-apple-system,"Microsoft YaHei",sans-serif;color:#222;display:flex;flex-direction:column;gap:10px;');

    var title = makeEl('div', 'font-size:16px;font-weight:600;', 'session-tool \u4f1a\u8bdd\u642c\u8fd0');

    var tip = makeEl('div', 'color:#666;white-space:pre-line;',
      '\u8981\u628a\u5f53\u524d\u767b\u5f55\u6001\u7ed9\u522b\u4eba\uff1a\u70b9\u300c\u5bfc\u51fa\u5f53\u524d\u4f1a\u8bdd\u300d\uff0c\u628a\u751f\u6210\u7684\u7801\u53d1\u7ed9\u5bf9\u65b9\u3002\n' +
      '\u62ff\u5230\u522b\u4eba\u7684\u7801\uff1a\u7c98\u8d34\u5230\u4e0b\u9762\u518d\u70b9\u300c\u5bfc\u5165\u300d\u3002');

    var ta = makeEl('textarea', 'width:100%;height:220px;box-sizing:border-box;padding:8px;font:12px/1.45 Consolas,Menlo,monospace;border:1px solid #d0d0d0;border-radius:6px;resize:vertical;background:#fafafa;color:#222;');
    ta.id = '__sess_text';
    ta.placeholder = '\u628a\u5bfc\u5165\u7801\uff08S1g \u5f00\u5934\uff09\u7c98\u8d34\u5230\u8fd9\u91cc';
    ta.spellcheck = false;

    var status = makeEl('div', 'min-height:22px;color:#0a7;white-space:pre-line;word-break:break-all;');

    var row = makeEl('div', 'display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;');
    var btnExport = makeEl('button', 'padding:8px 16px;border:1px solid #1677ff;background:#1677ff;color:#fff;border-radius:6px;cursor:pointer;font-size:14px;font-family:inherit;', '\u5bfc\u51fa\u5f53\u524d\u4f1a\u8bdd');
    var btnImport = makeEl('button', BTN, '\u5bfc\u5165');
    var btnClose = makeEl('button', BTN, '\u5173\u95ed');

    btnExport.onclick = async function () {
      btnExport.disabled = true;
      status.style.color = '#666';
      status.textContent = '\u6b63\u5728\u751f\u6210\u2026';
      try {
        var code = await exportSession();
        ta.value = code;
        ta.focus();
        ta.select();
        var copied = await copyFrom(ta, code);
        var big = code.length > 30000
          ? '\n\u26a0\ufe0f \u7801\u8f83\u5927\uff08\u7ea6 ' + Math.round(code.length / 1024) + 'KB\uff09\uff0c\u5efa\u8bae\u7528\u804a\u5929\u5de5\u5177\u7684\u6587\u4ef6\u53d1\u9001'
          : '';
        status.style.color = '#0a7';
        status.textContent = (copied ? '\u2705 \u5df2\u751f\u6210\u5e76\u590d\u5236\u5230\u526a\u8d34\u677f' : '\u2705 \u5df2\u751f\u6210\uff0c\u8bf7\u5168\u9009\u4e0a\u9762\u7684\u6587\u672c\u6846\u624b\u52a8\u590d\u5236\uff08Ctrl+A / Ctrl+C\uff09') + big;
      } catch (e) {
        status.style.color = '#c00';
        status.textContent = '\u274c ' + e.message;
      }
      btnExport.disabled = false;
    };

    btnImport.onclick = async function () {
      var code = ta.value.trim();
      if (!code) {
        status.style.color = '#c00';
        status.textContent = '\u8bf7\u5148\u628a\u5bfc\u5165\u7801\u7c98\u8d34\u5230\u4e0a\u9762\u7684\u6587\u672c\u6846';
        ta.focus();
        return;
      }
      btnImport.disabled = true;
      status.style.color = '#666';
      status.textContent = '\u6b63\u5728\u5bfc\u5165\u2026';
      try {
        var payload = await importSession(code, {});
        status.style.color = '#0a7';
        status.textContent = '\u2705 \u5bfc\u5165\u5b8c\u6210\uff08\u6765\u6e90 ' + (payload.host || '\u672a\u77e5') + '\uff09\uff0c1 \u79d2\u540e\u81ea\u52a8\u5237\u65b0\uff1b\u70b9\u300c\u7acb\u5373\u5237\u65b0\u300d\u53ef\u9a6c\u4e0a\u5237\u65b0';
        btnImport.textContent = '\u7acb\u5373\u5237\u65b0';
        btnImport.disabled = false;
        btnImport.onclick = function () { location.reload(); };
        setTimeout(function () { location.reload(); }, 1000);
      } catch (e) {
        status.style.color = '#c00';
        status.textContent = '\u274c ' + e.message;
        btnImport.disabled = false;
      }
    };

    btnClose.onclick = function () {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    };

    row.appendChild(btnExport);
    row.appendChild(btnImport);
    row.appendChild(btnClose);
    card.appendChild(title);
    card.appendChild(tip);
    card.appendChild(ta);
    card.appendChild(status);
    card.appendChild(row);
    wrap.appendChild(card);
    document.body.appendChild(wrap);
    ta.focus();
  }

  window.__sess = {
    panel: openPanel,
    export: async function () {
      var code = await exportSession();
      console.log(code);
      return code;
    },
    import: importSession,
    help: help,
  };

  console.log('%csession-tool \u5df2\u5c31\u7eea', 'color:#09f');
  openPanel();
})();
