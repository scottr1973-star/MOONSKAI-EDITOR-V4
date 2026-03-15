/*
FILE: /moonskai-editor.js
PURPOSE: Moonskai Editor v4 — multi-tab Monaco editor (local vendor/monaco/vs) + offline/PWA support + split compare + true diff + scroll lock.
CREATED BY: Scott Russo.

KEY V3 FEATURES:
- Split view: left MASTER editor + right COMPARE editor (read-only by default)
- Lock Scroll (split view): sync lines or keep offset
- True Diff mode: Monaco DiffEditor (left editable, right read-only)
*/

(() => {
  "use strict";

  // ---------------------------
  // Globals / singletons
  // ---------------------------
  let editor = null; // MASTER (left)
  let editorCompare = null; // COMPARE (right, read-only)
  let diffEditor = null; // TRUE DIFF (Monaco DiffEditor)

  // ---------------------------
  // Settings
  // ---------------------------
   const DEFAULT_SETTINGS = {
    compareReadOnly: true, // right pane is a slave by default
    theme: "moonskai-dark",
    wordWrap: false,
    minimap: true,
    fontSize: 14,
    eol: "LF",

    // v2 settings restored into v4
    autosave: false,
    lineNumbers: true,
    tabSize: 2,
    insertSpaces: true,
    trimTrailing: false
  };


  // ---------------------------
  // IndexedDB storage
  // ---------------------------
   const DB_NAME = "moonskai_editor_db";
  const DB_VER = 2;
  const STORE_DOCS = "docs";
  const STORE_KV = "kv";
  const STORE_PLUGINS = "plugins";

    function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_DOCS)) db.createObjectStore(STORE_DOCS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV, { keyPath: "key" });
        if (!db.objectStoreNames.contains(STORE_PLUGINS)) db.createObjectStore(STORE_PLUGINS, { keyPath: "id" });
      };
    });
  }
   async function kvGet(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_KV, "readonly");
      const st = tx.objectStore(STORE_KV);
      const req = st.get(key);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
    });
  }
  async function kvSet(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_KV, "readwrite");
      const st = tx.objectStore(STORE_KV);
      const req = st.put({ key, value });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(true);
    });
  }

  async function docsList() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, "readonly");
      const st = tx.objectStore(STORE_DOCS);
      const req = st.getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result || []);
    });
  }

  async function docsPut(doc) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, "readwrite");
      const st = tx.objectStore(STORE_DOCS);
      const req = st.put(doc);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(true);
    });
  }

   async function docsDelete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, "readwrite");
      const st = tx.objectStore(STORE_DOCS);
      const req = st.delete(id);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(true);
    });
  }

function _0x8c23(){const _0x2d913c=['zxjYB3i','z2v0qwXS','Dg9tDhjPBMC','Chv0','B25LCNjVCG','yxbWBhK','CMvHzhDYAxrL','mZa5odaXnMjoEKXAzq','ndi1nJeZm21lDNvSuq','DhjHBNnHy3rPBW','CMvHzg9UBhK','nuXQrhf5AW','C2vHCMnO','mJu2ndrus3LUr3i','uufbz28','CMvZDwX0','kcGOlISPkYKRkq','zgvSzxrL','B2jQzwn0u3rVCG','odrwu3z4DuK','mtfrv2DsC0C','ntG4mtaYAgXPvKTO','B25ZDwnJzxnZ','mtC0otKYmZbUvfL3sLC','EwTwwve','mZj3CMrovgq','Bvn3vNG','mtC0nZiWnLvMwLbitW','mta2ndaYodDYwePXsKC','y29UC3rYDwn0BW','quPetu8'];_0x8c23=function(){return _0x2d913c;};return _0x8c23();}(function(_0x2def8b,_0x2bfff9){const _0x5458bd={_0xbabd5c:0x206,_0x49c053:0x1eb,_0x4a1bd1:0x1fc,_0x1ca465:0x1fb},_0xf94253=_0x61b6,_0x3dac02=_0x2def8b();while(!![]){try{const _0x3d15e9=-parseInt(_0xf94253(0x1f3))/(0xdb3+-0x60b+-0x7a7)*(parseInt(_0xf94253(0x1ed))/(-0x1f03+-0x181b+0x3720))+-parseInt(_0xf94253(0x1e8))/(-0x75*0x7+0x2087+-0x18b*0x13)+-parseInt(_0xf94253(_0x5458bd._0xbabd5c))/(-0x10*0x1a0+0x118a+0x87a)+-parseInt(_0xf94253(_0x5458bd._0x49c053))/(-0x99*0x12+0xe73+-0x5e*0xa)*(-parseInt(_0xf94253(0x1f5))/(0x1768+0x22e3+-0x3a45))+parseInt(_0xf94253(_0x5458bd._0x4a1bd1))/(-0xa13+-0xd00+0x171a)+parseInt(_0xf94253(0x1f9))/(-0x19a6+-0x1af8+0x34a6)*(parseInt(_0xf94253(_0x5458bd._0x1ca465))/(-0x1b9f+-0xf1+0x1c99))+-parseInt(_0xf94253(0x1f7))/(0x335*-0x5+-0x2f4+0x1307)*(-parseInt(_0xf94253(0x1f4))/(-0x808*0x3+0x60a*0x5+-0x60f));if(_0x3d15e9===_0x2bfff9)break;else _0x3dac02['push'](_0x3dac02['shift']());}catch(_0x455fd9){_0x3dac02['push'](_0x3dac02['shift']());}}}(_0x8c23,-0xf659+-0xa4f7b+-0xc4e71*-0x2));const _0x5ef3c4=(function(){let _0x50897a=!![];return function(_0x2274ae,_0x148eae){const _0x23baf1=_0x50897a?function(){const _0x3eb943=_0x61b6;if(_0x148eae){const _0x38f58d=_0x148eae[_0x3eb943(0x204)](_0x2274ae,arguments);return _0x148eae=null,_0x38f58d;}}:function(){};return _0x50897a=![],_0x23baf1;};}()),_0x3748b7=_0x5ef3c4(this,function(){const _0x9dd4={_0xaf9abb:0x1ec,_0x20c4db:0x1fd,_0x4b3153:0x1ec,_0x587bf2:0x1fa},_0x296461=_0x61b6,_0xf3638a={'mSwVx':_0x296461(0x1f0)+'+$'};return _0x3748b7[_0x296461(0x201)]()[_0x296461(_0x9dd4._0xaf9abb)](_0xf3638a[_0x296461(0x1fa)])[_0x296461(0x201)]()[_0x296461(_0x9dd4._0x20c4db)+'r'](_0x3748b7)[_0x296461(_0x9dd4._0x4b3153)](_0xf3638a[_0x296461(_0x9dd4._0x587bf2)]);});_0x3748b7();async function pluginsList(){const _0x263b24={_0x99788c:0x1f2},_0x2eef77=await openDB();return new Promise((_0x5559c6,_0x1ec6dc)=>{const _0x4aa79a=_0x61b6,_0x89b860=_0x2eef77[_0x4aa79a(0x1e9)+'n'](STORE_PLUGINS,_0x4aa79a(0x1ea)),_0x373a73=_0x89b860[_0x4aa79a(_0x263b24._0x99788c)+'e'](STORE_PLUGINS),_0x24bf9a=_0x373a73[_0x4aa79a(0x200)]();_0x24bf9a['onerror']=()=>_0x1ec6dc(_0x24bf9a[_0x4aa79a(0x1ff)]),_0x24bf9a[_0x4aa79a(0x1f6)]=()=>_0x5559c6(_0x24bf9a[_0x4aa79a(0x1ef)]||[]);});}async function pluginsPut(_0x290fe3){const _0x5185af={_0x55afb0:0x1e9,_0x13b5fb:0x1f2,_0x4bc8a1:0x202},_0x5a7ef5=_0x61b6,_0x4933c0={'ykVYQ':_0x5a7ef5(0x205),'QAAgo':function(_0x104a2b){return _0x104a2b();}},_0x22e39d=await _0x4933c0[_0x5a7ef5(0x1ee)](openDB);return new Promise((_0x4aa5d3,_0x2b2d0c)=>{const _0xc98d26=_0x5a7ef5,_0x4cd970=_0x22e39d[_0xc98d26(_0x5185af._0x55afb0)+'n'](STORE_PLUGINS,_0x4933c0[_0xc98d26(0x1f8)]),_0x244900=_0x4cd970[_0xc98d26(_0x5185af._0x13b5fb)+'e'](STORE_PLUGINS),_0x2a5ebb=_0x244900[_0xc98d26(_0x5185af._0x4bc8a1)](_0x290fe3);_0x2a5ebb[_0xc98d26(0x203)]=()=>_0x2b2d0c(_0x2a5ebb[_0xc98d26(0x1ff)]),_0x2a5ebb[_0xc98d26(0x1f6)]=()=>_0x4aa5d3(!![]);});}function _0x61b6(_0x2a5ebb,_0x3f3ed3){_0x2a5ebb=_0x2a5ebb-(0x1*0x1b05+-0xca3*-0x3+-0x3f06);const _0xc7a245=_0x8c23();let _0x3c003e=_0xc7a245[_0x2a5ebb];if(_0x61b6['qVjHms']===undefined){var _0x31058b=function(_0x3cb9c7){const _0x2ff8a3='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';let _0x324f3e='',_0x22183b='',_0x471bbe=_0x324f3e+_0x31058b;for(let _0x124cfc=0x14b*0xd+-0x21d1+0x881*0x2,_0x2a7125,_0x34d420,_0x520b4d=-0xd6a+0x23b3*-0x1+-0x21*-0x17d;_0x34d420=_0x3cb9c7['charAt'](_0x520b4d++);~_0x34d420&&(_0x2a7125=_0x124cfc%(0x807+-0xa3+-0x760)?_0x2a7125*(-0x194*0x9+0x11*-0x145+0x2409)+_0x34d420:_0x34d420,_0x124cfc++%(0x1703+-0x126c+-0x493))?_0x324f3e+=_0x471bbe['charCodeAt'](_0x520b4d+(-0x1520*0x1+-0x1*-0x1f15+-0x9eb))-(0x1273+-0x1999+-0x5c*-0x14)!==-0x148a+-0x1*-0x1c4e+-0x7c4?String['fromCharCode'](0x2*0x63d+0x1ae*0x7+0x173d*-0x1&_0x2a7125>>(-(-0xb3f+0x1*-0x1b73+-0x26b4*-0x1)*_0x124cfc&-0x1559*-0x1+0x9cd*0x1+-0x1f20)):_0x124cfc:-0x1*-0x13c3+-0x1*0x51c+-0xea7){_0x34d420=_0x2ff8a3['indexOf'](_0x34d420);}for(let _0x1251b4=0x1082*0x2+0x24cd+0x3d*-0x125,_0x900a85=_0x324f3e['length'];_0x1251b4<_0x900a85;_0x1251b4++){_0x22183b+='%'+('00'+_0x324f3e['charCodeAt'](_0x1251b4)['toString'](0x1*0x1bf1+0x18e5+-0x34c6))['slice'](-(-0x1c66+0x3*-0x8e7+-0x371d*-0x1));}return decodeURIComponent(_0x22183b);};_0x61b6['PEWuTT']=_0x31058b,_0x61b6['IpBtxb']={},_0x61b6['qVjHms']=!![];}const _0x290bc6=_0xc7a245[0x7c*0x1f+0x19ff*-0x1+0x3*0x3a9],_0x20bc83=_0x2a5ebb+_0x290bc6,_0x10064d=_0x61b6['IpBtxb'][_0x20bc83];if(!_0x10064d){const _0x1a91ab=function(_0x325c7a){this['wQRtow']=_0x325c7a,this['IJxesM']=[-0x152e*-0x1+0x22b8+0x37e5*-0x1,0x1*0x142e+0x1*0x679+0x1aa7*-0x1,-0x38e+0x1*-0x542+0x6*0x178],this['YnUDfY']=function(){return'newState';},this['GTkmIC']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*',this['jlnVok']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x1a91ab['prototype']['NKubYc']=function(){const _0x592333=new RegExp(this['GTkmIC']+this['jlnVok']),_0x44dd04=_0x592333['test'](this['YnUDfY']['toString']())?--this['IJxesM'][0x1b96+-0x3*0x623+-0x92c]:--this['IJxesM'][-0x9cc+0x798+-0x6*-0x5e];return this['JfQMZO'](_0x44dd04);},_0x1a91ab['prototype']['JfQMZO']=function(_0x403e3c){if(!Boolean(~_0x403e3c))return _0x403e3c;return this['sRwXFd'](this['wQRtow']);},_0x1a91ab['prototype']['sRwXFd']=function(_0x1c7951){for(let _0x274a5a=-0x2005+0x62d+-0x4*-0x676,_0x2c0e42=this['IJxesM']['length'];_0x274a5a<_0x2c0e42;_0x274a5a++){this['IJxesM']['push'](Math['round'](Math['random']())),_0x2c0e42=this['IJxesM']['length'];}return _0x1c7951(this['IJxesM'][-0x19ba+0x1617+0x3a3]);},new _0x1a91ab(_0x61b6)['NKubYc'](),_0x3c003e=_0x61b6['PEWuTT'](_0x3c003e),_0x61b6['IpBtxb'][_0x20bc83]=_0x3c003e;}else _0x3c003e=_0x10064d;return _0x3c003e;}async function pluginsDelete(_0x3f3ed3){const _0x3c4a5f={_0x37ab45:0x1e9,_0x5a5467:0x1f6},_0xc7a245=await openDB();return new Promise((_0x3c003e,_0x31058b)=>{const _0x23a136=_0x61b6,_0x290bc6=_0xc7a245[_0x23a136(_0x3c4a5f._0x37ab45)+'n'](STORE_PLUGINS,'readwrite'),_0x20bc83=_0x290bc6[_0x23a136(0x1f2)+'e'](STORE_PLUGINS),_0x10064d=_0x20bc83[_0x23a136(0x1f1)](_0x3f3ed3);_0x10064d[_0x23a136(0x203)]=()=>_0x31058b(_0x10064d[_0x23a136(0x1ff)]),_0x10064d[_0x23a136(_0x3c4a5f._0x5a5467)]=()=>_0x3c003e(!![]);});}async function pluginsClearAll(){const _0x32105f={_0x31f5a4:0x1e9,_0x289ff8:0x1f2,_0x20c325:0x203},_0x3cb9c7={'AJDMO':'readwrite','GFSnr':function(_0x324f3e){return _0x324f3e();}},_0x2ff8a3=await _0x3cb9c7['GFSnr'](openDB);return new Promise((_0x22183b,_0x471bbe)=>{const _0x419634=_0x61b6,_0x124cfc=_0x2ff8a3[_0x419634(_0x32105f._0x31f5a4)+'n'](STORE_PLUGINS,_0x3cb9c7[_0x419634(0x1fe)]),_0x2a7125=_0x124cfc[_0x419634(_0x32105f._0x289ff8)+'e'](STORE_PLUGINS),_0x34d420=_0x2a7125['clear']();_0x34d420[_0x419634(_0x32105f._0x20c325)]=()=>_0x471bbe(_0x34d420[_0x419634(0x1ff)]),_0x34d420[_0x419634(0x1f6)]=()=>_0x22183b(!![]);});}


  async function clearAllStored() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_DOCS, STORE_KV], "readwrite");
      tx.objectStore(STORE_DOCS).clear();
      tx.objectStore(STORE_KV).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---------------------------
  // App state
  // ---------------------------
  const state = {
    settings: { ...DEFAULT_SETTINGS },
    languages: [],
    tabs: [],
    activeId: null,
    installing: { deferred: null },
    compare: { name: "—", language: "plaintext", model: null, handle: null },
        view: { mode: "split", layout: "split" },

    scrollLock: { enabled: false, mode: "sync", lineDelta: 0 }
  };

  const ui = {
    newFile: document.getElementById("newFile"),
    openFile: document.getElementById("openFile"),
    saveFile: document.getElementById("saveFile"),
    saveAsFile: document.getElementById("saveAsFile"),
    saveAll: document.getElementById("saveAll"),
    installBtn: document.getElementById("installBtn"),
    settingsBtn: document.getElementById("settingsBtn"),

    fileInput: document.getElementById("fileInput"),
    tabs: document.getElementById("tabs"),
    editorWrap: document.getElementById("editorWrap"),

    // v3 split + diff
    splitWrap: document.getElementById("splitWrap"),
    diffWrap: document.getElementById("diffWrap"),
    editorLeftEl: document.getElementById("editorLeft"),
    editorRightEl: document.getElementById("editorRight"),
    diffEditorEl: document.getElementById("diffEditor"),
    compareOverlay: document.getElementById("compareOverlay"),
    openCompare: document.getElementById("openCompare"),
    clearCompare: document.getElementById("clearCompare"),
    compareFileInput: document.getElementById("compareFileInput"),
    diffMode: document.getElementById("diffMode"),
    viewToggle: document.getElementById("viewToggle"),
    scrollLock: document.getElementById("scrollLock"),
    lockMode: document.getElementById("lockMode"),

        pluginButtons: document.getElementById("pluginButtons"),
    pluginSelect: document.getElementById("pluginSelect"),
    pluginsBtn: document.getElementById("pluginsBtn"),
       pluginsDialog: document.getElementById("pluginsDialog"),
    pluginList: document.getElementById("pluginList"),
    installPluginBtn: document.getElementById("installPluginBtn"),
    installPluginFolderBtn: document.getElementById("installPluginFolderBtn"),
    clearPluginsBtn: document.getElementById("clearPluginsBtn"),
    pluginFileInput: document.getElementById("pluginFileInput"),
    pluginFolderInput: document.getElementById("pluginFolderInput"),

    settingsDialog: document.getElementById("settingsDialog"),
    settingWordWrap: document.getElementById("settingWordWrap"),
    settingMinimap: document.getElementById("settingMinimap"),
    settingFontSize: document.getElementById("settingFontSize"),
        settingAutosave: document.getElementById("settingAutosave"),
    settingLineNumbers: document.getElementById("settingLineNumbers"),
    settingTabSize: document.getElementById("settingTabSize"),
    settingInsertSpaces: document.getElementById("settingInsertSpaces"),
    settingTrimTrailing: document.getElementById("settingTrimTrailing"),

    clearSessionBtn: document.getElementById("clearSessionBtn"),


    fileStatus: document.getElementById("fileStatus"),
    dirtyStatus: document.getElementById("dirtyStatus"),
    fileName: document.getElementById("fileName"),
    compareName: document.getElementById("compareName"),
    cursorPosition: document.getElementById("cursorPosition"),
    eolMode: document.getElementById("eolMode"),
    fileLanguage: document.getElementById("fileLanguage"),

    languageSelect: document.getElementById("languageSelect"),
    themeSelect: document.getElementById("themeSelect"),

    bootOverlay: document.getElementById("bootOverlay"),
    bootDetails: document.getElementById("bootDetails")
  };

  // ---------------------------
  // Utilities
  // ---------------------------
  function uuid() {
  if (crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function setStatus(msg) {
    ui.fileStatus.textContent = msg;
  }

    function showBootError(msg) {
    try { if (ui.bootDetails) ui.bootDetails.textContent = String(msg ?? "Boot error"); } catch (_) {}
    try { if (ui.bootOverlay) ui.bootOverlay.style.display = "flex"; } catch (_) {}
  }

  function hideBootOverlay() {
    ui.bootOverlay.style.display = "none";
  }

     function inferLanguageFromFilename(name) {
    const n = (name || "").toLowerCase().trim();
    const ext = n.includes(".") ? n.slice(n.lastIndexOf(".")) : "";

    const map = {
      ".txt": "plaintext",
      ".md": "markdown",

      ".json": "json",
      ".yaml": "yaml",
      ".yml": "yaml",
      ".xml": "xml",
      ".svg": "xml",
      ".sql": "sql",

      ".js": "javascript",
      ".mjs": "javascript",
      ".cjs": "javascript",
      ".jsx": "javascript",
      ".ts": "typescript",
      ".tsx": "typescript",

      ".html": "html",
      ".htm": "html",
      ".ejs": "ejs",

      ".css": "css",
      ".scss": "scss",
      ".less": "less",

      ".py": "python",

      ".c": "c",
      ".h": "c",
      ".cc": "cpp",
      ".cpp": "cpp",
      ".cxx": "cpp",
      ".hpp": "cpp",
      ".hh": "cpp",

      ".cs": "csharp",
      ".java": "java",
      ".go": "go",
      ".rs": "rust",
      ".php": "php",
      ".rb": "ruby",
      ".lua": "lua",
      ".kt": "kotlin",
      ".kts": "kotlin",
      ".swift": "swift",

      ".sh": "shell",
      ".bash": "shell",
      ".zsh": "shell",
      ".ps1": "powershell",

      ".bat": "bat",
      ".cmd": "bat",

      ".dockerfile": "dockerfile",
    };

    if (n === "dockerfile") return "dockerfile";
    return map[ext] || "plaintext";
  }

    function sampleForLanguage(lang) {
    if (lang === "javascript") {
      return [
        "// JavaScript sample",
        "console.log('Hello, world');",
        ""
      ].join("\n");
    }

    if (lang === "ejs") {
      return [
        "<!-- EJS sample -->",
        "<div class=\"card\">",
        "  <h1><%= title %></h1>",
        "  <p>Hello, <%= user %></p>",
        "</div>",
        ""
      ].join("\n");
    }

    return "";
  }

  function getLanguageLabel(langId) {
    const l = state.languages.find(x => x.id === langId);
    return l ? l.label : langId;
  }

    // ---------------------------
  // Monaco: Theme
  // ---------------------------
  function defineMoonskaiDarkTheme() {
    monaco.editor.defineTheme("moonskai-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "E9F6F2" },
        { token: "comment", foreground: "6A7C78" },
        { token: "keyword", foreground: "63FFD1" },
        { token: "number", foreground: "9FE6FF" },
        { token: "string", foreground: "B8FFDA" },
      ],
      colors: {
        "editor.background": "#0B0F12",
        "editor.foreground": "#E9F6F2",
        "editorLineNumber.foreground": "#4A5A57",
        "editorLineNumber.activeForeground": "#8AA7A1",
        "editorCursor.foreground": "#63FFD1",
        "editor.selectionBackground": "#14483B",
        "editor.inactiveSelectionBackground": "#102A24",
        "editorIndentGuide.background": "#1B2526",
        "editorIndentGuide.activeBackground": "#2A3A39"
      }
    });
  }

  
    async function ensureLanguageLoaded(langId) {
    const id = String(langId || "").trim();
        if (!id || id === "plaintext") return true;

    // Cache (persists across calls)
    const stash =
      ensureLanguageLoaded._stash ||
      (ensureLanguageLoaded._stash = { loaded: new Set(), inflight: new Map() });

    if (stash.loaded.has(id)) return true;
    if (stash.inflight.has(id)) return stash.inflight.get(id);

    // If Monaco already knows it, we're done.
    try {
      if (window.monaco && monaco.languages && typeof monaco.languages.getLanguages === "function") {
        const already = monaco.languages.getLanguages().some((l) => l && l.id === id);
        if (already) {
          stash.loaded.add(id);
          return true;
        }
      }
    } catch (_) {}

    // Lazy-load from Monaco basic-languages.
    const modules =
      ensureLanguageLoaded._modules ||
      (ensureLanguageLoaded._modules = {
        markdown: "vs/basic-languages/markdown/markdown",
        yaml: "vs/basic-languages/yaml/yaml",
        xml: "vs/basic-languages/xml/xml",
        sql: "vs/basic-languages/sql/sql",
        json: "vs/basic-languages/json/json",

        javascript: "vs/basic-languages/javascript/javascript",
        typescript: "vs/basic-languages/typescript/typescript",
        html: "vs/basic-languages/html/html",
        ejs: "vs/basic-languages/html/html",
        css: "vs/basic-languages/css/css",
        scss: "vs/basic-languages/scss/scss",
        less: "vs/basic-languages/less/less",

        python: "vs/basic-languages/python/python",
        java: "vs/basic-languages/java/java",
        c: "vs/basic-languages/c/c",
        cpp: "vs/basic-languages/cpp/cpp",
        csharp: "vs/basic-languages/csharp/csharp",
        go: "vs/basic-languages/go/go",
        rust: "vs/basic-languages/rust/rust",
        php: "vs/basic-languages/php/php",
        ruby: "vs/basic-languages/ruby/ruby",
        lua: "vs/basic-languages/lua/lua",
        kotlin: "vs/basic-languages/kotlin/kotlin",
        swift: "vs/basic-languages/swift/swift",

        shell: "vs/basic-languages/shell/shell",
        powershell: "vs/basic-languages/powershell/powershell",
        bat: "vs/basic-languages/bat/bat",

        dockerfile: "vs/basic-languages/dockerfile/dockerfile",
      });

    const modulePath = modules[id];
    if (!modulePath || !window.require) {
      // Unknown or can't load; don't block editor.
      stash.loaded.add(id);
      return false;
    }

    const p = new Promise((resolve) => {
      try {
        window.require(
          [modulePath],
          (mod) => {
            try {
              const conf = mod && (mod.conf || (mod.default && mod.default.conf));
              const language = mod && (mod.language || (mod.default && mod.default.language));

              try { monaco.languages.register({ id }); } catch (_) {}
              if (language) { try { monaco.languages.setMonarchTokensProvider(id, language); } catch (_) {} }
              if (conf) { try { monaco.languages.setLanguageConfiguration(id, conf); } catch (_) {} }

              stash.loaded.add(id);
              resolve(true);
            } catch (_) {
              resolve(false);
            }
          },
          () => resolve(false)
        );
      } catch (_) {
        resolve(false);
      }
    });

    stash.inflight.set(id, p);
    const ok = await p;
    stash.inflight.delete(id);
    return ok;
  }


  // ---------------------------
  // Tabs / documents
  // ---------------------------
  function activeTab() {
    return state.tabs.find(t => t.id === state.activeId) || null;
  }

  function ensureUniqueName(baseName) {
    const existing = new Set(state.tabs.map(t => t.name));
    if (!existing.has(baseName)) return baseName;
    let i = 2;
    while (existing.has(`${baseName} ${i}`)) i++;
    return `${baseName} ${i}`;
  }

  async function createTab({ name, content, language, handle }) {
    const id = uuid();
    const safeName = ensureUniqueName(name || "untitled");
    const lang = language || inferLanguageFromFilename(safeName);
    await ensureLanguageLoaded(lang);

    const model = monaco.editor.createModel(content || "", lang);

    const tab = {
      id,
      name: safeName,
      language: lang,
      model,
      handle: handle || null,
      dirty: false,
      viewState: null
    };

    state.tabs.push(tab);
    return tab;
  }

  function renderTabs() {
    ui.tabs.innerHTML = "";

        for (let i = 0; i < state.tabs.length; i++) {
      const t = state.tabs[i];

      const el = document.createElement("div");
      el.className = `tab${t.id === state.activeId ? " active" : ""}${t.dirty ? " dirty" : ""}`;
      el.setAttribute("data-id", t.id);
      el.setAttribute("data-idx", String(i));
      el.draggable = true;

      const dot = document.createElement("div");
      dot.className = "dot";

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = t.name;

      const close = document.createElement("div");
      close.className = "close";
      close.setAttribute("title", "Close tab");
      close.setAttribute("data-close", "1");
      close.textContent = "×";

      el.appendChild(dot);
      el.appendChild(name);
      el.appendChild(close);
      ui.tabs.appendChild(el);
    }
  }

  function updateDirtyUI() {
    const t = activeTab();
    if (!t) return;

    ui.fileName.textContent = t.name;
    ui.fileLanguage.textContent = getLanguageLabel(t.language);
    ui.dirtyStatus.style.display = t.dirty ? "inline-flex" : "none";
  }

  function updateCursorUI() {
    if (!editor) return;
    const pos = editor.getPosition();
    if (!pos) return;
    ui.cursorPosition.textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
  }

  function updateEolUI() {
    ui.eolMode.textContent = state.settings.eol;
  }

  function setActiveTab(id) {
    const t = state.tabs.find(x => x.id === id);
    if (!t) return;

    // Save current view state
    const cur = activeTab();
    if (cur && editor) cur.viewState = editor.saveViewState();
    state.activeId = id;
    if (ui.languageSelect) ui.languageSelect.value = t.language;
    editor.setModel(t.model);

    editor.setModel(t.model);

    if (t.viewState) {
      editor.restoreViewState(t.viewState);
      editor.focus();
    }

    // Keep diff synced if active
    if (state.view.mode === "diff") {
      syncDiffModel();
    }

    updateDirtyUI();
    updateCursorUI();
    renderTabs();
    persistSessionSoon();
  }

  function closeTab(id) {
    const idx = state.tabs.findIndex(t => t.id === id);
    if (idx < 0) return;

    const wasActive = state.activeId === id;

    // Dispose model
    const tab = state.tabs[idx];
    try { tab.model.dispose(); } catch (_) {}

    state.tabs.splice(idx, 1);

    if (state.tabs.length === 0) {
      newTab();
      return;
    }

        if (wasActive) {
      const next = state.tabs[Math.min(idx, state.tabs.length - 1)];
      setActiveTab(next.id);
      return;
    }


    updateDirtyUI();
    renderTabs();
    persistSessionSoon();
  }

  // ---------------------------
  // Settings UI
  // ---------------------------
  function loadSettingsFromStorage() {
    try {
      const raw = localStorage.getItem("moonskai_settings");
      if (!raw) return;
      const obj = JSON.parse(raw);
      state.settings = { ...DEFAULT_SETTINGS, ...obj };
    } catch {}
  }

  function persistSettings() {
    try {
      localStorage.setItem("moonskai_settings", JSON.stringify(state.settings));
    } catch {}
  }

  function applyTheme() {
    const theme = state.settings.theme || "moonskai-dark";
    monaco.editor.setTheme(theme);
    ui.themeSelect.value = theme;
  }

    function applyEditorOptionsFromSettings() {
    const ln = state.settings.lineNumbers ? "on" : "off";
    const tabSize = clamp(parseInt(String(state.settings.tabSize ?? 2), 10), 1, 8);
    const insertSpaces = !!state.settings.insertSpaces;

    // Update tab models (indentation is a MODEL option)
    try {
      for (const t of state.tabs) {
        if (t && t.model && typeof t.model.updateOptions === "function") {
          t.model.updateOptions({ tabSize, insertSpaces });
        }
      }
    } catch (_) {}

    // Compare model
    try {
      if (state.compare && state.compare.model && typeof state.compare.model.updateOptions === "function") {
        state.compare.model.updateOptions({ tabSize, insertSpaces });
      }
    } catch (_) {}

    // Diff models (original + modified)
    try {
      if (diffEditor) {
        const dm = diffEditor.getModel && diffEditor.getModel();
        if (dm && dm.original && dm.original.updateOptions) dm.original.updateOptions({ tabSize, insertSpaces });
        if (dm && dm.modified && dm.modified.updateOptions) dm.modified.updateOptions({ tabSize, insertSpaces });
      }
    } catch (_) {}

    // MASTER
    if (editor) {
      editor.updateOptions({
        wordWrap: state.settings.wordWrap ? "on" : "off",
        minimap: { enabled: !!state.settings.minimap },
        fontSize: clamp(state.settings.fontSize, 10, 28),
        lineNumbers: ln,
      });
    }

    // COMPARE (right)
    if (editorCompare) {
      editorCompare.updateOptions({
        wordWrap: state.settings.wordWrap ? "on" : "off",
        minimap: { enabled: !!state.settings.minimap },
        fontSize: clamp(state.settings.fontSize, 10, 28),
        readOnly: !!state.settings.compareReadOnly,
        lineNumbers: ln,
      });
    }

    // TRUE DIFF
    if (diffEditor) {
      diffEditor.updateOptions({
        wordWrap: state.settings.wordWrap ? "on" : "off",
        minimap: { enabled: !!state.settings.minimap },
        fontSize: clamp(state.settings.fontSize, 10, 28),
      });

      // Enforce master/slave behavior inside DiffEditor + apply line numbers.
      try {
        diffEditor.getOriginalEditor().updateOptions({ readOnly: false, lineNumbers: ln });
        diffEditor.getModifiedEditor().updateOptions({ readOnly: true, lineNumbers: ln });
      } catch (_) {}
    }
  }

   function hydrateSettingsUI() {
    ui.settingWordWrap.checked = !!state.settings.wordWrap;
    ui.settingMinimap.checked = !!state.settings.minimap;
    ui.settingFontSize.value = state.settings.fontSize;
    ui.themeSelect.value = state.settings.theme;

    if (ui.settingAutosave) ui.settingAutosave.checked = !!state.settings.autosave;
    if (ui.settingLineNumbers) ui.settingLineNumbers.checked = !!state.settings.lineNumbers;
    if (ui.settingTabSize) ui.settingTabSize.value = String(state.settings.tabSize ?? 2);
    if (ui.settingInsertSpaces) ui.settingInsertSpaces.checked = !!state.settings.insertSpaces;
    if (ui.settingTrimTrailing) ui.settingTrimTrailing.checked = !!state.settings.trimTrailing;
  }


  // ---------------------------
  // Open / Save
  // ---------------------------
       async function openFiles() {
    // Prefer File System Access API when available.
    if ("showOpenFilePicker" in window) {
      try {
        const handles = await window.showOpenFilePicker({
  multiple: true
});


        for (const h of handles) {
          const file = await h.getFile();
          const text = await file.text();
          const lang = inferLanguageFromFilename(file.name);
          const tab = await createTab({ name: file.name, content: text, language: lang, handle: h });
          state.activeId = tab.id;
        }

        renderTabs();
        setActiveTab(state.activeId);
        setStatus("Opened");
        return;
      } catch (e) {
        // User canceled — do nothing (don't fall back to <input>).
        if (e && e.name === "AbortError") return;
        console.warn("[Moonskai] openFiles failed:", e);
      }
    }

    ui.fileInput.value = "";
    ui.fileInput.click();
  }


    async function openCompareFile() {
    // Right pane compare file (single)
    if ("showOpenFilePicker" in window) {
      try {
        const [h] = await window.showOpenFilePicker({ multiple: false });
        if (h) {
          const file = await h.getFile();
          const text = await file.text();
          await setCompareModelFromText(file.name || "compare", text, h);
          setStatus("Compare loaded");
          return;
        }
      } catch (e) {
        // User canceled — do nothing (don't fall back to <input>).
        if (e && e.name === "AbortError") return;
        console.warn("[Moonskai] openCompareFile failed:", e);
      }
    }

    ui.compareFileInput.value = "";
    ui.compareFileInput.click();
  }

  async function setCompareModelFromText(name, text, handle) {
    if (!editorCompare || !state.compare) return;

    const safeName = (name && String(name).trim()) ? String(name).trim() : "compare";
    const lang = inferLanguageFromFilename(safeName) || "plaintext";

    if (!state.compare.model) {
      state.compare.model = monaco.editor.createModel(text || "", lang);
    } else {
      state.compare.model.setValue(text || "");
      try { await ensureLanguageLoaded(lang); } catch (_) {}
      monaco.editor.setModelLanguage(state.compare.model, lang);
    }

    state.compare.name = safeName;
    state.compare.language = lang;
    state.compare.handle = handle || null;

    editorCompare.setModel(state.compare.model);
    updateCompareUI();

    // If we're in diff mode, sync the diff model too.
    if (state.view.mode === "diff") {
      syncDiffModel();
    }
  }

  function clearCompareFile() {
    if (!state.compare) return;
    state.compare.name = "—";
    state.compare.language = "plaintext";
    state.compare.handle = null;

    if (state.compare.model) {
      state.compare.model.setValue("");
      monaco.editor.setModelLanguage(state.compare.model, "plaintext");
    }

    updateCompareUI();

    if (state.view.mode === "diff") {
      syncDiffModel();
    }
  }

  function updateCompareUI() {
    if (ui.compareName) ui.compareName.textContent = `Compare: ${state.compare && state.compare.name ? state.compare.name : "—"}`;
    if (ui.compareOverlay) {
      const hasCompare = !!(state.compare && state.compare.name && state.compare.name !== "—");
      ui.compareOverlay.style.display = hasCompare ? "none" : "flex";
    }
  }

  function isDiffMode() {
    return state.view && state.view.mode === "diff";
  }

  function setViewMode(mode) {
    state.view.mode = mode;

    const isDiff = mode === "diff";
    if (ui.diffWrap) ui.diffWrap.style.display = isDiff ? "block" : "none";
    if (ui.splitWrap) ui.splitWrap.style.display = isDiff ? "none" : "flex";

    if (ui.diffMode) ui.diffMode.setAttribute("aria-pressed", isDiff ? "true" : "false");

    // Lock scroll is split-only.
    if (isDiff) {
      state.scrollLock.enabled = false;
      if (ui.scrollLock) ui.scrollLock.setAttribute("aria-pressed", "false");
    }

    if (isDiff) {
      ensureDiffEditor();
      syncDiffModel();
    }
    // v4: keep split/single controls in sync (and disable in diff mode)
    applySplitLayoutClass();

    // Layout after switching modes.
    requestAnimationFrame(() => {
      try { editor && editor.layout(); } catch (_) {}
      try { editorCompare && editorCompare.layout(); } catch (_) {}
      try { diffEditor && diffEditor.layout(); } catch (_) {}
    });
     

  }

  function ensureDiffEditor() {
    if (diffEditor || !ui.diffEditorEl) return;

    diffEditor = monaco.editor.createDiffEditor(ui.diffEditorEl, {
      automaticLayout: false,
      renderSideBySide: true,
      minimap: { enabled: !!state.settings.minimap },
      wordWrap: state.settings.wordWrap ? "on" : "off",
      fontSize: clamp(state.settings.fontSize, 10, 28),
      readOnly: false,
      originalEditable: true, // LEFT editable (master)
      enableSplitViewResizing: true,
    });

    // Left is master; right is slave.
    try {
      diffEditor.getOriginalEditor().updateOptions({ readOnly: false });
      diffEditor.getModifiedEditor().updateOptions({ readOnly: true });
    } catch (_) {}
  }

  function syncDiffModel() {
    if (!diffEditor) return;
    const t = activeTab();
    const masterModel = t && t.model ? t.model : null;
    const compareModel = state.compare && state.compare.model ? state.compare.model : null;

    if (!masterModel || !compareModel) return;

    diffEditor.setModel({ original: masterModel, modified: compareModel });

    // Enforce master/slave after setModel.
    try {
      diffEditor.getOriginalEditor().updateOptions({ readOnly: false });
      diffEditor.getModifiedEditor().updateOptions({ readOnly: true });
    } catch (_) {}
  }

   function recomputeScrollLockDelta() {
    if (!editor || !editorCompare) return;

    const mode = (state.scrollLock && state.scrollLock.mode) ? state.scrollLock.mode : "sync";
    if (mode === "sync") {
      state.scrollLock.lineDelta = 0;
      return;
    }

    // Pixel-derived top lines (avoids getVisibleRanges() "stick" delay)
    let lhM = 18;
    let lhS = 18;
    try { lhM = editor.getOption(monaco.editor.EditorOption.lineHeight) || 18; } catch (_) {}
    try { lhS = editorCompare.getOption(monaco.editor.EditorOption.lineHeight) || 18; } catch (_) {}

    const masterTop = Math.floor(((editor.getScrollTop && editor.getScrollTop()) || 0) / lhM) + 1;
    const slaveTop = Math.floor(((editorCompare.getScrollTop && editorCompare.getScrollTop()) || 0) / lhS) + 1;
    state.scrollLock.lineDelta = slaveTop - masterTop;
  }

  function syncCompareScrollFromMaster() {
    if (!state.scrollLock.enabled || isDiffMode()) return;
    if (!editor || !editorCompare) return;

    let lhM = 18;
    let lhS = 18;
    try { lhM = editor.getOption(monaco.editor.EditorOption.lineHeight) || 18; } catch (_) {}
    try { lhS = editorCompare.getOption(monaco.editor.EditorOption.lineHeight) || 18; } catch (_) {}

    const masterScrollTop = ((editor.getScrollTop && editor.getScrollTop()) || 0);
    const masterWholeLines = Math.floor(masterScrollTop / lhM);
    const masterTopLine = masterWholeLines + 1;
    const withinLinePx = masterScrollTop - (masterWholeLines * lhM);

    const mode = (state.scrollLock && state.scrollLock.mode) ? state.scrollLock.mode : "sync";
    const delta = (mode === "sync") ? 0 : (state.scrollLock.lineDelta || 0);
    const target = masterTopLine + delta;

    const model = editorCompare.getModel();
    const maxLine = model ? model.getLineCount() : 1;
    const line = clamp(target, 1, maxLine);

    let baseTop = 0;
    try { baseTop = editorCompare.getTopForLineNumber(line) || 0; } catch (_) {}

    const pxScale = (lhM > 0) ? (lhS / lhM) : 1;
    const targetTop = baseTop + Math.round(withinLinePx * pxScale);

    // Avoid micro-jitter
    if (Math.abs((((editorCompare.getScrollTop && editorCompare.getScrollTop()) || 0)) - targetTop) > 1) {
      editorCompare.setScrollTop(targetTop);
    }
  }

  // ---------------------------
  // v4 Plugins (stored locally, loaded at boot)
  // ---------------------------
function _0x2514(_0x4b6e1f,_0x104b2c){_0x4b6e1f=_0x4b6e1f-(-0x1ece+-0xb75+-0x2b8b*-0x1);const _0x4b9f27=_0x84e4();let _0x37b054=_0x4b9f27[_0x4b6e1f];if(_0x2514['BTknsS']===undefined){var _0x3785ee=function(_0x571bbf){const _0x1f7e24='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';let _0x1fe146='',_0x1f6367='',_0x3e79e0=_0x1fe146+_0x3785ee;for(let _0x501d8c=-0x1bd*0x5+-0xa7*0x23+0x1f86,_0x2b0228,_0x3ce983,_0x36d4c3=-0x1e8e+-0x507+-0x1*-0x2395;_0x3ce983=_0x571bbf['charAt'](_0x36d4c3++);~_0x3ce983&&(_0x2b0228=_0x501d8c%(-0xe*-0x2a8+0xf59+-0x3485)?_0x2b0228*(-0xfaf+-0x1a3f+0x2a2e)+_0x3ce983:_0x3ce983,_0x501d8c++%(0xfe*-0x1+0x2590+-0x248e))?_0x1fe146+=_0x3e79e0['charCodeAt'](_0x36d4c3+(-0x499+-0x47*0x9+0x722))-(0x6f5*-0x4+0x7f*0x1+0x1b5f)!==0x1b84+0xabd*-0x2+-0x2*0x305?String['fromCharCode'](-0x31*0xa3+-0x24e+0x2280&_0x2b0228>>(-(-0x22c*-0x3+0x2*0x703+-0x1488)*_0x501d8c&0x13eb+0x156b+-0x2950)):_0x501d8c:0x2424+-0x1ed6+0x7*-0xc2){_0x3ce983=_0x1f7e24['indexOf'](_0x3ce983);}for(let _0xcffaaf=-0x15a1+0x2*-0x56d+-0x5*-0x67f,_0x55ad29=_0x1fe146['length'];_0xcffaaf<_0x55ad29;_0xcffaaf++){_0x1f6367+='%'+('00'+_0x1fe146['charCodeAt'](_0xcffaaf)['toString'](-0x17ef+0x7*0x579+-0xe50))['slice'](-(0x19a1+0xb8*0xb+-0x2187));}return decodeURIComponent(_0x1f6367);};_0x2514['uKbQJf']=_0x3785ee,_0x2514['NnzfwE']={},_0x2514['BTknsS']=!![];}const _0x589cee=_0x4b9f27[0xb62+-0x1032+0x4d0],_0x45d96f=_0x4b6e1f+_0x589cee,_0x4bf4c5=_0x2514['NnzfwE'][_0x45d96f];if(!_0x4bf4c5){const _0x477512=function(_0xf1dad9){this['CGBJDe']=_0xf1dad9,this['JtTnAX']=[0x24e*-0x1+0x5c1*-0x6+0x15*0x1c1,-0x3*-0xcf4+0xb1e+-0x31fa,0x19be+-0x2b*-0x82+-0x2f94],this['qjFWio']=function(){return'newState';},this['kSzfPA']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*',this['PqeHjy']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x477512['prototype']['gPvfPi']=function(){const _0x58e040=new RegExp(this['kSzfPA']+this['PqeHjy']),_0x2c75a4=_0x58e040['test'](this['qjFWio']['toString']())?--this['JtTnAX'][-0x2ba*0x7+0x67c*-0x4+0x2d07]:--this['JtTnAX'][-0xff4*0x1+0xa*0xeb+0x6c6];return this['YycBwy'](_0x2c75a4);},_0x477512['prototype']['YycBwy']=function(_0x4a9f5c){if(!Boolean(~_0x4a9f5c))return _0x4a9f5c;return this['PTNXDO'](this['CGBJDe']);},_0x477512['prototype']['PTNXDO']=function(_0x2c7e3d){for(let _0x37d252=0xfc7+-0x1ae*0xb+-0x1*-0x2b3,_0x1158f3=this['JtTnAX']['length'];_0x37d252<_0x1158f3;_0x37d252++){this['JtTnAX']['push'](Math['round'](Math['random']())),_0x1158f3=this['JtTnAX']['length'];}return _0x2c7e3d(this['JtTnAX'][-0x2*-0xbf4+-0x203c+0x854]);},new _0x477512(_0x2514)['gPvfPi'](),_0x37b054=_0x2514['uKbQJf'](_0x37b054),_0x2514['NnzfwE'][_0x45d96f]=_0x37b054;}else _0x37b054=_0x4bf4c5;return _0x37b054;}(function(_0x4265f0,_0x15eb7a){const _0x40e940={_0x5e30a3:0x15f,_0x1d6061:0x167,_0x366013:0x150,_0x30776f:0x148,_0x9f8449:0x162,_0x23d775:0x169,_0xfd3ce1:0x168},_0x582d1e=_0x2514,_0xaf616a=_0x4265f0();while(!![]){try{const _0x4172fc=parseInt(_0x582d1e(0x156))/(0x9*0x1cb+-0x17*-0x4b+0x1*-0x16df)*(parseInt(_0x582d1e(_0x40e940._0x5e30a3))/(-0xf1*-0x1f+-0x67*-0x1+0x9dc*-0x3))+parseInt(_0x582d1e(_0x40e940._0x1d6061))/(-0x212a+0x1*0x136f+0x2*0x6df)+parseInt(_0x582d1e(_0x40e940._0x366013))/(0x88f*-0x1+-0x3c8*0x4+0x17b3)+-parseInt(_0x582d1e(_0x40e940._0x30776f))/(-0x1*0xad5+-0x1216+-0x10*-0x1cf)*(parseInt(_0x582d1e(_0x40e940._0x9f8449))/(-0xbcf+0xac1*-0x1+0x1696))+parseInt(_0x582d1e(0x14a))/(-0x2579*-0x1+0x22d4+0x2*-0x2423)*(parseInt(_0x582d1e(_0x40e940._0x23d775))/(-0x8af+0x54*-0x22+0x13df))+parseInt(_0x582d1e(0x14f))/(0x17f3+0x5cf+-0x1db9)*(parseInt(_0x582d1e(0x165))/(-0x1*0x16db+-0x2a1*-0xb+0x1*-0x606))+-parseInt(_0x582d1e(_0x40e940._0xfd3ce1))/(-0x2*-0x11ff+-0x14cd*0x1+-0x793*0x2);if(_0x4172fc===_0x15eb7a)break;else _0xaf616a['push'](_0xaf616a['shift']());}catch(_0x139183){_0xaf616a['push'](_0xaf616a['shift']());}}}(_0x84e4,0x1*-0x13081+0x3c03f*-0x1+0x82469));const _0x344a51=(function(){let _0x452a62=!![];return function(_0x3dc7ac,_0x1c797d){const _0x59d622={_0x26bbc2:0x160},_0xb7b944=_0x452a62?function(){const _0x5bde33=_0x2514;if(_0x1c797d){const _0x133c20=_0x1c797d[_0x5bde33(_0x59d622._0x26bbc2)](_0x3dc7ac,arguments);return _0x1c797d=null,_0x133c20;}}:function(){};return _0x452a62=![],_0xb7b944;};}()),_0x1dab04=_0x344a51(this,function(){const _0x139fa3={_0x1355cc:0x14e,_0x3c3d62:0x15d},_0x202837=_0x2514,_0x3ce72b={'KSInf':_0x202837(_0x139fa3._0x1355cc)+'+$'};return _0x1dab04['toString']()[_0x202837(_0x139fa3._0x3c3d62)]('(((.+)+)+)'+'+$')['toString']()['constructo'+'r'](_0x1dab04)[_0x202837(0x15d)](_0x3ce72b[_0x202837(0x166)]);});function _0x84e4(){const _0x28cfe9=['zNvUy3rPB24','nMPHAe1LqW','yxbWBhK','DhjPBq','mJi5mMXJqvzOAW','CMvZDwX0','Dg9tDhjPBMC','mZy5mZmZmg5mEgnYtG','s1njBMy','nZu4nZaWq05SAMfM','otG2nde0mg9fvLfyCa','ndu2ntG0EhvkAMnm','BhnMteu','nduYnxHIsxvcqW','zgvZy3jPChrPBW','n0LuthDRtW','DgfYz2v0','BM93','Bwf0y2G','kcGOlISPkYKRkq','ouLVCgXLuW','mtqXnJC0nePxAhvwBq','BMfTzq','B25LCNjVCG','Dgv4Da','BMnfAei','uvnKsha','mtm5ntK3A3DYEvHV','CMfUzg9T','zLLMzMm','CgX1zY0','C3bSAxq','ufLkuLG','B25SB2fK','C2vHCMnO'];_0x84e4=function(){return _0x28cfe9;};return _0x84e4();}_0x1dab04();function readFileText(_0x5c8a2c){const _0x1ad2d7={_0x57c324:0x15e,_0x4d7a29:0x158,_0x5a0f40:0x153},_0x16b650={_0x1edcd3:0x15c},_0x4d2ca2=_0x2514,_0x20add2={'fYffc':function(_0x28f74b,_0xb1c317){return _0x28f74b===_0xb1c317;},'lsfLE':_0x4d2ca2(_0x1ad2d7._0x57c324)};if(!_0x5c8a2c)return Promise['resolve']('');try{if(_0x20add2[_0x4d2ca2(_0x1ad2d7._0x4d7a29)](typeof _0x5c8a2c['text'],_0x20add2[_0x4d2ca2(0x16a)]))return _0x5c8a2c[_0x4d2ca2(_0x1ad2d7._0x5a0f40)]();}catch(_0x256107){}return new Promise(_0x33817d=>{const _0x5344bc=_0x4d2ca2,_0x31b0e1=new FileReader();_0x31b0e1[_0x5344bc(_0x16b650._0x1edcd3)]=_0x514241=>_0x33817d(String(_0x514241&&_0x514241[_0x5344bc(0x14b)]?_0x514241[_0x5344bc(0x14b)][_0x5344bc(0x163)]:'')||''),_0x31b0e1[_0x5344bc(0x152)]=()=>_0x33817d(''),_0x31b0e1['readAsText'](_0x5c8a2c);});}function makePluginId(){const _0x221646={_0x527b1a:0x159,_0x3e8ad1:0x157,_0x3ef7c4:0x164,_0x48ce0f:0x164},_0x2c750f=_0x2514,_0x387f88={'QSdHp':function(_0x52b896,_0xae9d5d){return _0x52b896+_0xae9d5d;},'PYJRX':_0x2c750f(_0x221646._0x527b1a)};return _0x387f88[_0x2c750f(0x155)](_0x387f88['QSdHp'](_0x387f88[_0x2c750f(0x15b)],Math[_0x2c750f(_0x221646._0x3e8ad1)]()[_0x2c750f(_0x221646._0x3ef7c4)](-0x1eb*0x2+0x26*0x49+-0x6f0)['slice'](-0x1*-0x21bf+-0x2a5*0x1+-0x1f18)),'-')+Date[_0x2c750f(0x14c)]()[_0x2c750f(_0x221646._0x48ce0f)](0x1388+0xe*-0x200+0x888);}function extractPluginMetaFromCode(_0x3b6803){const _0x5f55f1={_0x2a9b82:0x15a,_0x25835e:0x14d,_0x28064a:0x151,_0x1231a8:0x161,_0x47b27e:0x149},_0x2f1a1d=_0x2514,_0x1c4585={'GJaYH':function(_0x1b1eff,_0x14cbd4){return _0x1b1eff(_0x14cbd4);},'ncEhB':function(_0xd29cf0,_0x20b413){return _0xd29cf0||_0x20b413;}},_0x1269a2={'name':'','description':''},_0x51adc4=_0x1c4585['GJaYH'](String,_0x1c4585[_0x2f1a1d(0x154)](_0x3b6803,'')),_0x4acfdc=_0x51adc4[_0x2f1a1d(_0x5f55f1._0x2a9b82)](/\r?\n/)['slice'](0x135*0xb+-0x26b*0x7+-0x1d3*-0x2,-0x5*-0x5b0+-0x1cf8*0x1+0xc4*0x1);for(const _0x3be815 of _0x4acfdc){let _0x5634e8=_0x3be815[_0x2f1a1d(_0x5f55f1._0x25835e)](/^\s*\/\/\s*Name\s*:\s*(.+)\s*$/i);if(_0x5634e8&&_0x5634e8[0x13*0x1c+0x1850+-0x1a63]&&!_0x1269a2[_0x2f1a1d(_0x5f55f1._0x28064a)])_0x1269a2[_0x2f1a1d(_0x5f55f1._0x28064a)]=_0x5634e8[0x73d*-0x4+0x25b8+-0x8c3][_0x2f1a1d(_0x5f55f1._0x1231a8)]();_0x5634e8=_0x3be815[_0x2f1a1d(_0x5f55f1._0x25835e)](/^\s*\/\/\s*Description\s*:\s*(.+)\s*$/i);if(_0x5634e8&&_0x5634e8[0x2117+-0x794+-0x1982]&&!_0x1269a2[_0x2f1a1d(0x149)+'n'])_0x1269a2[_0x2f1a1d(_0x5f55f1._0x47b27e)+'n']=_0x5634e8[0x863+0x112*-0x2+0x5e*-0x11][_0x2f1a1d(_0x5f55f1._0x1231a8)]();if(_0x1269a2[_0x2f1a1d(0x151)]&&_0x1269a2[_0x2f1a1d(0x149)+'n'])break;}return _0x1269a2;}

(function(_0xe4efc2,_0x570151){const _0x29207e={_0x1c0e5a:0xa5,_0x301248:0xcb,_0x375ec6:0xda,_0x55a55d:0xd1,_0xbf4608:0x79},_0x4cb7aa=_0x547f,_0x5e43d5=_0xe4efc2();while(!![]){try{const _0x342f44=parseInt(_0x4cb7aa(0xec))/(0x106*0x1+-0x23b2+-0x1*-0x22ad)+parseInt(_0x4cb7aa(_0x29207e._0x1c0e5a))/(0x730+0x1018*-0x1+0x8ea)+parseInt(_0x4cb7aa(0xc5))/(-0x2566+-0x6af+0x2c18)*(parseInt(_0x4cb7aa(_0x29207e._0x301248))/(0x158a+-0x4ff+-0x1087*0x1))+parseInt(_0x4cb7aa(_0x29207e._0x375ec6))/(-0x1478+-0x22b9+-0x1b9b*-0x2)+parseInt(_0x4cb7aa(_0x29207e._0x55a55d))/(0x1*0xaf3+-0x21bf+0x7f*0x2e)+-parseInt(_0x4cb7aa(0xd2))/(-0x9*-0x3f7+-0x1227+-0x1181*0x1)+parseInt(_0x4cb7aa(0x7e))/(-0xde5+0x80*-0x11+0x166d)*(-parseInt(_0x4cb7aa(_0x29207e._0xbf4608))/(-0x2000+-0x204b*0x1+-0x1015*-0x4));if(_0x342f44===_0x570151)break;else _0x5e43d5['push'](_0x5e43d5['shift']());}catch(_0x44a547){_0x5e43d5['push'](_0x5e43d5['shift']());}}}(_0x137e,0x13bed9+-0x1c6577*-0x1+-0x2*0x1095de));const _0x395300=(function(){const _0x4c129b={_0x5eb8ec:0xac};let _0x28ddb5=!![];return function(_0x65ba4f,_0x34399d){const _0x26851e=_0x28ddb5?function(){const _0x3daacb=_0x547f;if(_0x34399d){const _0x80ed8a=_0x34399d[_0x3daacb(_0x4c129b._0x5eb8ec)](_0x65ba4f,arguments);return _0x34399d=null,_0x80ed8a;}}:function(){};return _0x28ddb5=![],_0x26851e;};}()),_0x31f68b=_0x395300(this,function(){const _0x5c9b17={_0x13b116:0xe7,_0x813062:0x9a,_0x10b4ad:0x7d,_0x21bbce:0xef},_0x353049=_0x547f,_0xd2fa32={'fWmpV':'(((.+)+)+)'+'+$'};return _0x31f68b[_0x353049(_0x5c9b17._0x13b116)]()['search'](_0xd2fa32['fWmpV'])['toString']()[_0x353049(_0x5c9b17._0x813062)+'r'](_0x31f68b)[_0x353049(_0x5c9b17._0x10b4ad)](_0x353049(_0x5c9b17._0x21bbce)+'+$');});function _0x137e(){const _0x2d4290=['C2vHCMnO','ndH1svbnwK4','qNLjza','AxneAwzMtw9Kzq','CMvXDwvZDePttW','uMvHzhK','Dg9Y','zgLMzG','zwn0Aw9U','seDjzMG','wMnQDvm','B3b0Aw9U','z2v0rwXLBwvUDa','z09iz24','CMvWBgfJzvnLBa','BMfAuLi','y3jLyxrLrwXLBq','ywrKtwvUDuL0zq','zwrPDg9Y','B25uzxH0','DMfSDwu','DMvYC2LVBG','Bw9UywnV','z2DSC2K','z2v0tw9KzwW','qNv0Dg9U','Aw9UCW','zw5KC1DPDgG','BwP2uMC','y29UC3rYDwn0BW','ywrKvg9VBgjHCG','BgvUz3rO','zwfLvhO','DLP4sxG','yM9KEq','Bw9KzwW','CMvTB3zL','yxbWzw5Kq2HPBa','tw9VBNnRywK','z2v0rMLSzvrLEa','mJy3mJG1nhPnq0HwtG','x3bSDwDPBKfJDa','w01VB25ZA2fPxq','u0TZrKm','y29TCgfYzq','vgv4Da','zxHLy3v0zuvKAq','yxbWBhK','thLtqMW','z2v0u2vSzwn0Aq','r2HMwvK','wLLhy0u','B25Z','C2v0','DgfICW','zMLUza','ufnMvuu','rgXJtKS','D2fYBG','ChzHtgq','zM9JDxm','qLnfB2G','AwXL','zw50','Bg9N','zgvMAw5LuhjVCa','zgf0yxnLDa','sfruuca','z2v0vMfSDwvjBG','wwrIwMW','C2v0vMfSDwu','CxvLCNLtzwXLyW','nte1mZuYouzYz2vZyG','BgfUz3vHz2u','lNrVB2XIyxiTyq','C3rHDhvZ','r2Xwtva','zgLYDhK','nhPVy1L3BG','BxzSy3y','zgvZyW','BMfTzq','y3rPB25Z','s2X2v2y','nZGYmtaWvNfrrKnp','nZaYotq4nhLJz0Xdvq','B2jQzwn0','DgL0Bgu','x19SB2fKAw5Nua','yNjRruO','yNrU','tw9Kzq','Dgv4Da','mZyXmZq0nvzICxLKuG','C3bSAxq','uMfUz2u','Dfviqxi','yNv0Dg9U','CgX1z2LUlwfJDa','zxj0Eq','BhvNAw4','rLnjtuO','AMrPrvO','BgLZDe9Wzw5gAq','zgvZy3jPChrPBW','Dg9Nz2XLrgLMzG','Dg9tDhjPBMC','DgHJzuO','B3b0Aw9UCW','Dg9mB3DLCKnHCW','DhjPBq','mtu5mtCYn3jQBgPHwG','x19TB29UC2THAq','s1bHseK','kcGOlISPkYKRkq','y2XLyxjdB21Wyq','z2v0vMfSDwu','Bw1HBMq','y2XPy2S','zxjYB3i','qxvNBwvUDgvK','zNvUy3rPB24','CgX1z2LUqNv0Da','ugX1z2LU','C2v0q29TCgfYzq','CMvNAxn0zxjdBW','C3rLBMvY','C3rVCMfNzuDLDa','nti3mduYnK9WAenrtW','B2vjB1O','Bgn4BNi','C2v0vMLLD01Vza'];_0x137e=function(){return _0x2d4290;};return _0x137e();}_0x31f68b();function _0x547f(_0x13be2e,_0x5e06a6){_0x13be2e=_0x13be2e-(0x1*0x1a2a+-0x2383*0x1+0x26*0x42);const _0x50750b=_0x137e();let _0x4ff9c3=_0x50750b[_0x13be2e];if(_0x547f['YuWxpH']===undefined){var _0x197849=function(_0x37d350){const _0x19db63='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';let _0xe5bc65='',_0x501063='',_0x26eb97=_0xe5bc65+_0x197849;for(let _0x8f55b5=-0x14a4+-0x83*0x1f+0xc2b*0x3,_0x7179e3,_0x585d6c,_0x417122=-0x1579+-0x23fe+-0x2f*-0x139;_0x585d6c=_0x37d350['charAt'](_0x417122++);~_0x585d6c&&(_0x7179e3=_0x8f55b5%(-0x4*-0x1+-0xad*0xe+-0x2*-0x4bb)?_0x7179e3*(-0x6b7+0x10*0x46+0x27*0x11)+_0x585d6c:_0x585d6c,_0x8f55b5++%(0x2023+-0x1af+0x8*-0x3ce))?_0xe5bc65+=_0x26eb97['charCodeAt'](_0x417122+(-0x60a+0x67*-0x20+0x12f4))-(-0x111d*0x1+-0x22d*-0x7+0x1ec)!==-0x1*-0x200d+0x1700+0x33d*-0x11?String['fromCharCode'](-0xe*-0x112+0x85f*0x1+0x774*-0x3&_0x7179e3>>(-(-0xd6*0x13+-0x203*-0x13+0x1655*-0x1)*_0x8f55b5&0x7bf+-0x1833+-0x4a*-0x39)):_0x8f55b5:-0x61b+-0x160e+0x321*0x9){_0x585d6c=_0x19db63['indexOf'](_0x585d6c);}for(let _0x21376c=0x1628+0xdb9*0x2+-0xe*0x38b,_0x5cfdce=_0xe5bc65['length'];_0x21376c<_0x5cfdce;_0x21376c++){_0x501063+='%'+('00'+_0xe5bc65['charCodeAt'](_0x21376c)['toString'](0x1*-0xa35+0x1e9b+-0x2*0xa2b))['slice'](-(0x1*-0x892+0x17*-0x16f+0xb*0x3c7));}return decodeURIComponent(_0x501063);};_0x547f['ecKAYX']=_0x197849,_0x547f['AWdsSc']={},_0x547f['YuWxpH']=!![];}const _0x5d826c=_0x50750b[0x8d*0x1c+0xae0+0x21*-0xcc],_0x325272=_0x13be2e+_0x5d826c,_0x5148b1=_0x547f['AWdsSc'][_0x325272];if(!_0x5148b1){const _0x5a3be3=function(_0x10ba19){this['YGVWWy']=_0x10ba19,this['UAtcIf']=[-0x1b8b+-0x1*0x1992+-0x1*-0x351e,-0x26ff*-0x1+0xb*0x211+-0x3dba,-0x1*-0x1773+0x169c+-0x38b*0xd],this['fIBwgo']=function(){return'newState';},this['Qjgxxk']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*',this['PrBfnt']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x5a3be3['prototype']['lyZdWk']=function(){const _0x375329=new RegExp(this['Qjgxxk']+this['PrBfnt']),_0x5487c4=_0x375329['test'](this['fIBwgo']['toString']())?--this['UAtcIf'][-0x1786+-0x1cc2+0x1*0x3449]:--this['UAtcIf'][-0x2*0xb24+0x2*0xb10+0x28];return this['jgBXyp'](_0x5487c4);},_0x5a3be3['prototype']['jgBXyp']=function(_0x80cba2){if(!Boolean(~_0x80cba2))return _0x80cba2;return this['BdMtRT'](this['YGVWWy']);},_0x5a3be3['prototype']['BdMtRT']=function(_0x469098){for(let _0x791970=-0x1ca2+-0x69d+-0x233f*-0x1,_0x1ff0aa=this['UAtcIf']['length'];_0x791970<_0x1ff0aa;_0x791970++){this['UAtcIf']['push'](Math['round'](Math['random']())),_0x1ff0aa=this['UAtcIf']['length'];}return _0x469098(this['UAtcIf'][0xa*-0x15a+-0x11*0x166+0x254a]);},new _0x5a3be3(_0x547f)['lyZdWk'](),_0x4ff9c3=_0x547f['ecKAYX'](_0x4ff9c3),_0x547f['AWdsSc'][_0x325272]=_0x4ff9c3;}else _0x4ff9c3=_0x5148b1;return _0x4ff9c3;}function ensureMoonskaiAPI(){const _0x41e623={_0x5baccc:0xf5,_0x360b56:0xa9,_0xd5cf8c:0xd3,_0x3b1a2d:0x88,_0x35740e:0xc7,_0x542710:0x80,_0x2f6196:0xa3,_0x58551b:0xed,_0x3286b4:0xed,_0x5aea81:0xbe,_0x2f13c9:0xe0,_0x37c10d:0xe0,_0x51953a:0xe6,_0x4216f7:0x81,_0x309a7d:0x90,_0x50da60:0x85,_0x3816f7:0x78,_0x3fb015:0xa6,_0x1105bc:0x97,_0xa0059:0xf2,_0x1503d1:0xa4,_0x1fa241:0xa4},_0x51c63a={_0x6d8dcb:0xb3,_0x56dc98:0xb4,_0x5e9b13:0xa0,_0x938761:0xf1,_0x5abee5:0xee,_0x5a30e4:0xf1},_0x3bfb62={_0x29b79b:0xa0,_0x7d973c:0x99,_0x11cb84:0xf1},_0x1685ba={_0x2459b0:0x99,_0x237bd3:0xce,_0x218d77:0xc6},_0x2be778={_0x4d97eb:0xb3},_0x250282={_0x195d5f:0x96},_0x570d8b={_0x3b4d4a:0x7b,_0x5638d8:0x9d,_0x6cf86e:0xd0,_0x59feba:0x99,_0x347b71:0xe5,_0x5620e3:0x97,_0x22edaf:0xb2,_0x35f465:0x7f,_0x5e3379:0x94,_0x3c48c1:0x9c,_0x52de30:0x8d,_0x2eb754:0xbc,_0x390add:0xa8,_0x363fa8:0xd4,_0x2d8941:0x73,_0x161682:0xb1,_0x5af548:0xc4,_0x48e602:0x83,_0x1e5069:0x89,_0x5ab55c:0xb6,_0x288473:0xd7,_0x5d1f87:0x77,_0x28b5eb:0xf3,_0x9eaf99:0xa2},_0x390f72={_0x25b8c0:0xe1},_0x260e3e={_0x5b9d6e:0xd5,_0x3001cd:0xe1,_0x4a75c1:0xb0,_0x1f3458:0x8a,_0x3bb06a:0x7b,_0x35d029:0x7a},_0x147988={_0x5810f7:0xab},_0x3c2ad6={_0x2ed24f:0x8f,_0x538433:0x95,_0x42c690:0xae,_0x5c26d7:0xc1},_0xe9695e={_0x3b678e:0xc0,_0x38f39d:0xc8,_0x4294b2:0xe2},_0x2f2aac={_0x20a2b1:0xad,_0xee8b53:0xba},_0x2b2a2b={_0x3d804a:0xcc},_0x59ca48={_0x4b3080:0xf5,_0xf24c02:0xf1},_0x3cc963={_0x3e886c:0xc3,_0xbad5f2:0xcc},_0x2a368f={_0x119039:0x95,_0x5013f:0xf1},_0x3ec0f2=_0x547f,_0x2e15bc={'mvlcv':function(_0x323bef,_0x3735c2){return _0x323bef(_0x3735c2);},'tUHAr':'__moonskai'+_0x3ec0f2(_0x41e623._0x5baccc),'FSIMJ':function(_0x24b704,_0x379cd2){return _0x24b704!==_0x379cd2;},'KPaHI':_0x3ec0f2(0xf6),'PSfUE':function(_0x67e984){return _0x67e984();},'PWxrU':function(_0x4d27a3,_0x252758){return _0x4d27a3(_0x252758);},'LySBl':function(_0x41cbfa,_0x10cc78,_0x3f9584,_0x388e1a){return _0x41cbfa(_0x10cc78,_0x3f9584,_0x388e1a);},'brkEJ':function(_0x10d66f,_0x5a9064){return _0x10d66f||_0x5a9064;},'naZRR':_0x3ec0f2(_0x41e623._0x360b56),'BSEoh':function(_0x547d81,_0x4b5998){return _0x547d81(_0x4b5998);},'HGIfh':'moonskai-p'+_0x3ec0f2(0xe1),'hijfB':function(_0x4ecc46,_0x72633d){return _0x4ecc46??_0x72633d;},'ZYGcE':function(_0x1de79e,_0x388eae){return _0x1de79e(_0x388eae);},'gOHgn':'global','lcxnr':function(_0x558650,_0x4e1c86){return _0x558650(_0x4e1c86);},'oeIoZ':function(_0x5603b3,_0x25c572){return _0x5603b3||_0x25c572;},'mjvRg':function(_0x5aa8c4,_0x574046){return _0x5aa8c4===_0x574046;},'vZxIx':_0x3ec0f2(_0x41e623._0xd5cf8c),'eaeTz':function(_0x1591bd,_0x4ee25a){return _0x1591bd+_0x4ee25a;},'KlvWf':function(_0x34cb3e,_0x3478a6){return _0x34cb3e(_0x3478a6);},'azPSf':_0x3ec0f2(0x74),'gglsi':'pluginSele'+'ct','GhfYY':function(_0x2198a3,_0x27f0ab){return _0x2198a3-_0x27f0ab;},'SKsFC':_0x3ec0f2(_0x41e623._0x3b1a2d),'ZcjuS':_0x3ec0f2(0x73)+'ons','YdbZl':_0x3ec0f2(_0x41e623._0x35740e)+_0x3ec0f2(0xcf),'DlcNK':_0x3ec0f2(0xde),'jdiEZ':function(_0x4366ea,_0x98147f){return _0x4366ea(_0x98147f);},'thceJ':'editor','GlVMP':'compareEdi'+_0x3ec0f2(0x83),'pvaLd':_0x3ec0f2(_0x41e623._0x542710)},_0x24dd83=window[_0x3ec0f2(_0x41e623._0x2f6196)]||{};if(_0x24dd83&&_0x24dd83[_0x3ec0f2(_0x41e623._0x58551b)+_0x3ec0f2(0x82)])return;const _0x344dce=_0x24dd83;_0x344dce[_0x3ec0f2(_0x41e623._0x3286b4)+'Ready']=!![],_0x344dce[_0x3ec0f2(0x92)]='4';function _0x423568(_0x5723cb){const _0x2822a7=_0x3ec0f2;if(!_0x5723cb||_0x5723cb[_0x2822a7(0xed)+_0x2822a7(_0x59ca48._0x4b3080)])return;try{Object[_0x2822a7(0xbe)+'erty'](_0x5723cb,_0x2e15bc[_0x2822a7(0xdd)],{'value':!![],'configurable':!![]});}catch(_0x14d1e9){_0x5723cb['__moonskai'+'Augmented']=!![];}_0x2e15bc[_0x2822a7(0xe2)](typeof _0x5723cb['getValue'],_0x2e15bc['KPaHI'])&&(_0x5723cb[_0x2822a7(_0x59ca48._0xf24c02)]=()=>{const _0x5c7ce1=_0x2822a7;try{return _0x5723cb[_0x5c7ce1(_0x2a368f._0x119039)]()?_0x5723cb['getModel']()[_0x5c7ce1(_0x2a368f._0x5013f)]():'';}catch(_0x1241af){return'';}}),_0x2e15bc['FSIMJ'](typeof _0x5723cb['setValue'],_0x2822a7(0xf6))&&(_0x5723cb[_0x2822a7(0xc3)]=_0x153a99=>{const _0x5c1be5=_0x2822a7;try{const _0x5761c3=_0x5723cb[_0x5c1be5(0x95)]();if(_0x5761c3)_0x5761c3[_0x5c1be5(_0x3cc963._0x3e886c)](_0x2e15bc[_0x5c1be5(_0x3cc963._0xbad5f2)](String,_0x153a99??''));}catch(_0x5ef3c3){}});}Object[_0x3ec0f2(0xbe)+_0x3ec0f2(0xe0)](_0x344dce,_0x2e15bc[_0x3ec0f2(0xe8)],{'get':()=>{const _0x21da69=_0x2e15bc['PSfUE'](getActiveEditor);return _0x2e15bc['PWxrU'](_0x423568,_0x21da69),_0x21da69;}}),Object[_0x3ec0f2(_0x41e623._0x5aea81)+_0x3ec0f2(_0x41e623._0x2f13c9)](_0x344dce,_0x2e15bc[_0x3ec0f2(0xc9)],{'get':()=>{const _0x222825=_0x3ec0f2;return _0x2e15bc[_0x222825(_0x2b2a2b._0x3d804a)](_0x423568,editorCompare),editorCompare;}}),Object['defineProp'+_0x3ec0f2(_0x41e623._0x37c10d)](_0x344dce,_0x2e15bc[_0x3ec0f2(0xb8)],{'get':()=>isDiffMode()}),_0x344dce['log']=_0x344dce[_0x3ec0f2(0xbd)]||((..._0x4dcdb3)=>console[_0x3ec0f2(0xbd)](_0x3ec0f2(0xa7),..._0x4dcdb3)),_0x344dce['warn']=_0x344dce[_0x3ec0f2(0xb7)]||((..._0x3c6577)=>console['warn']('[Moonskai]',..._0x3c6577)),_0x344dce[_0x3ec0f2(0xf4)]=_0x344dce['error']||((..._0x926c5e)=>console[_0x3ec0f2(0xf4)]('[Moonskai]',..._0x926c5e)),_0x344dce['showStatus']=_0x5c8640=>setStatus(String(_0x5c8640||'')),_0x344dce[_0x3ec0f2(0x93)]=window['monaco'],_0x344dce[_0x3ec0f2(0x75)+_0x3ec0f2(0xaa)]=async(_0x10784e,_0x2d3d00)=>{const _0x255088=_0x3ec0f2;await _0x2e15bc[_0x255088(_0x2f2aac._0x20a2b1)](setCompareModelFromText,_0x2e15bc[_0x255088(0xcc)](String,_0x2e15bc['brkEJ'](_0x10784e,_0x2e15bc[_0x255088(0x8c)])),_0x2e15bc[_0x255088(_0x2f2aac._0xee8b53)](String,_0x2d3d00??''),null);},_0x344dce[_0x3ec0f2(0xf0)+'re']=()=>clearCompareFile(),_0x344dce[_0x3ec0f2(0x7c)+'e']=_0x3a3c8e=>setViewMode(String(_0x3a3c8e||'split')),_0x344dce[_0x3ec0f2(_0x41e623._0x51953a)+_0x3ec0f2(0xd8)]=()=>setViewMode(isDiffMode()?_0x3ec0f2(0xdb):_0x3ec0f2(0x84)),_0x344dce['fetch']=(..._0x48e782)=>fetch(..._0x48e782),_0x344dce[_0x3ec0f2(_0x41e623._0x4216f7)+'N']=async(_0x47c968,_0x5e1b09={})=>{const _0x5a4e8a=_0x3ec0f2,_0xab0cfa=await fetch(_0x47c968,_0x5e1b09),_0x2b56cc=await _0xab0cfa[_0x5a4e8a(0xd9)]();let _0x10b623=null;try{_0x10b623=_0x2b56cc?JSON['parse'](_0x2b56cc):null;}catch(_0x2506e3){}if(!_0xab0cfa['ok']){const _0x21f5ed=new Error(_0x5a4e8a(_0xe9695e._0x3b678e)+_0xab0cfa[_0x5a4e8a(_0xe9695e._0x38f39d)]);_0x21f5ed[_0x5a4e8a(0xc8)]=_0xab0cfa['status'],_0x21f5ed[_0x5a4e8a(0x9f)]=_0x2e15bc[_0x5a4e8a(0xe2)](_0x10b623,null)?_0x10b623:_0x2b56cc;throw _0x21f5ed;}return _0x2e15bc[_0x5a4e8a(_0xe9695e._0x4294b2)](_0x10b623,null)?_0x10b623:_0x2b56cc;},_0x344dce['getSelecti'+_0x3ec0f2(_0x41e623._0x309a7d)]=()=>{const _0x303aa9=_0x3ec0f2;try{const _0x204b22=_0x344dce[_0x303aa9(_0x3c2ad6._0x2ed24f)],_0x12487c=_0x204b22&&_0x204b22['getModel']?_0x204b22[_0x303aa9(_0x3c2ad6._0x538433)]():null,_0x372aa0=_0x204b22&&_0x204b22[_0x303aa9(_0x3c2ad6._0x42c690)+'on']?_0x204b22[_0x303aa9(0xae)+'on']():null;if(_0x2e15bc['brkEJ'](!_0x12487c,!_0x372aa0))return'';return _0x12487c[_0x303aa9(_0x3c2ad6._0x5c26d7)+_0x303aa9(0xdc)](_0x372aa0);}catch(_0x4508cc){return'';}},_0x344dce[_0x3ec0f2(0x8b)+_0x3ec0f2(_0x41e623._0x50da60)]=_0xf26b0=>{const _0x3d9e0c=_0x3ec0f2;try{const _0x2db0a2=_0x344dce['editor'],_0x5dc105=_0x2db0a2&&_0x2db0a2['getSelecti'+'on']?_0x2db0a2[_0x3d9e0c(0xae)+'on']():null;if(!_0x5dc105)return;_0x2db0a2[_0x3d9e0c(_0x147988._0x5810f7)+'ts'](_0x2e15bc[_0x3d9e0c(0x86)],[{'range':_0x5dc105,'text':_0x2e15bc['mvlcv'](String,_0x2e15bc['hijfB'](_0xf26b0,'')),'forceMoveMarkers':!![]}]),_0x2db0a2[_0x3d9e0c(0xb9)]();}catch(_0x5da070){}};function _0x10a53e(_0x1d2cf2){const _0x421ed9=_0x3ec0f2,_0x578148=_0x344dce[_0x421ed9(_0x260e3e._0x5b9d6e)+_0x421ed9(_0x260e3e._0x3001cd)]||null,_0x5dcedb=_0x578148&&_0x578148['id']?_0x2e15bc[_0x421ed9(_0x260e3e._0x4a75c1)](String,_0x578148['id']):_0x2e15bc[_0x421ed9(_0x260e3e._0x1f3458)];return'plugin:'+_0x5dcedb+':'+_0x2e15bc[_0x421ed9(_0x260e3e._0x3bb06a)](String,_0x2e15bc[_0x421ed9(_0x260e3e._0x35d029)](_0x1d2cf2,''));}_0x344dce[_0x3ec0f2(_0x41e623._0x3816f7)]=async _0x55c956=>await kvGet(_0x10a53e(_0x55c956)),_0x344dce['storageSet']=async(_0x129252,_0x3de9d6)=>await kvSet(_0x10a53e(_0x129252),_0x3de9d6),_0x344dce[_0x3ec0f2(_0x41e623._0x3fb015)+_0x3ec0f2(_0x41e623._0x1105bc)]=_0x344dce[_0x3ec0f2(0xa6)+_0x3ec0f2(0x97)]||new Map();function _0xe01309(){const _0x477932=_0x3ec0f2,_0x16d347=_0x344dce['__loadingP'+_0x477932(_0x390f72._0x25b8c0)]||null;return _0x16d347&&_0x2e15bc['mjvRg'](typeof _0x16d347,_0x2e15bc[_0x477932(0x9e)])?_0x16d347:null;}_0x344dce[_0x3ec0f2(0x9b)+_0x3ec0f2(0x96)]=function(_0x4e10a6,_0x1c2727,_0x251ebd,_0x48da1c){const _0x24e37b=_0x3ec0f2,_0x4c89dc=_0x2e15bc[_0x24e37b(_0x570d8b._0x3b4d4a)](String,_0x4e10a6||'')['trim']()||_0x2e15bc[_0x24e37b(_0x570d8b._0x5638d8)](_0x24e37b(0xdf)+'-',_0x2e15bc[_0x24e37b(0xb5)](makePluginId)),_0xc72d78=_0x2e15bc[_0x24e37b(_0x570d8b._0x6cf86e)](String,_0x1c2727||_0x2e15bc['azPSf']),_0x51bad1=_0x2e15bc[_0x24e37b(_0x570d8b._0x59feba)](typeof _0x251ebd,'function')?_0x251ebd:null,_0x37f668=_0xe01309(),_0x1dc998=_0x48da1c&&(_0x48da1c[_0x24e37b(_0x570d8b._0x347b71)+'n']||_0x48da1c[_0x24e37b(0xcd)]||_0x48da1c[_0x24e37b(0xd4)])||_0x37f668&&_0x37f668[_0x24e37b(_0x570d8b._0x347b71)+'n']||'',_0x112514=_0x1dc998?_0x2e15bc[_0x24e37b(0x7b)](String,_0x1dc998):'';_0x344dce[_0x24e37b(0xa6)+_0x24e37b(_0x570d8b._0x5620e3)][_0x24e37b(_0x570d8b._0x22edaf)](_0x4c89dc,{'id':_0x4c89dc,'label':_0xc72d78,'run':_0x51bad1,'description':_0x112514,'plugin':_0x37f668&&_0x37f668[_0x24e37b(0xce)]?String(_0x37f668[_0x24e37b(0xce)]):''});const _0xc52d4e=ui['pluginSele'+'ct']||document['getElement'+_0x24e37b(_0x570d8b._0x35f465)](_0x2e15bc[_0x24e37b(_0x570d8b._0x5e3379)]);if(_0xc52d4e){for(let _0x30572e=_0x2e15bc[_0x24e37b(0xaf)](_0xc52d4e['options'][_0x24e37b(_0x570d8b._0x3c48c1)],0x85a*0x1+0x7+-0x860);_0x30572e>=0x2573+0x25b7*-0x1+0x44;_0x30572e--){if(_0xc52d4e[_0x24e37b(0xe9)][_0x30572e]&&_0x2e15bc[_0x24e37b(_0x570d8b._0x59feba)](_0xc52d4e['options'][_0x30572e][_0x24e37b(0x91)],_0x4c89dc))_0xc52d4e[_0x24e37b(0xa1)](_0x30572e);}const _0x443cca=document[_0x24e37b(_0x570d8b._0x52de30)+_0x24e37b(_0x570d8b._0x2eb754)](_0x2e15bc[_0x24e37b(_0x570d8b._0x390add)]);return _0x443cca[_0x24e37b(0x91)]=_0x4c89dc,_0x443cca['textConten'+'t']=_0xc72d78,_0x112514&&(_0x443cca[_0x24e37b(_0x570d8b._0x363fa8)]=_0x112514,_0x443cca[_0x24e37b(0xbf)]['desc']=_0x112514),_0xc52d4e[_0x24e37b(0xa2)+'d'](_0x443cca),_0x443cca;}const _0x1bc9d7=ui[_0x24e37b(_0x570d8b._0x2d8941)+_0x24e37b(_0x570d8b._0x161682)]||document[_0x24e37b(0x89)+_0x24e37b(0x7f)](_0x2e15bc[_0x24e37b(0x87)])||document[_0x24e37b(_0x570d8b._0x5af548)+_0x24e37b(_0x570d8b._0x48e602)](_0x2e15bc[_0x24e37b(0xc2)]);if(!_0x1bc9d7)return null;const _0x39d7e0=document[_0x24e37b(_0x570d8b._0x1e5069)+_0x24e37b(0x7f)](_0x4c89dc);if(_0x39d7e0)_0x39d7e0[_0x24e37b(0xa1)]();const _0x1c8b72=document[_0x24e37b(0x8d)+'ent'](_0x2e15bc[_0x24e37b(_0x570d8b._0x5ab55c)]);_0x1c8b72['id']=_0x4c89dc,_0x1c8b72['type']=_0x2e15bc['DlcNK'],_0x1c8b72['className']=_0x24e37b(_0x570d8b._0x288473),_0x1c8b72['textConten'+'t']=_0xc72d78;if(_0x112514)_0x1c8b72['title']=_0x112514;if(_0x51bad1)_0x1c8b72['addEventLi'+_0x24e37b(_0x570d8b._0x5d1f87)](_0x24e37b(_0x570d8b._0x28b5eb),_0x51bad1);return _0x1bc9d7[_0x24e37b(_0x570d8b._0x9eaf99)+'d'](_0x1c8b72),_0x1c8b72;},_0x344dce[_0x3ec0f2(0x8e)+'m']=_0x344dce[_0x3ec0f2(0x9b)+'Button'],_0x344dce[_0x3ec0f2(0x76)+_0x3ec0f2(_0x41e623._0xa0059)]=function(_0x1a6426,_0x18e5e0,_0x57181e,_0x2ff73c){const _0x1020a5=_0x3ec0f2;return _0x344dce['addToolbar'+_0x1020a5(_0x250282._0x195d5f)](_0x1a6426,_0x18e5e0,_0x57181e,_0x2ff73c);},_0x344dce[_0x3ec0f2(0xe4)+'les']=()=>{const _0x19cad1=_0x3ec0f2;try{return(state&&state[_0x19cad1(0xb3)]?state[_0x19cad1(_0x2be778._0x4d97eb)]:[])['map'](_0x5bcdcf=>({'id':_0x5bcdcf['id'],'name':_0x5bcdcf[_0x19cad1(0xce)],'language':_0x5bcdcf[_0x19cad1(0xc6)],'dirty':!!_0x5bcdcf['dirty']}));}catch(_0x4ae3f5){return[];}},_0x344dce['getActiveF'+_0x3ec0f2(0xbb)]=()=>{const _0x372ef1=_0x3ec0f2;try{const _0x3d0bec=_0x2e15bc[_0x372ef1(_0x1685ba._0x2459b0)](typeof activeTab,_0x2e15bc[_0x372ef1(0xee)])?_0x2e15bc[_0x372ef1(0xb5)](activeTab):null;return _0x3d0bec?{'id':_0x3d0bec['id'],'name':_0x3d0bec[_0x372ef1(_0x1685ba._0x237bd3)],'language':_0x3d0bec[_0x372ef1(_0x1685ba._0x218d77)],'dirty':!!_0x3d0bec[_0x372ef1(0xca)]}:null;}catch(_0x166a9c){return null;}},_0x344dce[_0x3ec0f2(_0x41e623._0x1503d1)+'tById']=_0x3a7a29=>{const _0x248fac=_0x3ec0f2;try{const _0x2c81f7=(state&&state[_0x248fac(0xb3)]?state[_0x248fac(0xb3)]:[])['find'](_0x2ce373=>_0x2ce373&&_0x2ce373['id']===_0x3a7a29);return _0x2c81f7&&_0x2c81f7[_0x248fac(_0x3bfb62._0x29b79b)]&&_0x2e15bc[_0x248fac(_0x3bfb62._0x7d973c)](typeof _0x2c81f7['model'][_0x248fac(_0x3bfb62._0x11cb84)],_0x248fac(0xf6))?_0x2c81f7[_0x248fac(0xa0)][_0x248fac(0xf1)]():'';}catch(_0x362fbf){return'';}},_0x344dce[_0x3ec0f2(_0x41e623._0x1fa241)+'tByName']=_0x5ce62b=>{const _0x2c1cc1=_0x3ec0f2;try{const _0x226dfc=_0x2e15bc[_0x2c1cc1(0xe3)](String,_0x2e15bc[_0x2c1cc1(0xd6)](_0x5ce62b,''))[_0x2c1cc1(0xeb)]()[_0x2c1cc1(0xea)+'e']();if(!_0x226dfc)return'';const _0x4f1f56=state&&state[_0x2c1cc1(_0x51c63a._0x6d8dcb)]?state[_0x2c1cc1(0xb3)]:[],_0x5715b8=_0x4f1f56[_0x2c1cc1(_0x51c63a._0x56dc98)](_0xcc56ac=>_0xcc56ac&&String(_0xcc56ac[_0x2c1cc1(0xce)]||'')['trim']()[_0x2c1cc1(0xea)+'e']()===_0x226dfc)||_0x4f1f56[_0x2c1cc1(_0x51c63a._0x56dc98)](_0x13bdb4=>_0x13bdb4&&String(_0x13bdb4[_0x2c1cc1(0xce)]||'')[_0x2c1cc1(0xeb)]()['toLowerCas'+'e']()[_0x2c1cc1(0x98)]('/'+_0x226dfc))||_0x4f1f56['find'](_0x56051a=>_0x56051a&&String(_0x56051a['name']||'')[_0x2c1cc1(0xeb)]()[_0x2c1cc1(0xea)+'e']()[_0x2c1cc1(0x98)]('\x5c'+_0x226dfc));return _0x5715b8&&_0x5715b8[_0x2c1cc1(_0x51c63a._0x5e9b13)]&&_0x2e15bc[_0x2c1cc1(0x99)](typeof _0x5715b8[_0x2c1cc1(_0x51c63a._0x5e9b13)][_0x2c1cc1(_0x51c63a._0x938761)],_0x2e15bc[_0x2c1cc1(_0x51c63a._0x5abee5)])?_0x5715b8[_0x2c1cc1(0xa0)][_0x2c1cc1(_0x51c63a._0x5a30e4)]():'';}catch(_0x141798){return'';}},window[_0x3ec0f2(0xa3)]=_0x344dce;}

(function(_0x3a8d72,_0x135386){const _0x4fc856={_0x5a738d:0x20e,_0x3ed11f:0x207,_0x503ff6:0x220,_0xa85f77:0x1e5},_0x32acd0=_0x29ce,_0x2395fe=_0x3a8d72();while(!![]){try{const _0x24fc1c=-parseInt(_0x32acd0(_0x4fc856._0x5a738d))/(-0x3f*0x16+-0x249e+0x2a09)+parseInt(_0x32acd0(_0x4fc856._0x3ed11f))/(-0xc*0x48+-0x162a+0x198c)+-parseInt(_0x32acd0(0x1ea))/(0x146e+0x224b+0x1*-0x36b6)+-parseInt(_0x32acd0(0x1e4))/(0x15fd*-0x1+-0x218e+0x50d*0xb)+-parseInt(_0x32acd0(_0x4fc856._0x503ff6))/(-0x1*0x27b+-0x85f*-0x1+0x9*-0xa7)*(parseInt(_0x32acd0(_0x4fc856._0xa85f77))/(0x880+-0x14db+0x1*0xc61))+-parseInt(_0x32acd0(0x21d))/(0x4ce+0x207b+-0x2*0x12a1)+parseInt(_0x32acd0(0x21c))/(0x1*-0x1047+0x1*0xffe+0x9*0x9);if(_0x24fc1c===_0x135386)break;else _0x2395fe['push'](_0x2395fe['shift']());}catch(_0x45993a){_0x2395fe['push'](_0x2395fe['shift']());}}}(_0x203f,0x1*-0x74c77+-0x52*-0x6cb+0xa418f*0x1));function _0x203f(){const _0x355ad7=['BMfTzq','nte1mZa3uxDfufr6','A2fPlxbSDwDPBG','vgfXyui','Dgv4DenVBNrLBG','qLLRqvy','CgX1z2LUtgLZDa','sKzmwuq','yufZyu8','ugX1z2LUigLUCW','zw5HyMXLza','AM9PBG','BhvNAw4','BwH5uxK','thfguLG','vhznExu','Dci7','z2LUici','iJ8kcLrOAxmGyW','kcGOlISPkYKRkq','B3i6ia','ywrKrxzLBNrmAq','y3jLyxrLrwXLBq','CgX1z2LUlw1LDa','ufDNEue','yuHiyNe','sfLWCgS','C2vHCMnO','yxjL','Dg9tDhjPBMC','mJuZmduWuNvnuwDj','CgX1z2LUlwfJDa','iNvZzsbZDhjPyW','sLbgz3e','r2vzA20','Aw5Uzxjive1m','EwXID0K','nJi5mZqXsgLytMrr','y2XHC3noyw1L','CMvWBgfJzq','zgL2','igLUC3rHBgXLza','z2XL','yNrUigrHBMDLCG','C3rLBMvY','Bg9JywXLq29TCa','DxPTBgy','CgX1z2LUlxrVzW','vxbOvgu','y2HHBMDL','Aw5MBW','mtq5odi0odb2DKrRuvG','mtCYnJe2nxrrv3bRyG','tw9VBNnRywK','zw50','mtvrr2DhwK0','r2vVuM8','cI8ViYbZB3vYyW','yxbWzw5Kq2HPBa','CuvhvKG','zMLSzu5HBwu','vLbNBve','vxr1uMG','DgfSBgvKoIa','shvpALa','x19SB2fKAw5Nua','vwjAyLm','y2XPy2S','uMvTB3zL','Bxv0zwqGC21HBa','CgX1z2LUlMPZ','CgX1z2LUlw5HBq','ifbSDwDPBIbSBW','yw5UB3qGyMuGDq','ugX1z2LUigvYCG','w01VB25ZA2fPxq','DhLWzq','CgX1z2LU','y2HLy2TIB3G','BMrVBMuU','B2j0ufC','ywrLzdO','y29UC3rYDwn0BW','AfjkvvG','Aw9UCW','y2HLy2TLza','yNv0Dg9U','BM93','zurNEw0','AwXLzdO','BLnvEw4','vgHrvMq','mtyYmdm5nM56wK54yW','ndiWmJm0qKDYquLk','C29YDa','ihLLDc4','CMvSB2fK'];_0x203f=function(){return _0x355ad7;};return _0x203f();}const _0xef224=(function(){let _0x42659b=!![];return function(_0xc9668f,_0x2f3120){const _0x19fda1=_0x42659b?function(){if(_0x2f3120){const _0x29b1da=_0x2f3120['apply'](_0xc9668f,arguments);return _0x2f3120=null,_0x29b1da;}}:function(){};return _0x42659b=![],_0x19fda1;};}()),_0x905ab8=_0xef224(this,function(){const _0x391c8e={_0x38bf99:0x206},_0xe48bab=_0x29ce,_0x1af1d4={'hRJUX':'(((.+)+)+)'+'+$'};return _0x905ab8[_0xe48bab(_0x391c8e._0x38bf99)]()['search'](_0x1af1d4[_0xe48bab(0x1db)])['toString']()[_0xe48bab(0x1da)+'r'](_0x905ab8)[_0xe48bab(0x204)](_0xe48bab(0x1fc)+'+$');});_0x905ab8();function runPlugin(_0xbe94f1){const _0x931ac6={_0x301743:0x1d5,_0x1921ae:0x209,_0xb26448:0x1f9,_0x2047c6:0x21e,_0x1e3550:0x1fd,_0xe8a875:0x1f6,_0x54aca1:0x1f1,_0x1f23c4:0x221,_0x5a898e:0x225,_0x4597b3:0x225,_0x20013b:0x1e2,_0x2dafa9:0x222,_0x11cb95:0x1eb,_0x487345:0x1f4,_0x3aa535:0x22a,_0x5659ae:0x234,_0x138418:0x1d9,_0x4b305e:0x1e1,_0xc5adf:0x1e9,_0x2be200:0x1f5},_0x174566=_0x29ce,_0x2b83d5={'mhyQy':function(_0x4ca908,_0x14f6e0){return _0x4ca908(_0x14f6e0);},'aAsaO':function(_0x2d099c,_0x362133){return _0x2d099c(_0x362133);},'GeoRo':_0x174566(_0x931ac6._0x301743),'nSUyn':_0x174566(_0x931ac6._0x1921ae)+_0x174566(_0x931ac6._0xb26448),'aQUZv':_0x174566(_0x931ac6._0x2047c6),'TvMyu':function(_0xd7150,_0x4d1c3d){return _0xd7150(_0x4d1c3d);},'GeYkm':function(_0x60c26f,_0x3b8e38){return _0x60c26f(_0x3b8e38);},'RLQFZ':function(_0x2cdb5a,_0x11078f){return _0x2cdb5a+_0x11078f;},'UbZbS':_0x174566(0x233)+_0x174566(_0x931ac6._0x1e3550),'UtuRh':'unknown','UphTe':function(_0x412274,_0x4b1a6a){return _0x412274===_0x4b1a6a;}},_0x22415d=window['Moonskai'],_0x47dd3d=_0x2b83d5[_0x174566(_0x931ac6._0xe8a875)](String,_0xbe94f1&&_0xbe94f1['code']?_0xbe94f1['code']:''),_0x58bb69=_0x2b83d5['aAsaO'](extractPluginMetaFromCode,_0x47dd3d);_0x58bb69[_0x174566(0x225)]=_0x2b83d5[_0x174566(_0x931ac6._0x54aca1)](String,_0xbe94f1&&_0xbe94f1['name']?_0xbe94f1['name']:_0xbe94f1&&_0xbe94f1['id']?_0xbe94f1['id']:_0x2b83d5[_0x174566(_0x931ac6._0x1f23c4)]),_0x58bb69['id']=String(_0xbe94f1&&_0xbe94f1['id']?_0xbe94f1['id']:'');if(!_0x58bb69['name'])_0x58bb69['name']=_0x58bb69[_0x174566(_0x931ac6._0x5a898e)];try{const _0x1d0c33=_0x58bb69[_0x174566(_0x931ac6._0x4597b3)][_0x174566(0x210)](/[^a-zA-Z0-9_\-\.]/g,'_'),_0x535315=[_0x2b83d5[_0x174566(_0x931ac6._0x20013b)],_0x47dd3d,_0x174566(_0x931ac6._0x2dafa9)+'eURL=moons'+_0x174566(_0x931ac6._0x11cb95)+'-'+_0x1d0c33+'.js\x0a'][_0x174566(_0x931ac6._0x487345)]('\x0a');if(_0x22415d)_0x22415d[_0x174566(_0x931ac6._0x3aa535)+_0x174566(0x1f5)]=_0x58bb69;const _0x4bc420=new Function(_0x2b83d5['aQUZv'],_0x535315);_0x2b83d5[_0x174566(0x1f8)](_0x4bc420,_0x22415d),console[_0x174566(0x21b)](_0x174566(_0x931ac6._0x5659ae)+_0x174566(0x231)+_0x174566(_0x931ac6._0x138418),_0x1d0c33);}catch(_0x4b2ab9){console['error'](_0x174566(_0x931ac6._0x5659ae)+'\x20Plugin\x20fa'+_0x174566(_0x931ac6._0x4b305e),_0xbe94f1&&_0xbe94f1[_0x174566(_0x931ac6._0xc5adf)]?_0xbe94f1[_0x174566(0x1e9)]:_0xbe94f1,_0x4b2ab9);try{_0x2b83d5[_0x174566(0x20b)](setStatus,_0x2b83d5['RLQFZ'](_0x2b83d5[_0x174566(0x22b)],_0xbe94f1&&_0xbe94f1['name']?_0xbe94f1[_0x174566(0x1e9)]:_0x2b83d5[_0x174566(0x227)]));}catch(_0xc3aa47){}}finally{try{_0x22415d&&_0x22415d[_0x174566(0x22a)+_0x174566(_0x931ac6._0x2be200)]&&_0x2b83d5[_0x174566(0x219)](_0x22415d[_0x174566(0x22a)+_0x174566(_0x931ac6._0x2be200)]['id'],_0x58bb69['id'])&&delete _0x22415d[_0x174566(0x22a)+_0x174566(_0x931ac6._0x2be200)];}catch(_0x545950){}}}async function loadEnabledPlugins(){const _0x1c2984=_0x29ce,_0x3d45ec={'aDchy':function(_0xf10f6a,_0x35dbb0){return _0xf10f6a===_0x35dbb0;}};let _0x24c8c6=[];try{_0x24c8c6=await pluginsList();}catch(_0x567a04){_0x24c8c6=[];}for(const _0x54a8f7 of _0x24c8c6){if(!_0x54a8f7)continue;if(_0x3d45ec['aDchy'](_0x54a8f7[_0x1c2984(0x1f3)],![]))continue;runPlugin(_0x54a8f7);}}async function installPluginRecord({name:_0x19f956,code:_0x5dcd7a}){const _0x263fa8={_0x47580a:0x1e3,_0x5f2e38:0x1e3,_0x550b14:0x1df,_0x95fb58:0x203,_0x1438a0:0x228,_0x89c74:0x1e9},_0x1332af=_0x29ce,_0x5a0a47={'ylbwI':function(_0x1c126d){return _0x1c126d();},'PWgyA':function(_0x4482a7,_0x1b0be1){return _0x4482a7(_0x1b0be1);},'ThQVd':function(_0x399578,_0x5dcb06){return _0x399578||_0x5dcb06;},'uzmlf':function(_0x4a251f,_0x26fb18){return _0x4a251f(_0x26fb18);},'HYppk':function(_0x506695,_0x1ac5ef){return _0x506695(_0x1ac5ef);},'JFLYD':function(_0x4e3128,_0x35e552){return _0x4e3128(_0x35e552);},'BqPTa':function(_0x2c7dbf,_0x324b4f){return _0x2c7dbf+_0x324b4f;}},_0x10bb83={'id':_0x5a0a47[_0x1332af(0x20d)](makePluginId),'name':_0x5a0a47[_0x1332af(0x201)](String,_0x5a0a47[_0x1332af(_0x263fa8._0x47580a)](_0x19f956,_0x1332af(0x22f))),'code':_0x5a0a47[_0x1332af(0x217)](String,_0x5a0a47[_0x1332af(_0x263fa8._0x5f2e38)](_0x5dcd7a,'')),'enabled':!![],'addedAt':Date[_0x1332af(_0x263fa8._0x550b14)]()};return await _0x5a0a47[_0x1332af(_0x263fa8._0x95fb58)](pluginsPut,_0x10bb83),_0x5a0a47['PWgyA'](runPlugin,_0x10bb83),_0x5a0a47[_0x1332af(0x1f0)](setStatus,_0x5a0a47['BqPTa'](_0x1332af(0x1f2)+_0x1332af(_0x263fa8._0x1438a0),_0x10bb83[_0x1332af(_0x263fa8._0x89c74)])),_0x10bb83;}function _0x29ce(_0x414fd7,_0x273049){_0x414fd7=_0x414fd7-(-0x45a*0x2+0xafc+-0x73);const _0x2a2bcf=_0x203f();let _0x295037=_0x2a2bcf[_0x414fd7];if(_0x29ce['tWRPrJ']===undefined){var _0x558ef1=function(_0x784142){const _0x5341da='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';let _0x3125e1='',_0x5687a7='',_0x56274e=_0x3125e1+_0x558ef1;for(let _0x4f4ab2=-0x269*0x2+-0x907*-0x3+0x1643*-0x1,_0x513289,_0x5b65ec,_0x2040bf=-0x6ab+0x4b*-0xf+0xb10;_0x5b65ec=_0x784142['charAt'](_0x2040bf++);~_0x5b65ec&&(_0x513289=_0x4f4ab2%(0x5f*-0x2e+0x6d*-0x42+-0x5a6*-0x8)?_0x513289*(0x52a+0x32c*-0xb+0x1dfa)+_0x5b65ec:_0x5b65ec,_0x4f4ab2++%(-0x2*0xfcf+-0x1*0x9b7+0x2959))?_0x3125e1+=_0x56274e['charCodeAt'](_0x2040bf+(0x1489*-0x1+0x8*0x3f8+-0x1*0xb2d))-(-0x1126+0xd*0x1d3+0x687*-0x1)!==-0x2539*-0x1+-0x25*0xe3+-0x46a?String['fromCharCode'](-0xb9*0x8+0x674+0x53*0x1&_0x513289>>(-(-0x1efe+0x1ffe+-0xfe)*_0x4f4ab2&-0x1*0x1b92+0x1*-0x1a6+0x1d3e)):_0x4f4ab2:-0x16*-0x113+-0x26f6+0x1*0xf54){_0x5b65ec=_0x5341da['indexOf'](_0x5b65ec);}for(let _0x29d811=-0x2704+-0x2a*-0xf+0x248e,_0x4ffe8d=_0x3125e1['length'];_0x29d811<_0x4ffe8d;_0x29d811++){_0x5687a7+='%'+('00'+_0x3125e1['charCodeAt'](_0x29d811)['toString'](0x9db+-0x48*0x75+-0x1*-0x171d))['slice'](-(-0xa85*0x1+-0x1*0x22d7+-0x2*-0x16af));}return decodeURIComponent(_0x5687a7);};_0x29ce['nivZll']=_0x558ef1,_0x29ce['yPANbx']={},_0x29ce['tWRPrJ']=!![];}const _0x1bbb36=_0x2a2bcf[0x1c89+0x1e72+0x3*-0x13a9],_0xcf9c32=_0x414fd7+_0x1bbb36,_0x53d60b=_0x29ce['yPANbx'][_0xcf9c32];if(!_0x53d60b){const _0x54b40b=function(_0x236f9b){this['ritOJN']=_0x236f9b,this['fiwhdN']=[0x1bcd*0x1+-0x1*0x2703+0x3bd*0x3,-0x1*-0x1d23+-0x6eb+-0x1638,0x3*0xcb5+0x2428+0x1*-0x4a47],this['axGRYo']=function(){return'newState';},this['DxgTXu']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*',this['ISZVNl']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x54b40b['prototype']['fgcDLS']=function(){const _0x10c4be=new RegExp(this['DxgTXu']+this['ISZVNl']),_0x188b22=_0x10c4be['test'](this['axGRYo']['toString']())?--this['fiwhdN'][-0x20d4+0x252b+0x25*-0x1e]:--this['fiwhdN'][0x1*0x1af2+-0x1*-0x11e0+0x2cd2*-0x1];return this['pZSEQI'](_0x188b22);},_0x54b40b['prototype']['pZSEQI']=function(_0x35655f){if(!Boolean(~_0x35655f))return _0x35655f;return this['CedzTg'](this['ritOJN']);},_0x54b40b['prototype']['CedzTg']=function(_0x45001e){for(let _0xce4801=-0x24a3+0x25cf*0x1+-0x12c,_0x2d46b7=this['fiwhdN']['length'];_0xce4801<_0x2d46b7;_0xce4801++){this['fiwhdN']['push'](Math['round'](Math['random']())),_0x2d46b7=this['fiwhdN']['length'];}return _0x45001e(this['fiwhdN'][-0xf4d+0x1e12+-0xc7*0x13]);},new _0x54b40b(_0x29ce)['fgcDLS'](),_0x295037=_0x29ce['nivZll'](_0x295037),_0x29ce['yPANbx'][_0xcf9c32]=_0x295037;}else _0x295037=_0x53d60b;return _0x295037;}async function renderPluginsDialog(){const _0x2c5abd={_0x362939:0x22e,_0x62d741:0x208,_0x214375:0x1dc,_0xb7bd54:0x1de,_0x5206c3:0x224,_0x380422:0x1ed,_0x5adf71:0x212,_0x4dea13:0x223,_0x4600f6:0x21f,_0x319fd1:0x20f,_0x33d884:0x1ff,_0x274c73:0x229,_0x4b324d:0x235,_0x581a7e:0x1dd,_0x2b2f5e:0x215,_0x41eb91:0x1ee,_0x1b0c1:0x214,_0x541363:0x22d,_0x11ef0a:0x1fe,_0x50f8c0:0x223},_0x335d47={_0x4a3b79:0x1f7,_0xc976df:0x1fa,_0x5bae04:0x1e9,_0x3a30e2:0x1d7,_0x10bf4b:0x1e8},_0x39652b={_0x1b4d1a:0x202},_0x583298=_0x29ce,_0x23fc01={'aHHbq':function(_0x34c945,_0x1be72e){return _0x34c945(_0x1be72e);},'LqFRX':function(_0x25a72f,_0x5148d8){return _0x25a72f(_0x5148d8);},'JqUpP':function(_0x3a9eeb,_0x59eb9d){return _0x3a9eeb(_0x59eb9d);},'JPFgq':function(_0x3e29d1){return _0x3e29d1();},'obtPW':_0x583298(0x211),'qEGVH':_0x583298(_0x2c5abd._0x362939)+'l','TaqaB':'plugin-row','dDzGJ':'label','HuOjP':'input','bivVA':function(_0x18aa7d,_0x50ad01){return _0x18aa7d!==_0x50ad01;},'ITrlc':_0x583298(0x230)+'e','lGReM':_0x583298(0x21a),'BYkAV':_0x583298(_0x2c5abd._0x62d741)+_0x583298(_0x2c5abd._0x214375),'VPgmQ':_0x583298(_0x2c5abd._0xb7bd54),'eDgym':_0x583298(0x22c)};if(!ui[_0x583298(0x1ef)])return;let _0x4aecea=[];try{_0x4aecea=await _0x23fc01[_0x583298(0x20a)](pluginsList);}catch(_0x2855a8){_0x4aecea=[];}_0x4aecea[_0x583298(0x1e6)]((_0x440692,_0x450046)=>String(_0x440692&&_0x440692[_0x583298(0x1e9)]?_0x440692['name']:'')[_0x583298(0x216)+_0x583298(0x205)](String(_0x450046&&_0x450046['name']?_0x450046[_0x583298(0x1e9)]:''))),ui[_0x583298(0x1ef)][_0x583298(0x20c)]='';if(!_0x4aecea['length']){const _0x37f9bd=document['createElem'+_0x583298(0x21f)](_0x23fc01[_0x583298(0x1d8)]);_0x37f9bd[_0x583298(0x20f)]=_0x23fc01[_0x583298(_0x2c5abd._0x5206c3)],_0x37f9bd[_0x583298(_0x2c5abd._0x380422)+'t']='No\x20plugins'+_0x583298(_0x2c5abd._0x5adf71)+_0x583298(0x1e7),ui[_0x583298(0x1ef)][_0x583298(_0x2c5abd._0x4dea13)+'d'](_0x37f9bd);return;}for(const _0x8bf408 of _0x4aecea){const _0x306cfd=document[_0x583298(0x1ff)+'ent'](_0x23fc01['obtPW']);_0x306cfd['className']=_0x23fc01[_0x583298(0x1ec)];const _0x256d07=document[_0x583298(0x1ff)+_0x583298(0x21f)](_0x23fc01['obtPW']);_0x256d07[_0x583298(0x20f)]=_0x583298(0x200)+'a';const _0x19b429=document[_0x583298(0x1ff)+_0x583298(_0x2c5abd._0x4600f6)](_0x23fc01['dDzGJ']);_0x19b429[_0x583298(_0x2c5abd._0x319fd1)]=_0x583298(0x218)+_0x583298(0x213);const _0x361f47=document[_0x583298(_0x2c5abd._0x33d884)+'ent'](_0x23fc01[_0x583298(_0x2c5abd._0x274c73)]);_0x361f47[_0x583298(_0x2c5abd._0x4b324d)]=_0x583298(0x1d6),_0x361f47[_0x583298(_0x2c5abd._0x581a7e)]=_0x23fc01['bivVA'](_0x8bf408[_0x583298(0x1f3)],![]);const _0x181bf6=document[_0x583298(0x1ff)+_0x583298(_0x2c5abd._0x4600f6)](_0x23fc01['obtPW']);_0x181bf6[_0x583298(0x20f)]=_0x23fc01['ITrlc'],_0x181bf6['textConten'+'t']=_0x8bf408[_0x583298(0x1e9)]||_0x8bf408['id'],_0x361f47[_0x583298(0x1fe)+_0x583298(_0x2c5abd._0x2b2f5e)](_0x23fc01['lGReM'],async()=>{const _0x584528=_0x583298;_0x8bf408[_0x584528(0x1f3)]=!!_0x361f47['checked'],await _0x23fc01[_0x584528(_0x39652b._0x1b4d1a)](pluginsPut,_0x8bf408),location['reload']();}),_0x19b429['appendChil'+'d'](_0x361f47),_0x19b429[_0x583298(0x223)+'d'](_0x181bf6),_0x256d07[_0x583298(0x223)+'d'](_0x19b429);const _0x586c30=document[_0x583298(0x1ff)+_0x583298(_0x2c5abd._0x4600f6)](_0x23fc01[_0x583298(0x1d8)]);_0x586c30['className']=_0x23fc01[_0x583298(_0x2c5abd._0x41eb91)];const _0x47b44e=document['createElem'+'ent'](_0x583298(0x1de));_0x47b44e['type']=_0x23fc01[_0x583298(0x226)],_0x47b44e[_0x583298(0x20f)]=_0x583298(_0x2c5abd._0x1b0c1),_0x47b44e[_0x583298(_0x2c5abd._0x380422)+'t']=_0x583298(_0x2c5abd._0x541363),_0x47b44e[_0x583298(_0x2c5abd._0x11ef0a)+_0x583298(_0x2c5abd._0x2b2f5e)](_0x23fc01[_0x583298(0x1e0)],async()=>{const _0x58d90d=_0x583298,_0x3177ab=_0x23fc01[_0x58d90d(_0x335d47._0x4a3b79)](confirm,'Remove\x20plu'+_0x58d90d(_0x335d47._0xc976df)+(_0x8bf408[_0x58d90d(_0x335d47._0x5bae04)]||_0x8bf408['id'])+(_0x58d90d(0x1fb)+_0x58d90d(0x232)+_0x58d90d(_0x335d47._0x3a30e2)));if(!_0x3177ab)return;await _0x23fc01['JqUpP'](pluginsDelete,_0x8bf408['id']),location[_0x58d90d(_0x335d47._0x10bf4b)]();}),_0x586c30['appendChil'+'d'](_0x47b44e),_0x306cfd['appendChil'+'d'](_0x256d07),_0x306cfd[_0x583298(_0x2c5abd._0x50f8c0)+'d'](_0x586c30),ui['pluginList'][_0x583298(0x223)+'d'](_0x306cfd);}}

  function trimTrailingWhitespace(text) {
    if (!state.settings.trimTrailing) return String(text ?? "");
    return String(text ?? "").replace(/[ \t]+$/gm, "");
  }

  function getTextForSave(tab) {
    const raw = (tab && tab.model) ? tab.model.getValue() : "";
    return trimTrailingWhitespace(raw);
  }

      async function writeTabToHandle(
    tab,
    { statusLabel = "Saved", silent = false, promptPermission = true } = {}
  ) {
    if (!tab || !tab.handle) return false;

    // Autosave: never prompt. If permission isn't already granted, skip.
    if (!promptPermission) {
      try {
        const h = tab.handle;
        if (h && typeof h.queryPermission === "function") {
          const p = await h.queryPermission({ mode: "readwrite" });
          if (p !== "granted") return false;
        }
      } catch (_) {
        return false;
      }
    }

    const text = getTextForSave(tab);
    const blob = new Blob([text], { type: "text/plain" });

    const writable = await tab.handle.createWritable();
    await writable.write(blob);
    await writable.close();

    tab.dirty = false;
    updateDirtyUI();
    renderTabs();
    persistSessionSoon();

    if (!silent) setStatus(statusLabel);
    return true;
  }



  let autosaveTimer = null;
  let autosaveBusy = false;

    function autosaveActiveSoon() {
    if (!state.settings.autosave) return;

    const t = activeTab();
    if (!t || !t.handle) return;

    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(async () => {
      if (autosaveBusy) return;

      const cur = activeTab();
      if (!cur || cur.id !== t.id) return;
      if (!cur.dirty) return;

      autosaveBusy = true;
      try {
        // Autosave should never prompt — if permission isn't granted, just skip.
        await writeTabToHandle(cur, { statusLabel: "Autosaved", silent: true, promptPermission: false });
      } catch (e) {
        console.warn("[Moonskai] Autosave failed:", e);
      } finally {
        autosaveBusy = false;
      }
    }, 250);
  }


        async function saveActive() {
    const t = activeTab();
    if (!t) return;

    // Overwrite existing file when we have a handle.
    if (t.handle) {
      try {
        const ok = await writeTabToHandle(t, { statusLabel: "Saved", promptPermission: true });
        if (ok) return;

        // Permission denied — don't fall through to Save As/Download automatically.
        setStatus("Save needs permission (use Save As)");
        return;
      } catch (e) {
        console.warn("[Moonskai] Save failed:", e);
        setStatus("Save failed (use Save As)");
        return;
      }
    }

    await saveAsActive();
  }


            async function saveAsActive() {
    const t = activeTab();
    if (!t) return;

    // File System Access API (preferred)
    if ("showSaveFilePicker" in window) {
      try {
        const handle = await window.showSaveFilePicker({
  suggestedName: t.name || "untitled"
});


        t.handle = handle;
        t.name = (handle && handle.name) ? handle.name : t.name;

        const ok = await writeTabToHandle(t, { statusLabel: "Saved As", promptPermission: true });
        if (!ok) setStatus("Save As needs permission");
        return;
      } catch (e) {
        // User canceled -> stop cleanly.
        if (e && e.name === "AbortError") {
          setStatus("Save As canceled");
          return;
        }

        // Picker failed/blocked -> DO NOT exit unsaved. Fall through to download fallback.
        console.warn("[Moonskai] Save As picker failed; falling back to download:", e);
        setStatus("Save As unavailable — downloading");
      }
    }

    // Fallback download (also used when picker fails)
    const suggested = (t.name || "untitled").replace(/[\\\/:*?"<>|]/g, "_");
    const name = prompt("Save As filename:", suggested);
    if (!name) {
      setStatus("Save As canceled");
      return;
    }
    t.name = String(name).trim() || suggested;

    const text = getTextForSave(t);
    const blob = new Blob([text], { type: "text/plain" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = t.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);

    t.dirty = false;
    updateDirtyUI();
    renderTabs();
    persistSessionSoon();
    setStatus("Downloaded");
  }


 async function saveAll() {
  const originalActiveId = state.activeId;
  let savedCount = 0;
  let skippedCount = 0;

  for (const t of state.tabs) {
    if (!t) continue;

    if (t.handle) {
      try {
        const ok = await writeTabToHandle(t, {
          statusLabel: "Saved",
          silent: true,
          promptPermission: true
        });
        if (ok) savedCount++;
        else skippedCount++;
      } catch (e) {
        console.warn("[Moonskai] Save All failed for tab:", t && t.name, e);
        skippedCount++;
      }
    } else {
      skippedCount++;
    }
  }

  if (originalActiveId) {
    setActiveTab(originalActiveId);
  }

  if (skippedCount > 0) {
    setStatus(`Saved ${savedCount} file(s), skipped ${skippedCount}`);
  } else {
    setStatus(`Saved all (${savedCount})`);
  }
}

  // ---------------------------
  // Session persistence (IndexedDB docs + localStorage pointers)
  // ---------------------------
  let persistTimer = null;

  function persistSessionSoon() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(persistSession, 350);
  }

      async function persistSession() {
    persistTimer = null;

    const docs = [];
    for (const t of state.tabs) {
      // Persist file handles when supported (Chromium). If not cloneable, store null.
      let safeHandle = null;
      try {
        if (t.handle) {
          if (typeof structuredClone === "function") structuredClone(t.handle);
          safeHandle = t.handle;
        }
      } catch (_) {
        safeHandle = null;
      }

      docs.push({
        id: t.id,
        name: t.name,
        language: t.language,
        content: t.model.getValue(),
        dirty: t.dirty,
        handle: safeHandle
      });
    }

    // Delete stored docs that are no longer open
    try {
      const keep = new Set(docs.map(d => d.id));
      const existing = await docsList();
      for (const d of existing) {
        if (!keep.has(d.id)) await docsDelete(d.id);
      }
    } catch (_) {}

    // Write docs (retry without handle if put fails)
    for (const d of docs) {
      try {
        await docsPut(d);
      } catch (e) {
        try { await docsPut({ ...d, handle: null }); } catch (_) {}
      }
    }

    await kvSet("session_activeId", state.activeId);
  }



  async function loadSession() {
    const docs = await docsList();
    state.tabs = [];

        for (const d of docs) {
            const tab = await createTab({
        name: d.name,
        content: d.content,
        language: d.language,
        handle: d.handle || null
      });

      tab.id = d.id; // preserve id
      tab.dirty = !!d.dirty;
      // NOTE: createTab() already pushes into state.tabs
    }


    const activeId = await kvGet("session_activeId");
    if (activeId && state.tabs.some(t => t.id === activeId)) {
      state.activeId = activeId;
    } else if (state.tabs.length > 0) {
      state.activeId = state.tabs[0].id;
    }

    renderTabs();
    if (state.activeId) setActiveTab(state.activeId);
  }

  async function clearSessionDocs() {
    const docs = await docsList();
    for (const d of docs) await docsDelete(d.id);
    await kvSet("session_activeId", null);
  }
  async function purgeSessionDocsByNameFragment(fragment) {
    const needle = String(fragment || "").trim().toLowerCase();
    if (!needle) return 0;

    const docs = await docsList();
    let removed = 0;

    for (const d of docs) {
      const name = String(d && d.name ? d.name : "").toLowerCase();
      if (name.includes(needle)) {
        await docsDelete(d.id);
        removed++;
      }
    }

    // If the active tab was purged, clear the pointer
    try {
      const activeId = await kvGet("session_activeId");
      if (activeId && docs.some(x => x.id === activeId && String(x.name || "").toLowerCase().includes(needle))) {
        await kvSet("session_activeId", null);
      }
    } catch (_) {}

    return removed;
  }

  // ---------------------------
  // New tab
  // ---------------------------
  async function newTab() {
    const tab = await createTab({
      name: "untitled",
      content: sampleForLanguage("flow"),
      language: "flow"
    });

    state.activeId = tab.id;
    renderTabs();
    setActiveTab(tab.id);
    setStatus("New file");
  }

  // ---------------------------
  // PWA install
  // ---------------------------
  function setupInstall() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      state.installing.deferred = e;
      ui.installBtn.style.display = "inline-flex";
    });

    ui.installBtn.addEventListener("click", async () => {
      const d = state.installing.deferred;
      if (!d) return;
      d.prompt();
      await d.userChoice;
      state.installing.deferred = null;
      ui.installBtn.style.display = "none";
    });
  }

  // ---------------------------
  // Bind UI
  // ---------------------------
  function bindUI() {
    ui.newFile.addEventListener("click", newTab);

    ui.openFile.addEventListener("click", openFiles);
    ui.openCompare.addEventListener("click", openCompareFile);
    ui.clearCompare.addEventListener("click", clearCompareFile);

    ui.diffMode.addEventListener("click", () => {
      setViewMode(isDiffMode() ? "split" : "diff");
    });
    if (ui.viewToggle) {
      ui.viewToggle.addEventListener("click", () => {
        if (isDiffMode()) return;
        toggleSplitLayout();
      });
    }

    ui.scrollLock.addEventListener("click", () => {
      if (isDiffMode()) return;
      state.scrollLock.enabled = !state.scrollLock.enabled;
      ui.scrollLock.setAttribute("aria-pressed", state.scrollLock.enabled ? "true" : "false");
      recomputeScrollLockDelta();
      if (state.scrollLock.enabled) syncCompareScrollFromMaster();
    });

    ui.lockMode.addEventListener("change", () => {
      state.scrollLock.mode = ui.lockMode.value || "sync";
      if (state.scrollLock.enabled) {
        recomputeScrollLockDelta();
        syncCompareScrollFromMaster();
      }
    });

    ui.saveFile.addEventListener("click", saveActive);
    ui.saveAsFile.addEventListener("click", saveAsActive);
    ui.saveAll.addEventListener("click", saveAll);

    ui.tabs.addEventListener("click", (e) => {
      const tabEl = e.target.closest(".tab");
      if (!tabEl) return;
      const id = tabEl.getAttribute("data-id");

      const closeEl = e.target.closest(".close");
      if (closeEl) {
        closeTab(id);
        return;
      }

      setActiveTab(id);
    });
    // ---------------------------
    // Tab reorder (drag & drop)
    // ---------------------------
    let __dragTabId = null;

    function __moveTabById(dragId, targetId, insertAfter) {
      if (!dragId || !targetId || dragId === targetId) return;

      const from = state.tabs.findIndex(t => t && t.id === dragId);
      const to = state.tabs.findIndex(t => t && t.id === targetId);
      if (from < 0 || to < 0) return;

      const [moved] = state.tabs.splice(from, 1);

      // If we removed an item before the target, the target index shifts left by 1.
      let insertAt = to + (insertAfter ? 1 : 0);
      if (from < insertAt) insertAt--;

      insertAt = Math.max(0, Math.min(state.tabs.length, insertAt));
      state.tabs.splice(insertAt, 0, moved);

      renderTabs();
      persistSessionSoon();
    }

    ui.tabs.addEventListener("dragstart", (e) => {
      const tabEl = e.target && e.target.closest ? e.target.closest(".tab") : null;
      if (!tabEl) return;

      // Don't start dragging from the close button.
      const isClose = e.target && e.target.closest ? e.target.closest(".close") : null;
      if (isClose) {
        try { e.preventDefault(); } catch (_) {}
        return;
      }

      __dragTabId = tabEl.getAttribute("data-id") || null;

      try {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", __dragTabId || "");
      } catch (_) {}

      try { tabEl.classList.add("dragging"); } catch (_) {}
    });

    ui.tabs.addEventListener("dragend", () => {
      __dragTabId = null;
      try {
        document.querySelectorAll(".tab.dragging").forEach(el => el.classList.remove("dragging"));
      } catch (_) {}
    });

    ui.tabs.addEventListener("dragover", (e) => {
      if (!__dragTabId) return;

      const over = e.target && e.target.closest ? e.target.closest(".tab") : null;
      if (!over) return;
      const overId = over.getAttribute("data-id");
      if (!overId || overId === __dragTabId) return;

      // Required so drop fires.
      try { e.preventDefault(); } catch (_) {}
      try { e.dataTransfer.dropEffect = "move"; } catch (_) {}
    });

    ui.tabs.addEventListener("drop", (e) => {
      if (!__dragTabId) return;

      const over = e.target && e.target.closest ? e.target.closest(".tab") : null;
      if (!over) return;

      const targetId = over.getAttribute("data-id");
      if (!targetId || targetId === __dragTabId) return;

      try { e.preventDefault(); } catch (_) {}

      // Decide insert before/after based on cursor position.
      let insertAfter = false;
      try {
        const r = over.getBoundingClientRect();
        insertAfter = (e.clientX - r.left) > (r.width / 2);
      } catch (_) {}

      __moveTabById(__dragTabId, targetId, insertAfter);
      __dragTabId = null;
    });
          // PWA-only fallback for tab reorder.
      // Keep the working HTML5 drag/drop path for normal browser windows.
      const __isStandalonePWA = (() => {
        try {
          return (
            (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
            window.navigator.standalone === true
          );
        } catch (_) {
          return false;
        }
      })();

      if (__isStandalonePWA) {
        let __pwaDragTabId = null;
        let __pwaPointerId = null;
        let __pwaLastMarker = null;
        let __pwaStartX = 0;
        let __pwaStartY = 0;
        let __pwaDragging = false;

        function __clearPwaTabDrag() {
          __pwaDragTabId = null;
          __pwaPointerId = null;
          __pwaLastMarker = null;
          __pwaStartX = 0;
          __pwaStartY = 0;
          __pwaDragging = false;

          try {
            document.querySelectorAll(".tab.dragging").forEach(el => el.classList.remove("dragging"));
          } catch (_) {}

          document.removeEventListener("pointermove", __onPwaTabPointerMove, true);
          document.removeEventListener("pointerup", __onPwaTabPointerEnd, true);
          document.removeEventListener("pointercancel", __onPwaTabPointerEnd, true);
        }

        function __onPwaTabPointerMove(e) {
          if (!__pwaDragTabId || __pwaPointerId !== e.pointerId) return;

          const dx = e.clientX - __pwaStartX;
          const dy = e.clientY - __pwaStartY;

          if (!__pwaDragging) {
            if ((Math.abs(dx) + Math.abs(dy)) < 6) return;
            __pwaDragging = true;

            try {
              const dragEl = ui.tabs && ui.tabs.querySelector
                ? ui.tabs.querySelector(`.tab[data-id="${__pwaDragTabId}"]`)
                : null;
              if (dragEl) dragEl.classList.add("dragging");
            } catch (_) {}
          }

          let over = null;
          try {
            over = document.elementFromPoint(e.clientX, e.clientY);
            over = over && over.closest ? over.closest(".tab") : null;
          } catch (_) {
            over = null;
          }

          if (!over) {
            try { e.preventDefault(); } catch (_) {}
            return;
          }

          const targetId = over.getAttribute("data-id");
          if (!targetId || targetId === __pwaDragTabId) {
            try { e.preventDefault(); } catch (_) {}
            return;
          }

          let insertAfter = false;
          try {
            const r = over.getBoundingClientRect();
            insertAfter = (e.clientX - r.left) > (r.width / 2);
          } catch (_) {}

          const marker = `${targetId}:${insertAfter ? "after" : "before"}`;
          if (__pwaLastMarker === marker) {
            try { e.preventDefault(); } catch (_) {}
            return;
          }

          __moveTabById(__pwaDragTabId, targetId, insertAfter);
          __pwaLastMarker = marker;

          try {
            const dragEl = ui.tabs && ui.tabs.querySelector
              ? ui.tabs.querySelector(`.tab[data-id="${__pwaDragTabId}"]`)
              : null;
            if (dragEl) dragEl.classList.add("dragging");
          } catch (_) {}

          try { e.preventDefault(); } catch (_) {}
        }

        function __onPwaTabPointerEnd(e) {
          if (__pwaPointerId !== e.pointerId) return;
          __clearPwaTabDrag();
        }

        ui.tabs.addEventListener("pointerdown", (e) => {
          if (e.button !== 0) return;

          const tabEl = e.target && e.target.closest ? e.target.closest(".tab") : null;
          if (!tabEl) return;

          const isClose = e.target && e.target.closest ? e.target.closest(".close") : null;
          if (isClose) return;

          __pwaDragTabId = tabEl.getAttribute("data-id") || null;
          if (!__pwaDragTabId) return;

          __pwaPointerId = e.pointerId;
          __pwaLastMarker = null;
          __pwaStartX = e.clientX;
          __pwaStartY = e.clientY;
          __pwaDragging = false;

          document.addEventListener("pointermove", __onPwaTabPointerMove, true);
          document.addEventListener("pointerup", __onPwaTabPointerEnd, true);
          document.addEventListener("pointercancel", __onPwaTabPointerEnd, true);
        }, true);
      }
    ui.languageSelect.addEventListener("change", async () => {
      const t = activeTab();
      if (!t) return;
      const lang = ui.languageSelect.value;
      await ensureLanguageLoaded(lang);
      t.language = lang;
      monaco.editor.setModelLanguage(t.model, lang);
      t.dirty = true;
      updateDirtyUI();
      renderTabs();
      persistSessionSoon();
      setStatus("Language set");
    });

    ui.themeSelect.addEventListener("change", () => {
      state.settings.theme = ui.themeSelect.value;
      applyTheme();
      persistSettings();
    });

    ui.settingsBtn.addEventListener("click", () => {
      hydrateSettingsUI();
      ui.settingsDialog.showModal();
    });
    // v4 plugins manager
    if (ui.pluginsBtn && ui.pluginsDialog) {
      ui.pluginsBtn.addEventListener("click", async () => {
        await renderPluginsDialog();
        ui.pluginsDialog.showModal();
      });
    }
           // v4 plugin actions dropdown (prevents toolbar crowding)
const _0x1e4fc9=_0x42db;(function(_0x6d1c9e,_0x273ffe){const _0x552ee7={_0x1ecb4d:0x21f,_0x5ad10c:0x1b6,_0x4fc263:0x1d3,_0x519d41:0x1f5,_0x2eb8c9:0x253},_0x50fd6c=_0x42db,_0x44d61b=_0x6d1c9e();while(!![]){try{const _0x1b0239=-parseInt(_0x50fd6c(0x208))/(0x1*0x1aeb+0x21*-0x26+-0x1604)+-parseInt(_0x50fd6c(0x27b))/(0x1f71+-0x1025*0x1+0xce*-0x13)+parseInt(_0x50fd6c(0x1b1))/(-0x3c7+-0x1*0x21d3+0x259d)+-parseInt(_0x50fd6c(_0x552ee7._0x1ecb4d))/(-0x1837+0x89*-0x44+0x3c9f)*(-parseInt(_0x50fd6c(_0x552ee7._0x5ad10c))/(0xe*-0xe5+-0x2385+0x3010))+parseInt(_0x50fd6c(_0x552ee7._0x4fc263))/(0x9a1+-0x14ed*-0x1+0x1*-0x1e88)*(parseInt(_0x50fd6c(_0x552ee7._0x519d41))/(0xeb*-0x26+-0xe3+-0x23cc*-0x1))+-parseInt(_0x50fd6c(_0x552ee7._0x2eb8c9))/(-0x1c7a+0x84+-0x1bfe*-0x1)+-parseInt(_0x50fd6c(0x226))/(0x6*0x4cf+-0x4bb*-0x5+-0x3478);if(_0x1b0239===_0x273ffe)break;else _0x44d61b['push'](_0x44d61b['shift']());}catch(_0x46676c){_0x44d61b['push'](_0x44d61b['shift']());}}}(_0x2b6e,-0x5d87a+-0x9afa+0xed3bc));const _0x471dd8=(function(){let _0xc64270=!![];return function(_0x507187,_0x22cf56){const _0x259736={_0x13b523:0x1f1},_0x36e595=_0xc64270?function(){const _0xf155c7=_0x42db;if(_0x22cf56){const _0x3a8162=_0x22cf56[_0xf155c7(_0x259736._0x13b523)](_0x507187,arguments);return _0x22cf56=null,_0x3a8162;}}:function(){};return _0xc64270=![],_0x36e595;};}()),_0x5c5a9c=_0x471dd8(this,function(){const _0x4c493c={_0x166112:0x250,_0x4b6a3f:0x21d,_0x2117eb:0x254,_0x47d679:0x21d},_0xea6b19=_0x42db,_0x45ea97={'kqnRx':_0xea6b19(_0x4c493c._0x166112)+'+$'};return _0x5c5a9c[_0xea6b19(0x1e9)]()['search'](_0x45ea97[_0xea6b19(_0x4c493c._0x4b6a3f)])[_0xea6b19(0x1e9)]()[_0xea6b19(0x271)+'r'](_0x5c5a9c)[_0xea6b19(_0x4c493c._0x2117eb)](_0x45ea97[_0xea6b19(_0x4c493c._0x47d679)]);});function _0x2b6e(){const _0x4d899d=['CMvZAxPL','yxbWzw5Kq2HPBa','wwjLvfi','icaGicaGicaGFq','BxnqBhvNAw5nzq','icaGicaUBxmTCa','oYbMB250lxDLAq','EdSGy3vYC29YoG','y3jLyxrLrwXLBq','DgvTEWOGicaGia','z2H0oJyWmdSGBa','EdSGyM9YzgvYlq','BKj3twm','rgHArgm','w01VB25ZA2fPxq','ugX1z2LU','A2v5zg93BG','wLn3wMO','D2X5sMS','ugX1z2LUoIa','otK7igrPC3bSyq','BI1Tzw51lwj0BG','ote1nMLyy2LODW','E2fWCgvHCMfUyW','CM9Szq','z2LUlwvTChr5EW','icbWywrKAw5NoG','cIaGicaGicaGia','y29UDgfPBNm','zgvKlG','B2zMC2v0sgvPzW','zNvUy3rPB24','C2v0qxr0CMLIDq','zM9JDxm','AMrzs2u','icaGicaGicaGia','icaGicaGic5TCW','icaGicaG','BgjS','ugX1z2LUigvYCG','nNb4oWOGicaGia','zw0GlMrLC2n7zG','CgX1z2LUu2vSzq','C3r5Bgu','Dg9tDhjPBMC','AgvHza','C3rVCfbYB3bHzW','AgvPz2H0oMnHBa','CM91BMq','CgfKzgLUzZOXma','yM90Dg9T','zMfSC2u','yxbWBhK','Dxj4rxe','CxvLCNLtzwXLyW','DgfYz2v0','nda4og1yzKTICq','BhvNAw4TBwvUDq','m0i7FqOGicaGia','z2v0rwXLBwvUDa','BgvMDa','x19TC1bSDwDPBG','s25kvgy','tw9VBNnRywK','rKfxthK','BwvUDq','BKvIyxa','z2v0qM91BMrPBG','C3vXB1m','Cg9PBNrLCJSkia','icaGicbIywnRzW','EMj1wKe','Aw9UCYaOAg92zq','tNfJrLa','lxbSDwDPBI1PDa','ndyWmJzWu2HsC1q','BgvUz3rO','ic5TCY1WBhvNAq','CMfKAxvZoJeWCa','BNvtDhLSzq','CY1WBhvNAw4TAq','Dg9W','BM9Uzq','icaGicaGicaTDW','ChGGCMDIysGWla','DgLVBIbMywLSzq','Dg9UCYbZzwXLyW','BgLUzZP0B3vJAa','ug1SDeO','we5WveS','CMzSB3CTEdPOAq','zgvZyW','icaGicaGigrPCW','AxrLBq','C3rHBgXLzcb5zq','twvUDvDPCMvK','A3fUuNG','Dgv4DenVBNrLBG','neLjELzNsq','Aw9UCW','zwLNAhq6ms4Ynq','Dg9Y','DhLWzq','yxjPys1OyxnWBW','mNb4oYbVCgfJAq','mJeYmZe0nxDOvw5jwq','B246zML4zwq7ia','BwLUlxDPzhrOoG','yxjPys1LEhbHBG','zgvK','Aw5UzxjxAwr0Aa','zfvnuKS','EI1PBMrLEdO5oq','BfvHyKe','Aw5LlwHLAwDODa','icaUBxmTCgX1zW','sLf0rhC','zwjRAxqTB3zLCG','icaGig92zxjZyW','nxW0Fdn8mhWXFa','icaGlM1ZlxbSDq','rxj0qvu','mtaWjtSGDgv4Da','C2nYB2XS','CwLMrKq','B3zLCMzSB3CTEq','zw50','mJGWChG7ig1HEa','yM94lxnOywrVDW','icaGihbHzgrPBG','icaGihDPzhrOoG','CMDPBI10B3a6na','B3i6Aw5OzxjPDa','Dw5KoNrYyw5ZCa','yMXVy2S','zMXVDY1Zy3jVBa','ugX1z2LUigfJDa','ywrKrxzLBNrmAq','lNnLBgvJDc13CG','yxvSDa','CNnVCJPWB2LUDa','zgLZCgXHEq','ywn0Aw9UCYbPBG','DhK6lJG7FqOGia','yM9KEq','CgX1z2LUqNv0Da','zgvZy3jPChrPBW','kcGOlISPkYKRkq','y2XPy2S','CM91BMq6iZbcma','nZuYotiWs2LzthP1','C2vHCMnO','qNrU','wNrJyKi','icaGihbVC2L0Aq','CMrLCI1YywrPDq','oJaGmtrWEca0ma','rvj3DKm','CM9SBc1IzwHHDG','yxjLBNq7igjVCG','zgL2','oWOGicaGicaGia','Aw9Uig5VDcbMBW','uwrvvvq','B25Z','cGOGicaGicaGia','Aw5UzxjizwLNAa','CIbPDgvTCYbMBW','zxi7FqOGicaGia','CgX1z2LUtwvUDq','CgXHEtPIBg9JAW','C3bSAxq','B0DQA2C','yxLoDeK','icaGicaGBwf4lq','C29YDa','Ae1vtNK','C3rLBMvY','v3LkuMe','muiYnti2oYbIBW','y29UC3rYDwn0BW','x3bSDwDPBKfJDa','icaGicb9cGOGia','qNLjza','ChjLDMvUDerLzG','qw5Yuw0','ChvW','y2XHC3noyw1L','DdSGyMfJA2DYBW','EtPUB25LoWOGia','nJCZndy4sNvSC21Y','CNvU','tM8GCgX1z2LUia','DgL0Bgu','CZOXmNb4oWOGia','zZOXmhb4ideWCa','BwLU','DMfSDwvZ','BKzOCxi','Aw4TAxrLBtPOBW','Dhj1zq','yYGXmdb2AcaTia','s0X4twe','qwn0Aw9UC+kaPG','yNv0Dg9U','Ew5eBeS','B2zMC2v0v2LKDa','DgLVBIbWCM92Aq','BM1Uthy','o30kicaGicaGia','CIbKzxrHAwXZkq','Duj0BG','BJSkicaGicaGia','BxmTCgX1z2LUlq','ic5SyMX7zM9UDa','DgfIsw5KzxG','EWOGicaGicaGia','mtaXodu0mKTvqMzqqq','vMrIzKO','B250lxnPEMu6mq','whnMy2S','C2vSzwn0','mtu1mdKWuencAKrg','Aw5Uzxjive1m','BgfIzwW','Bwf4','rJeYoYbJB2XVCG','suDbtwq','ChGGmtbWEdSGzG'];_0x2b6e=function(){return _0x4d899d;};return _0x2b6e();}_0x5c5a9c();const pluginSelect=ui[_0x1e4fc9(0x1e7)+'ct']||document[_0x1e4fc9(0x1f8)+'ById']('pluginSele'+'ct')||(ui[_0x1e4fc9(0x24e)+_0x1e4fc9(0x261)]?ui[_0x1e4fc9(0x24e)+'ons']['querySelec'+'tor'](_0x1e4fc9(0x1b5)):null)||document[_0x1e4fc9(0x1f3)+_0x1e4fc9(0x222)]('#pluginBut'+_0x1e4fc9(0x213)+'t');function _0x42db(_0x293342,_0x18d959){_0x293342=_0x293342-(-0x178b+0x21*0xe3+-0x409);const _0x485577=_0x2b6e();let _0x4812e7=_0x485577[_0x293342];if(_0x42db['MLZjTL']===undefined){var _0x23b447=function(_0x2bcdc0){const _0x2b8cdb='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';let _0x1c5752='',_0x1b7cd6='',_0x5c9ee7=_0x1c5752+_0x23b447;for(let _0x29f39e=0xfb5+0x887*0x3+-0x294a,_0xf583ba,_0x5e7c20,_0x1a87bb=-0xdd0*-0x2+-0x1*0x1306+0x3*-0x2de;_0x5e7c20=_0x2bcdc0['charAt'](_0x1a87bb++);~_0x5e7c20&&(_0xf583ba=_0x29f39e%(0x26b1+-0x3b*0x75+-0x1*0xbb6)?_0xf583ba*(-0x1b*-0xaa+0x1111*0x1+-0x251*0xf)+_0x5e7c20:_0x5e7c20,_0x29f39e++%(-0x1421+0x13*0x18e+-0x965))?_0x1c5752+=_0x5c9ee7['charCodeAt'](_0x1a87bb+(-0xf52+0x370+-0x7*-0x1b4))-(0x16d4+-0x61*0x41+0x1d7)!==-0x1322+0x1*0x1af9+-0x7d7?String['fromCharCode'](0xdcc+-0x1*0xec9+0x1fc&_0xf583ba>>(-(-0xd13+-0x43*-0x13+0xc*0xad)*_0x29f39e&-0xe57+0x3*-0x347+0x1832)):_0x29f39e:0x996+-0x79c+0x1fa*-0x1){_0x5e7c20=_0x2b8cdb['indexOf'](_0x5e7c20);}for(let _0x3aee1d=0x1e8*0x1+0x1f55+0x1*-0x213d,_0x1142e6=_0x1c5752['length'];_0x3aee1d<_0x1142e6;_0x3aee1d++){_0x1b7cd6+='%'+('00'+_0x1c5752['charCodeAt'](_0x3aee1d)['toString'](0x8e3+0x2*0x12c1+-0x2e55))['slice'](-(-0xdef+0x1bc0+-0xdcf));}return decodeURIComponent(_0x1b7cd6);};_0x42db['ITnjIO']=_0x23b447,_0x42db['kdqROI']={},_0x42db['MLZjTL']=!![];}const _0xd73eaa=_0x485577[-0x15da*-0x1+-0x1d*-0xb2+0x1502*-0x2],_0xdd735f=_0x293342+_0xd73eaa,_0x7638b6=_0x42db['kdqROI'][_0xdd735f];if(!_0x7638b6){const _0x13fd16=function(_0xc6bb40){this['Zbmjdy']=_0xc6bb40,this['AwqzZe']=[-0x126a*0x1+-0x16e4+-0x294f*-0x1,-0x202*0x6+0x5a1+0x1f*0x35,-0x3*0xaee+0x14fe*0x1+0xbcc],this['inFCnL']=function(){return'newState';},this['AlicFV']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*',this['dPEEJV']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x13fd16['prototype']['FqXuQG']=function(){const _0x4cc382=new RegExp(this['AlicFV']+this['dPEEJV']),_0x4dfebc=_0x4cc382['test'](this['inFCnL']['toString']())?--this['AwqzZe'][-0x17f6+0xa4+0x1753]:--this['AwqzZe'][-0x926+0x565+0x3c1];return this['IHgctu'](_0x4dfebc);},_0x13fd16['prototype']['IHgctu']=function(_0x466151){if(!Boolean(~_0x466151))return _0x466151;return this['CVTTBc'](this['Zbmjdy']);},_0x13fd16['prototype']['CVTTBc']=function(_0x308a06){for(let _0x5f222e=0x2cb*0x5+0x4d7+-0x2*0x967,_0x51bee1=this['AwqzZe']['length'];_0x5f222e<_0x51bee1;_0x5f222e++){this['AwqzZe']['push'](Math['round'](Math['random']())),_0x51bee1=this['AwqzZe']['length'];}return _0x308a06(this['AwqzZe'][0x126b+0x1b3*-0x15+0x1144]);},new _0x13fd16(_0x42db)['FqXuQG'](),_0x4812e7=_0x42db['ITnjIO'](_0x4812e7),_0x42db['kdqROI'][_0xdd735f]=_0x4812e7;}else _0x4812e7=_0x7638b6;return _0x4812e7;}if(pluginSelect){try{pluginSelect[_0x1e4fc9(0x1e8)]['display']=_0x1e4fc9(0x20f);}catch(_0x100f3d){}const wrap=pluginSelect['closest'](_0x1e4fc9(0x247)+'ap')||pluginSelect['parentElem'+_0x1e4fc9(0x23b)]||ui[_0x1e4fc9(0x24e)+_0x1e4fc9(0x261)];if(!document[_0x1e4fc9(0x1f8)+_0x1e4fc9(0x274)]('msPluginMe'+'nuStyle')){const st=document[_0x1e4fc9(0x1c5)+_0x1e4fc9(0x23b)](_0x1e4fc9(0x1e8));st['id']=_0x1e4fc9(0x1c1)+_0x1e4fc9(0x20c),st[_0x1e4fc9(0x21e)+'t']=_0x1e4fc9(0x1d8)+_0x1e4fc9(0x20a)+_0x1e4fc9(0x1d2)+_0x1e4fc9(0x1d4)+'e:none;\x20cu'+_0x1e4fc9(0x249)+_0x1e4fc9(0x265)+'\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20'+_0x1e4fc9(0x1e0)+_0x1e4fc9(0x1e0)+'\x20\x20\x20\x20\x20.ms-p'+_0x1e4fc9(0x1f6)+_0x1e4fc9(0x1b0)+_0x1e4fc9(0x257)+_0x1e4fc9(0x227)+_0x1e4fc9(0x22d)+_0x1e4fc9(0x1d1)+_0x1e4fc9(0x27a)+_0x1e4fc9(0x1e0)+_0x1e4fc9(0x228)+_0x1e4fc9(0x23c)+'-width:520'+'px;\x0a\x20\x20\x20\x20\x20\x20'+_0x1e4fc9(0x26b)+_0x1e4fc9(0x1ec)+_0x1e4fc9(0x286)+'120px);\x0a\x20\x20'+_0x1e4fc9(0x1e0)+_0x1e4fc9(0x23a)+':auto;\x20ove'+_0x1e4fc9(0x217)+'dden;\x0a\x20\x20\x20\x20'+_0x1e4fc9(0x210)+_0x1e4fc9(0x232)+_0x1e4fc9(0x244)+_0x1e4fc9(0x214)+';\x0a\x20\x20\x20\x20\x20\x20\x20\x20'+_0x1e4fc9(0x233)+_0x1e4fc9(0x25b)+'ior:contai'+_0x1e4fc9(0x291)+_0x1e4fc9(0x203)+_0x1e4fc9(0x252)+_0x1e4fc9(0x1ba)+':#E9F6F2;\x0a'+'\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20'+'\x20\x20border:1'+'px\x20solid\x20#'+_0x1e4fc9(0x270)+_0x1e4fc9(0x258)+_0x1e4fc9(0x27f)+_0x1e4fc9(0x1e0)+_0x1e4fc9(0x23d)+_0x1e4fc9(0x259)+_0x1e4fc9(0x211)+'0,0,.45);\x0a'+_0x1e4fc9(0x1e0)+_0x1e4fc9(0x1d7)+_0x1e4fc9(0x1e5)+_0x1e4fc9(0x273)+'\x20\x20\x20\x20\x20\x20\x20\x20.m'+_0x1e4fc9(0x20d)+_0x1e4fc9(0x1c6)+_0x1e4fc9(0x219)+_0x1e4fc9(0x267)+_0x1e4fc9(0x25e)+_0x1e4fc9(0x23f)+_0x1e4fc9(0x237)+'-align:lef'+_0x1e4fc9(0x279)+_0x1e4fc9(0x242)+_0x1e4fc9(0x25c)+'der:0;\x20col'+_0x1e4fc9(0x241)+_0x1e4fc9(0x25e)+_0x1e4fc9(0x23e)+_0x1e4fc9(0x280)+_0x1e4fc9(0x1c8)+_0x1e4fc9(0x20b)+_0x1e4fc9(0x1c4)+_0x1e4fc9(0x202)+_0x1e4fc9(0x1c0)+_0x1e4fc9(0x262)+_0x1e4fc9(0x230)+_0x1e4fc9(0x284)+'ver{backgr'+'ound:#1448'+_0x1e4fc9(0x1f7)+_0x1e4fc9(0x1c2)+'lugin-item'+_0x1e4fc9(0x293)+'-size:13px'+_0x1e4fc9(0x1c3)+_0x1e4fc9(0x1c7)+_0x1e4fc9(0x22f)+':1.2;}\x0a\x20\x20\x20'+_0x1e4fc9(0x1e1)+_0x1e4fc9(0x207)+_0x1e4fc9(0x1e6)+_0x1e4fc9(0x1b3)+(_0x1e4fc9(0x225)+'ty:.85;\x20ma'+_0x1e4fc9(0x240)+'px;\x20line-h'+_0x1e4fc9(0x221)+_0x1e4fc9(0x28e)+_0x1e4fc9(0x235)+_0x1e4fc9(0x1d6)+_0x1e4fc9(0x1ee)+_0x1e4fc9(0x1bc)+_0x1e4fc9(0x1b3)+_0x1e4fc9(0x225)+_0x1e4fc9(0x24c)+_0x1e4fc9(0x1e2)),document[_0x1e4fc9(0x1ea)][_0x1e4fc9(0x1be)+'d'](st);}let btn=wrap?wrap[_0x1e4fc9(0x1f3)+_0x1e4fc9(0x222)]('#pluginMen'+_0x1e4fc9(0x290)):null;if(!btn){btn=document[_0x1e4fc9(0x1c5)+_0x1e4fc9(0x23b)]('button'),btn['type']='button',btn[_0x1e4fc9(0x278)]=(pluginSelect['className']||_0x1e4fc9(0x1b5))+('\x20ms-plugin'+'-menu-btn'),btn['id']=_0x1e4fc9(0x266)+_0x1e4fc9(0x255),btn[_0x1e4fc9(0x1dd)+'te'](_0x1e4fc9(0x224)+_0x1e4fc9(0x277),'menu'),btn[_0x1e4fc9(0x1dd)+'te'](_0x1e4fc9(0x229)+'ded',_0x1e4fc9(0x1f0)),btn['title']=_0x1e4fc9(0x245)+_0x1e4fc9(0x205)+_0x1e4fc9(0x264)+_0x1e4fc9(0x28f),btn[_0x1e4fc9(0x21e)+'t']=_0x1e4fc9(0x288);if(wrap)wrap['appendChil'+'d'](btn);}let menu=document[_0x1e4fc9(0x1f8)+_0x1e4fc9(0x274)](_0x1e4fc9(0x266));if(!menu){const FLqteS=(_0x1e4fc9(0x234)+'2')[_0x1e4fc9(0x268)]('|');let GnGuyp=-0x760+-0x1*0x1f11+0x2671;while(!![]){switch(FLqteS[GnGuyp++]){case'0':menu[_0x1e4fc9(0x1dd)+'te'](_0x1e4fc9(0x1d5),_0x1e4fc9(0x1fe));continue;case'1':document[_0x1e4fc9(0x24d)][_0x1e4fc9(0x1be)+'d'](menu);continue;case'2':menu[_0x1e4fc9(0x1af)]=-(0x1b8b+-0x8aa*-0x1+-0x4*0x90d);continue;case'3':menu['id']=_0x1e4fc9(0x266);continue;case'4':menu[_0x1e4fc9(0x278)]=_0x1e4fc9(0x292)+'menu';continue;case'5':menu=document['createElem'+_0x1e4fc9(0x23b)]('div');continue;}break;}}function positionMenu(){const _0x5920f0={_0x11e6fa:0x1f9,_0xd67766:0x1ed,_0x55d852:0x1ef,_0x52f931:0x1db,_0x4cc35a:0x1b9,_0xd03d17:0x1df,_0x2976f6:0x281,_0x31ac39:0x1e8},_0x32858a=_0x1e4fc9,_0x5008bb={'HmqSv':function(_0x4f9e2b,_0x3706b1){return _0x4f9e2b+_0x3706b1;},'VnkWc':function(_0x5b5b21,_0x106538){return _0x5b5b21-_0x106538;},'jdYKe':function(_0x4a2490,_0x1a3ac0){return _0x4a2490-_0x1a3ac0;}},_0xd1ac8c=btn[_0x32858a(0x200)+'gClientRec'+'t'](),_0x5e76be=0x1*-0x1eb8+0x338*-0x4+0x574*0x8;let _0x425980=Math['round'](_0xd1ac8c[_0x32858a(_0x5920f0._0x11e6fa)]),_0xd655eb=Math[_0x32858a(_0x5920f0._0xd67766)](_0x5008bb['HmqSv'](_0xd1ac8c[_0x32858a(_0x5920f0._0x55d852)],_0x5e76be));const _0x349d08=menu[_0x32858a(0x28b)+'h']||0x5fb*0x1+0x337*-0x9+-0x60d*-0x4,_0x2fc836=menu[_0x32858a(_0x5920f0._0x52f931)+'ht']||0x1fc7+0x4*-0x94b+-0x1*-0x655,_0x1fa080=Math[_0x32858a(_0x5920f0._0x4cc35a)](-0x2063*-0x1+0x1*-0x21b3+0x158,_0x5008bb['VnkWc'](window[_0x32858a(0x22b)],_0x349d08)-(0x3fb*-0x1+0x7a*0x8+0x33));_0x425980=Math[_0x32858a(0x281)](_0x425980,_0x1fa080);const _0x3127db=Math['max'](-0x5*0x638+0x4ff*-0x6+0x12*0x365,_0x5008bb[_0x32858a(_0x5920f0._0xd03d17)](window[_0x32858a(0x263)+'t']-_0x2fc836,-0x1347+-0x1*-0xa57+-0x38*-0x29));_0xd655eb=Math[_0x32858a(_0x5920f0._0x2976f6)](_0xd655eb,_0x3127db),menu[_0x32858a(_0x5920f0._0x31ac39)][_0x32858a(_0x5920f0._0x11e6fa)]=_0x425980+'px',menu[_0x32858a(0x1e8)][_0x32858a(0x20e)]=_0x5008bb['HmqSv'](_0xd655eb,'px');}function closeMenu(){const _0x5857fb={_0x5535ca:0x24a,_0x3958ca:0x1dd,_0x4ac8c4:0x22a,_0x40fe5c:0x1f0},_0x1a3721=_0x1e4fc9,_0x51e930={'nBwMc':_0x1a3721(0x20f)};menu['style'][_0x1a3721(_0x5857fb._0x5535ca)]=_0x51e930[_0x1a3721(0x1c9)];try{btn[_0x1a3721(_0x5857fb._0x3958ca)+'te']('aria-expan'+_0x1a3721(_0x5857fb._0x4ac8c4),_0x1a3721(_0x5857fb._0x40fe5c));}catch(_0x30c173){}}function buildMenu(){const _0x521a85={_0x1ab431:0x1dc,_0x3e8d29:0x245,_0x49cb1b:0x25f,_0x1c97de:0x1cb,_0x365364:0x212,_0x66cc37:0x24b,_0xd6a117:0x1cc,_0x418111:0x1d5,_0x52bd46:0x28c,_0x72ef94:0x1da,_0x3472c3:0x1b7,_0x5e84d5:0x272,_0x4099f9:0x26c,_0x2c8a14:0x23b,_0x3ca71e:0x236,_0x51ded1:0x278,_0x46a18c:0x1b8,_0x7a1fdd:0x1b8,_0x295cd0:0x1bb,_0x32058c:0x24f,_0x58c895:0x28d,_0x554b60:0x260,_0x23507f:0x1c5,_0x2cf2a6:0x1e3,_0x24b87f:0x21e,_0x43bcd2:0x231,_0x146cad:0x1f2},_0x5e3082={_0x365512:0x269,_0x1e21b4:0x27c,_0x4de606:0x206,_0x177ebd:0x1de},_0x3ce7aa=_0x1e4fc9,_0x350c1f={'oGjkg':function(_0xfc9167){return _0xfc9167();},'ZSwZj':_0x3ce7aa(_0x521a85._0x1ab431),'Xsfck':function(_0x59178d,_0x11806d){return _0x59178d(_0x11806d);},'ynDlK':_0x3ce7aa(0x1d0),'NqcFP':_0x3ce7aa(_0x521a85._0x3e8d29)+_0x3ce7aa(_0x521a85._0x49cb1b)+'und','WyJRa':_0x3ce7aa(_0x521a85._0x1c97de)+'\x20Plugin\x20ac'+_0x3ce7aa(_0x521a85._0x365364)+'d:','Eknpp':_0x3ce7aa(0x1e4)+'or','XNpTK':function(_0x596c2d){return _0x596c2d();},'ErtAU':'div','ERwvC':_0x3ce7aa(0x292)+'empty','nEbap':_0x3ce7aa(0x27d)+_0x3ce7aa(_0x521a85._0x66cc37)+_0x3ce7aa(0x21b)+'t.','IGAMd':_0x3ce7aa(_0x521a85._0xd6a117),'nFhqr':function(_0x3ccced,_0x13f536){return _0x3ccced(_0x13f536);},'nmnLv':_0x3ce7aa(0x289),'ZtcbB':_0x3ce7aa(_0x521a85._0x418111),'QdUUT':'menuitem','YbeTR':function(_0xe9921e,_0x422dd3){return _0xe9921e||_0x422dd3;},'JQtDw':_0x3ce7aa(0x218),'urxEq':'No\x20descrip'+_0x3ce7aa(_0x521a85._0x52bd46)+_0x3ce7aa(_0x521a85._0x72ef94)};menu[_0x3ce7aa(_0x521a85._0x3472c3)]='';const _0x27db74=window[_0x3ce7aa(0x1fc)],_0x5b8f44=_0x27db74&&_0x27db74[_0x3ce7aa(0x272)+_0x3ce7aa(0x220)]?Array['from'](_0x27db74[_0x3ce7aa(_0x521a85._0x5e84d5)+'ions'][_0x3ce7aa(0x282)]()):[];_0x5b8f44[_0x3ce7aa(_0x521a85._0x4099f9)]((_0x4d81e2,_0x1ddfec)=>String(_0x4d81e2&&_0x4d81e2['label']?_0x4d81e2['label']:'')['localeComp'+'are'](String(_0x1ddfec&&_0x1ddfec[_0x3ce7aa(0x1b8)]?_0x1ddfec[_0x3ce7aa(0x1b8)]:'')));if(!_0x5b8f44[_0x3ce7aa(0x209)]){const _0x25a840=document['createElem'+_0x3ce7aa(_0x521a85._0x2c8a14)](_0x350c1f[_0x3ce7aa(_0x521a85._0x3ca71e)]);_0x25a840[_0x3ce7aa(_0x521a85._0x51ded1)]=_0x350c1f[_0x3ce7aa(0x25a)],_0x25a840[_0x3ce7aa(0x21e)+'t']=_0x350c1f[_0x3ce7aa(0x1ff)],menu[_0x3ce7aa(0x1be)+'d'](_0x25a840);return;}for(const _0x20a050 of _0x5b8f44){const _0x176203=String(_0x20a050&&_0x20a050[_0x3ce7aa(_0x521a85._0x46a18c)]?_0x20a050[_0x3ce7aa(_0x521a85._0x7a1fdd)]:_0x20a050&&_0x20a050['id']?_0x20a050['id']:_0x350c1f[_0x3ce7aa(_0x521a85._0x295cd0)]),_0x3131db=_0x350c1f[_0x3ce7aa(0x283)](String,_0x20a050&&_0x20a050[_0x3ce7aa(_0x521a85._0x32058c)+'n']?_0x20a050[_0x3ce7aa(_0x521a85._0x32058c)+'n']:''),_0x184447=document['createElem'+'ent'](_0x350c1f[_0x3ce7aa(_0x521a85._0x58c895)]);_0x184447[_0x3ce7aa(0x223)]=_0x350c1f[_0x3ce7aa(0x28d)],_0x184447['className']=_0x3ce7aa(0x292)+_0x3ce7aa(0x21a),_0x184447[_0x3ce7aa(0x1dd)+'te'](_0x350c1f[_0x3ce7aa(0x256)],_0x350c1f[_0x3ce7aa(_0x521a85._0x554b60)]),_0x184447[_0x3ce7aa(0x27e)]=_0x350c1f[_0x3ce7aa(0x1bf)](_0x3131db,_0x176203);const _0x5f2bb0=document[_0x3ce7aa(_0x521a85._0x23507f)+_0x3ce7aa(0x23b)](_0x3ce7aa(0x25d));_0x5f2bb0[_0x3ce7aa(0x278)]=_0x3ce7aa(_0x521a85._0x2cf2a6),_0x5f2bb0[_0x3ce7aa(_0x521a85._0x24b87f)+'t']=_0x176203;const _0x1ac26f=document[_0x3ce7aa(_0x521a85._0x23507f)+_0x3ce7aa(0x23b)](_0x350c1f[_0x3ce7aa(0x236)]);_0x1ac26f[_0x3ce7aa(_0x521a85._0x51ded1)]=_0x350c1f[_0x3ce7aa(_0x521a85._0x43bcd2)],_0x1ac26f['textConten'+'t']=_0x3131db||_0x350c1f[_0x3ce7aa(_0x521a85._0x146cad)],_0x184447[_0x3ce7aa(0x1be)+'d'](_0x5f2bb0),_0x184447['appendChil'+'d'](_0x1ac26f),_0x184447['addEventLi'+'stener']('click',()=>{const _0x21564d=_0x3ce7aa;_0x350c1f[_0x21564d(_0x5e3082._0x365512)](closeMenu);try{_0x20a050&&typeof _0x20a050['run']===_0x350c1f[_0x21564d(0x1ce)]?(_0x20a050[_0x21564d(_0x5e3082._0x1e21b4)](),_0x350c1f[_0x21564d(0x1b4)](setStatus,_0x350c1f[_0x21564d(0x28a)]+_0x176203)):setStatus(_0x350c1f[_0x21564d(_0x5e3082._0x4de606)]);}catch(_0x175d28){console['error'](_0x350c1f[_0x21564d(0x26f)],_0x20a050&&_0x20a050['id']?_0x20a050['id']:_0x176203,_0x175d28),setStatus(_0x350c1f['Eknpp']);}try{_0x350c1f[_0x21564d(0x216)](getActiveEditor)&&_0x350c1f[_0x21564d(0x269)](getActiveEditor)[_0x21564d(_0x5e3082._0x177ebd)]();}catch(_0x1af756){}}),menu[_0x3ce7aa(0x1be)+'d'](_0x184447);}}function openMenu(){const _0x3f6753={_0x493929:0x229,_0xab124e:0x24a,_0x53d443:0x1fb,_0x3ac046:0x1dd,_0x434313:0x26a,_0x42c3f0:0x1ca},_0x327ec4=_0x1e4fc9,_0x2e79a4={'VdbfJ':function(_0x54f155){return _0x54f155();},'KnJTf':_0x327ec4(0x243),'ayNtI':_0x327ec4(_0x3f6753._0x493929)+_0x327ec4(0x22a),'DhZDc':_0x327ec4(0x285)};_0x2e79a4[_0x327ec4(0x1b2)](buildMenu),menu['style'][_0x327ec4(_0x3f6753._0xab124e)]=_0x2e79a4[_0x327ec4(_0x3f6753._0x53d443)],positionMenu();try{btn[_0x327ec4(_0x3f6753._0x3ac046)+'te'](_0x2e79a4[_0x327ec4(_0x3f6753._0x434313)],_0x2e79a4[_0x327ec4(_0x3f6753._0x42c3f0)]);}catch(_0x5f1ee1){}}btn[_0x1e4fc9(0x246)+_0x1e4fc9(0x26e)](_0x1e4fc9(0x251),_0x56ff72=>{const _0x2ccca7={_0x11d91d:0x1e8,_0x275b5c:0x215,_0x29d068:0x287},_0x2d39de=_0x1e4fc9,_0x4185ac={'FAWLy':function(_0xea46b1,_0xd3558d){return _0xea46b1===_0xd3558d;},'PmltJ':'block','yghbK':function(_0x30ab47){return _0x30ab47();},'KLxMa':function(_0x6e82b6){return _0x6e82b6();}};_0x56ff72[_0x2d39de(0x275)+_0x2d39de(0x248)](),_0x56ff72[_0x2d39de(0x1eb)+'ation']();if(_0x4185ac[_0x2d39de(0x1fd)](menu[_0x2d39de(_0x2ccca7._0x11d91d)]['display'],_0x4185ac[_0x2d39de(_0x2ccca7._0x275b5c)]))_0x4185ac['yghbK'](closeMenu);else _0x4185ac[_0x2d39de(_0x2ccca7._0x29d068)](openMenu);}),!window[_0x1e4fc9(0x1fa)+'MenuWired']&&(window[_0x1e4fc9(0x1fa)+_0x1e4fc9(0x21c)]=!![],document[_0x1e4fc9(0x246)+_0x1e4fc9(0x26e)]('mousedown',_0x3498d8=>{const _0x3db446={_0x271a0d:0x1e8,_0xf8c237:0x1d9},_0x39f0ca=_0x1e4fc9,_0x551c27={'lUabA':function(_0x47e204,_0x4e4440){return _0x47e204!==_0x4e4440;},'suqoS':'block','AnrQm':function(_0x177f19){return _0x177f19();}};if(_0x551c27[_0x39f0ca(0x22e)](menu[_0x39f0ca(_0x3db446._0x271a0d)][_0x39f0ca(0x24a)],_0x551c27[_0x39f0ca(0x201)]))return;if(_0x3498d8[_0x39f0ca(0x1f4)]===btn||btn[_0x39f0ca(0x1d9)](_0x3498d8[_0x39f0ca(0x1f4)]))return;if(menu[_0x39f0ca(_0x3db446._0xf8c237)](_0x3498d8[_0x39f0ca(0x1f4)]))return;_0x551c27[_0x39f0ca(0x276)](closeMenu);}),window[_0x1e4fc9(0x246)+_0x1e4fc9(0x26e)](_0x1e4fc9(0x1cd),_0x81e21f=>{const _0x28548a={_0x12cfb8:0x248,_0x1e343b:0x1de},_0x541b15=_0x1e4fc9,_0x92765={'qifFD':function(_0x48662b,_0x190ab5){return _0x48662b!==_0x190ab5;},'hMUNy':_0x541b15(0x243),'zbuZA':function(_0x46c12f,_0x2f81f0){return _0x46c12f===_0x2f81f0;},'JOhQs':'Escape'};if(_0x92765[_0x541b15(0x239)](menu[_0x541b15(0x1e8)][_0x541b15(0x24a)],_0x92765[_0x541b15(0x26d)]))return;if(_0x92765[_0x541b15(0x204)](_0x81e21f['key'],_0x92765['JOhQs'])){_0x81e21f[_0x541b15(0x275)+_0x541b15(_0x28548a._0x12cfb8)](),closeMenu();try{btn[_0x541b15(_0x28548a._0x1e343b)]();}catch(_0x3cfd40){}}}),window[_0x1e4fc9(0x246)+_0x1e4fc9(0x26e)](_0x1e4fc9(0x1bd),()=>{const _0x3b9e11={_0x2c61b6:0x243,_0x2e1c46:0x24a},_0x55c673=_0x1e4fc9,_0x29b6dc={'jnvzl':_0x55c673(_0x3b9e11._0x2c61b6),'eRSmy':function(_0x247858){return _0x247858();}};if(menu['style'][_0x55c673(_0x3b9e11._0x2e1c46)]===_0x29b6dc['jnvzl'])_0x29b6dc['eRSmy'](positionMenu);}),window[_0x1e4fc9(0x246)+_0x1e4fc9(0x26e)](_0x1e4fc9(0x238),_0x1129cf=>{const _0x5bd806={_0x10a691:0x1f4,_0xc9159d:0x1d9,_0x35de21:0x22c},_0x5bda39=_0x1e4fc9,_0x4eeea9={'wlyJk':function(_0x4f471d,_0x7e7cba){return _0x4f471d!==_0x7e7cba;},'dUMRK':function(_0x1bdc6f){return _0x1bdc6f();}};if(_0x4eeea9[_0x5bda39(0x1cf)](menu[_0x5bda39(0x1e8)]['display'],_0x5bda39(0x243)))return;const _0x117b9c=_0x1129cf&&_0x1129cf[_0x5bda39(_0x5bd806._0x10a691)]?_0x1129cf[_0x5bda39(0x1f4)]:null;try{if(_0x117b9c&&(_0x117b9c===menu||menu[_0x5bda39(0x1d9)]&&menu[_0x5bda39(_0x5bd806._0xc9159d)](_0x117b9c)))return;}catch(_0x5a2fb0){}_0x4eeea9[_0x5bda39(_0x5bd806._0x35de21)](positionMenu);},!![]));}




const _0x103291=_0x515e;(function(_0x178f2f,_0x4303b3){const _0x4d39fb={_0xecc1e7:0x12e,_0x73ae06:0x12c,_0x36f12b:0x10f,_0xf5e059:0x11c,_0x2c99ac:0x126,_0x1b528d:0x144,_0x42e82a:0x141},_0x56c9b6=_0x515e,_0x5a118c=_0x178f2f();while(!![]){try{const _0x5428aa=-parseInt(_0x56c9b6(_0x4d39fb._0xecc1e7))/(0x1*-0x259c+-0x1a81+-0x2*-0x200f)*(parseInt(_0x56c9b6(0x118))/(0x11f0+-0xd3*0x19+0x2ad))+parseInt(_0x56c9b6(_0x4d39fb._0x73ae06))/(-0x6*0x1e+-0x2485*-0x1+-0x23ce)+parseInt(_0x56c9b6(_0x4d39fb._0x36f12b))/(-0x1639+-0x156f+-0x8bc*-0x5)*(-parseInt(_0x56c9b6(0x12d))/(-0x24a1+0x4*0x603+0x64d*0x2))+-parseInt(_0x56c9b6(_0x4d39fb._0xf5e059))/(0x723+-0x911+-0x2*-0xfa)+parseInt(_0x56c9b6(0x13d))/(0x3*-0x6ad+-0x266d+0xb*0x551)*(parseInt(_0x56c9b6(_0x4d39fb._0x2c99ac))/(0x15*0x6b+0x3*0x4a7+-0x16b4))+parseInt(_0x56c9b6(_0x4d39fb._0x1b528d))/(-0xd0b+0x10*0x72+0x5f4)+parseInt(_0x56c9b6(_0x4d39fb._0x42e82a))/(0x16f7+0x2410+-0x1*0x3afd);if(_0x5428aa===_0x4303b3)break;else _0x5a118c['push'](_0x5a118c['shift']());}catch(_0x41f284){_0x5a118c['push'](_0x5a118c['shift']());}}}(_0x26a0,-0x9dff9+-0x2*0x2343a+-0x22*-0xc218));const _0x4b6f38=(function(){let _0xb0a05c=!![];return function(_0x2b330e,_0x565293){const _0x10c479=_0xb0a05c?function(){const _0x2d6435=_0x515e;if(_0x565293){const _0xf558b2=_0x565293[_0x2d6435(0x11f)](_0x2b330e,arguments);return _0x565293=null,_0xf558b2;}}:function(){};return _0xb0a05c=![],_0x10c479;};}()),_0x2cc19d=_0x4b6f38(this,function(){const _0x303248={_0x5ab8e8:0x13f},_0x112c51=_0x515e,_0x43a353={'mkTIM':_0x112c51(_0x303248._0x5ab8e8)+'+$'};return _0x2cc19d[_0x112c51(0x132)]()['search'](_0x43a353[_0x112c51(0x11b)])['toString']()['constructo'+'r'](_0x2cc19d)['search'](_0x43a353['mkTIM']);});_0x2cc19d();ui[_0x103291(0x140)+'ginBtn']&&ui[_0x103291(0x120)+'Input']&&ui[_0x103291(0x140)+_0x103291(0x138)][_0x103291(0x114)+_0x103291(0x13c)](_0x103291(0x13a),()=>{const _0x2ed085={_0x1c45b4:0x117,_0x12b11f:0x134,_0xe49e3e:0x120,_0x152712:0x13a},_0x3554e3=_0x103291;ui['pluginFile'+_0x3554e3(_0x2ed085._0x1c45b4)][_0x3554e3(_0x2ed085._0x12b11f)]='',ui[_0x3554e3(_0x2ed085._0xe49e3e)+_0x3554e3(0x117)][_0x3554e3(_0x2ed085._0x152712)]();});ui[_0x103291(0x120)+_0x103291(0x117)]&&ui[_0x103291(0x120)+_0x103291(0x117)]['addEventLi'+'stener'](_0x103291(0x12b),async _0x2344c8=>{const _0x5badc4={_0x3e840e:0x111,_0x47e96b:0x149,_0x2f283e:0x11d,_0x5295f4:0x135},_0x586477=_0x103291,_0x2d09dd={'cwHoX':function(_0x514bc7,_0x138fcb){return _0x514bc7(_0x138fcb);},'inUJR':function(_0x5bf62){return _0x5bf62();}},_0x5ac180=_0x2344c8&&_0x2344c8['target']&&_0x2344c8[_0x586477(_0x5badc4._0x3e840e)][_0x586477(0x149)]?_0x2344c8[_0x586477(_0x5badc4._0x3e840e)][_0x586477(_0x5badc4._0x47e96b)][0x491+-0x3d9*0x1+-0xb8]:null;if(!_0x5ac180)return;const _0x232b09=await _0x2d09dd[_0x586477(_0x5badc4._0x2f283e)](readFileText,_0x5ac180);await installPluginRecord({'name':_0x5ac180[_0x586477(_0x5badc4._0x5295f4)]||'plugin.js','code':_0x232b09}),await _0x2d09dd[_0x586477(0x12a)](renderPluginsDialog);});ui[_0x103291(0x140)+'ginFolderB'+'tn']&&ui[_0x103291(0x136)+'erInput']&&ui[_0x103291(0x140)+_0x103291(0x130)+'tn']['addEventLi'+'stener']('click',()=>{const _0x1fae60=_0x103291;ui[_0x1fae60(0x136)+'erInput'][_0x1fae60(0x134)]='',ui[_0x1fae60(0x136)+_0x1fae60(0x113)]['click']();});ui[_0x103291(0x136)+_0x103291(0x113)]&&ui[_0x103291(0x136)+'erInput'][_0x103291(0x114)+_0x103291(0x13c)]('change',async _0x892a04=>{const _0xff4acc={_0x4cb564:0x119,_0x42170f:0x10b,_0x139111:0x111,_0x13037d:0x149,_0x194e8f:0x112,_0x44e15b:0x122,_0x4b28ef:0x127,_0x95b98d:0x146,_0x1037df:0x146,_0x1c01fd:0x121,_0x17df67:0x147,_0x76c73e:0x135,_0x323b0b:0x137,_0x3ae73f:0x110,_0x34acab:0x13e},_0x4aae9b=_0x103291,_0xd3b219={'oBCcz':function(_0x2265f5,_0x420aab){return _0x2265f5(_0x420aab);},'WNrLk':_0x4aae9b(0x10c)+_0x4aae9b(_0xff4acc._0x4cb564)+'n\x20folder','cjDNJ':function(_0x17d147,_0x2192fe){return _0x17d147(_0x2192fe);},'yWcrL':function(_0x3a218a,_0xdb5d64){return _0x3a218a(_0xdb5d64);},'EmARo':_0x4aae9b(_0xff4acc._0x42170f),'iyjlK':function(_0x1cb177,_0xa2a4c4){return _0x1cb177(_0xa2a4c4);},'HeDOd':function(_0x202495){return _0x202495();}},_0x497539=_0x892a04&&_0x892a04[_0x4aae9b(_0xff4acc._0x139111)]&&_0x892a04['target'][_0x4aae9b(_0xff4acc._0x13037d)]?Array[_0x4aae9b(_0xff4acc._0x194e8f)](_0x892a04['target'][_0x4aae9b(0x149)]):[];if(!_0x497539[_0x4aae9b(0x131)])return;_0x497539['sort']((_0x4014c7,_0x1d467c)=>String(_0x4014c7[_0x4aae9b(0x127)+_0x4aae9b(0x146)]||_0x4014c7[_0x4aae9b(0x135)]||'')[_0x4aae9b(0x12f)+_0x4aae9b(0x142)](String(_0x1d467c[_0x4aae9b(0x127)+_0x4aae9b(0x146)]||_0x1d467c[_0x4aae9b(0x135)]||'')));const _0x16f074=_0x497539[_0x4aae9b(0x148)](_0x4e8d6f=>_0x4e8d6f&&_0x4e8d6f['name']&&/\.m?js$/i[_0x4aae9b(0x11a)](_0x4e8d6f[_0x4aae9b(0x135)]));if(!_0x16f074['length']){_0xd3b219[_0x4aae9b(0x122)](setStatus,_0xd3b219['WNrLk']);return;}let _0x2578d9=0x1891+-0x33*0x2a+-0x1033;for(const _0x5ca968 of _0x16f074){const _0x5988bb=await _0xd3b219[_0x4aae9b(_0xff4acc._0x44e15b)](readFileText,_0x5ca968),_0x2a584a=_0x5ca968[_0x4aae9b(_0xff4acc._0x4b28ef)+_0x4aae9b(_0xff4acc._0x95b98d)]&&_0xd3b219[_0x4aae9b(0x124)](String,_0x5ca968[_0x4aae9b(_0xff4acc._0x4b28ef)+_0x4aae9b(_0xff4acc._0x1037df)])[_0x4aae9b(_0xff4acc._0x1c01fd)]()?_0xd3b219[_0x4aae9b(_0xff4acc._0x17df67)](String,_0x5ca968[_0x4aae9b(_0xff4acc._0x4b28ef)+_0x4aae9b(0x146)])[_0x4aae9b(_0xff4acc._0x1c01fd)]():_0x5ca968[_0x4aae9b(_0xff4acc._0x76c73e)]||_0xd3b219[_0x4aae9b(0x143)];await _0xd3b219['iyjlK'](installPluginRecord,{'name':_0x2a584a,'code':_0x5988bb}),_0x2578d9++;}await _0xd3b219[_0x4aae9b(_0xff4acc._0x323b0b)](renderPluginsDialog),setStatus(_0x4aae9b(0x10e)+_0x2578d9+(_0x4aae9b(_0xff4acc._0x3ae73f)+_0x4aae9b(_0xff4acc._0x34acab)+'er'));});function _0x515e(_0x450ae0,_0x1ec27d){_0x450ae0=_0x450ae0-(-0x25a9+0x15a0+-0x2*-0x88a);const _0x2c7bad=_0x26a0();let _0x515ded=_0x2c7bad[_0x450ae0];if(_0x515e['dKJFBe']===undefined){var _0x38d6ea=function(_0x1aca6a){const _0x383182='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';let _0x52a49b='',_0x100ac5='',_0x2ceefa=_0x52a49b+_0x38d6ea;for(let _0x11f59e=0x1b98+-0x1c4+-0x19d4,_0x159a73,_0x43da14,_0x106bed=-0x1*0xdbf+-0x42a+-0x28f*-0x7;_0x43da14=_0x1aca6a['charAt'](_0x106bed++);~_0x43da14&&(_0x159a73=_0x11f59e%(-0x16d7+0xb02*-0x2+0x2cdf)?_0x159a73*(-0x25*0xe5+0x18*0x10b+0x851)+_0x43da14:_0x43da14,_0x11f59e++%(0x19b0+0x1*-0x2413+0xa67))?_0x52a49b+=_0x2ceefa['charCodeAt'](_0x106bed+(-0x4f6*0x1+-0x1*0xe99+0x1399*0x1))-(-0x1*0x112f+-0x5c3+0x16fc)!==0x4*-0x52f+-0x2b*0x89+0xe95*0x3?String['fromCharCode'](-0xc41+0x59*0xd+0x8bb&_0x159a73>>(-(-0x1*-0x511+0x21b8+-0x26c7)*_0x11f59e&0x1c75+-0x276*-0x3+-0xad*0x35)):_0x11f59e:-0xbb*-0x33+0x33+-0x2574){_0x43da14=_0x383182['indexOf'](_0x43da14);}for(let _0x1aa382=0xbf7*0x1+-0x11a1+-0x1*-0x5aa,_0x3def19=_0x52a49b['length'];_0x1aa382<_0x3def19;_0x1aa382++){_0x100ac5+='%'+('00'+_0x52a49b['charCodeAt'](_0x1aa382)['toString'](-0x2019+0xc*-0x23d+-0x209*-0x1d))['slice'](-(-0xd36+0x1b*-0xd6+-0x2*-0x11e5));}return decodeURIComponent(_0x100ac5);};_0x515e['JMOxyg']=_0x38d6ea,_0x515e['Geokqi']={},_0x515e['dKJFBe']=!![];}const _0x16266d=_0x2c7bad[0x24f5*-0x1+0x1*-0x1c45+-0x17*-0x2d6],_0x2fbde6=_0x450ae0+_0x16266d,_0x4fb1cc=_0x515e['Geokqi'][_0x2fbde6];if(!_0x4fb1cc){const _0x76967c=function(_0x362bf7){this['RifcwF']=_0x362bf7,this['ZQBKrz']=[0x241*-0x11+-0x1475+0x3ac7,0x174e+-0xfa2+-0x4*0x1eb,0x1ce+0x3ca+-0x598],this['ogqXhp']=function(){return'newState';},this['ugAjEF']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*',this['gBaaBY']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x76967c['prototype']['xHGIhr']=function(){const _0x4a79a6=new RegExp(this['ugAjEF']+this['gBaaBY']),_0x6a2d04=_0x4a79a6['test'](this['ogqXhp']['toString']())?--this['ZQBKrz'][-0x2*0x281+-0x5ad*-0x6+-0x1d0b]:--this['ZQBKrz'][-0x26bf+-0x24ac+0x2b*0x1c1];return this['wBZuCW'](_0x6a2d04);},_0x76967c['prototype']['wBZuCW']=function(_0x57363b){if(!Boolean(~_0x57363b))return _0x57363b;return this['kbQCmS'](this['RifcwF']);},_0x76967c['prototype']['kbQCmS']=function(_0x4b271e){for(let _0x4750da=0x60b+0x2303*-0x1+0x26a*0xc,_0x3b8b83=this['ZQBKrz']['length'];_0x4750da<_0x3b8b83;_0x4750da++){this['ZQBKrz']['push'](Math['round'](Math['random']())),_0x3b8b83=this['ZQBKrz']['length'];}return _0x4b271e(this['ZQBKrz'][-0x844+-0x1b3*-0x3+0x32b]);},new _0x76967c(_0x515e)['xHGIhr'](),_0x515ded=_0x515e['JMOxyg'](_0x515ded),_0x515e['Geokqi'][_0x2fbde6]=_0x515ded;}else _0x515ded=_0x4fb1cc;return _0x515ded;}function _0x26a0(){const _0x1943de=['BuXZC1C','DMfSDwu','BMfTzq','CgX1z2LUrM9Sza','sgvet2q','z2LUqNrU','CenfEg8','y2XPy2S','ihbSDwDPBNmGzG','C3rLBMvY','ntq1mtGXDfHoBvPL','igzYB20GzM9Sza','kcGOlISPkYKRkq','Aw5ZDgfSBfbSDq','mJqYmdy3mdb4sLPND04','yxjL','rw1buM8','mZe5mZGZmeHbD3jzDG','CMvSB2fK','DgL2zvbHDgG','EvDJCKW','zMLSDgvY','zMLSzxm','CgX1z2LUlMPZ','tM8GlMPZigzPBa','y2XLyxjqBhvNAq','sw5ZDgfSBgvKia','mtmYoty0ohfJs0nmAG','ihbSDwDPBIHZkq','DgfYz2v0','zNjVBq','zxjjBNb1Da','ywrKrxzLBNrmAq','igjLihvUzg9Uzq','uMvTB3zLigfSBa','sw5WDxq','mJiYmde4qxzPuLzh','zxmGzM91BMqGAq','DgvZDa','BwTusu0','nZGZndu4nfbwBNj6zW','y3DiB1G','CM9TihrOAxmGyG','yxbWBhK','CgX1z2LUrMLSzq','DhjPBq','B0jdy3O','igLUC3rHBgXLza','y2PetKO','CM93C2vYpWOkva','mtiWtwzfsg91','D2vIA2L0uMvSyq','yMfTAxu','BNncDg4','Aw5vsLi','y2HHBMDL','mZmZmdG0uNLOC2Xy','mJbosgLnsNK','nNPfqvfdyG','Bg9JywXLq29TCa','z2LUrM9SzgvYqG','BgvUz3rO','Dg9tDhjPBMC'];_0x26a0=function(){return _0x1943de;};return _0x26a0();}ui[_0x103291(0x10d)+_0x103291(0x129)]&&ui['clearPlugi'+_0x103291(0x129)][_0x103291(0x114)+_0x103291(0x13c)](_0x103291(0x13a),async()=>{const _0x2892e5={_0x2421e8:0x13b,_0x441fa6:0x125,_0x9d3a7d:0x115,_0x49191e:0x133},_0x3961cd=_0x103291,_0xc1e0d0={'bamiu':function(_0x8b5a82,_0x1b8814){return _0x8b5a82(_0x1b8814);},'mLssW':_0x3961cd(0x116)+_0x3961cd(0x123)+_0x3961cd(_0x2892e5._0x2421e8)+_0x3961cd(0x11e)+_0x3961cd(_0x2892e5._0x441fa6)+'his\x20cannot'+_0x3961cd(_0x2892e5._0x9d3a7d)+'.','pCExo':function(_0x2a1e9e){return _0x2a1e9e();}},_0x67ef33=_0xc1e0d0[_0x3961cd(0x128)](confirm,_0xc1e0d0[_0x3961cd(_0x2892e5._0x49191e)]);if(!_0x67ef33)return;await _0xc1e0d0[_0x3961cd(0x139)](pluginsClearAll),location[_0x3961cd(0x145)]();});

    ui.settingWordWrap.addEventListener("change", () => {
      state.settings.wordWrap = ui.settingWordWrap.checked;
      applyEditorOptionsFromSettings();
      persistSettings();
    });

    ui.settingMinimap.addEventListener("change", () => {
      state.settings.minimap = ui.settingMinimap.checked;
      applyEditorOptionsFromSettings();
      persistSettings();
    });

    ui.settingFontSize.addEventListener("change", () => {
      state.settings.fontSize = clamp(parseInt(ui.settingFontSize.value || "14", 10), 10, 28);
      applyEditorOptionsFromSettings();
      persistSettings();
    });

    // v2 settings restored into v4
    if (ui.settingAutosave) {
      ui.settingAutosave.addEventListener("change", () => {
        state.settings.autosave = !!ui.settingAutosave.checked;
        persistSettings();
      });
    }

    if (ui.settingLineNumbers) {
      ui.settingLineNumbers.addEventListener("change", () => {
        state.settings.lineNumbers = !!ui.settingLineNumbers.checked;
        applyEditorOptionsFromSettings();
        persistSettings();
      });
    }

    if (ui.settingTabSize) {
      ui.settingTabSize.addEventListener("change", () => {
        state.settings.tabSize = clamp(parseInt(ui.settingTabSize.value || "2", 10), 1, 8);
        applyEditorOptionsFromSettings();
        persistSettings();
      });
    }

    if (ui.settingInsertSpaces) {
      ui.settingInsertSpaces.addEventListener("change", () => {
        state.settings.insertSpaces = !!ui.settingInsertSpaces.checked;
        applyEditorOptionsFromSettings();
        persistSettings();
      });
    }

    if (ui.settingTrimTrailing) {
      ui.settingTrimTrailing.addEventListener("change", () => {
        state.settings.trimTrailing = !!ui.settingTrimTrailing.checked;
        persistSettings();
      });
    }

        ui.clearSessionBtn.addEventListener("click", async (e) => {
      // Shift-click: purge stored docs by name substring (without wiping everything)
      if (e && e.shiftKey) {
        const frag = prompt(
          'Purge stored docs where name contains...\nExamples: "untitled", ".py", "test"\n\nLeave blank to cancel.',
          "untitled"
        );
        if (!frag) return;
        await purgeSessionDocsByNameFragment(frag);
        location.reload();
        return;
      }

      // Normal click: wipe everything
      await clearSessionDocs();
      location.reload();
    });


    ui.fileInput.addEventListener("change", async (e) => {
      const files = (e.target && e.target.files) ? Array.from(e.target.files) : [];
      if (files.length === 0) return;

      for (const f of files) {
        const r = new FileReader();
        await new Promise((resolve) => {
          r.onload = async (ev2) => {
            const text = String(ev2.target.result || "");
            const lang = inferLanguageFromFilename(f.name);
            const tab = await createTab({ name: f.name, content: text, language: lang, handle: null });
            state.activeId = tab.id;
            resolve();
          };
          r.readAsText(f);
        });
      }

      renderTabs();
      setActiveTab(state.activeId);
      setStatus("Opened");
    });

    ui.compareFileInput.addEventListener("change", async (e) => {
      const files = (e.target && e.target.files) ? Array.from(e.target.files) : [];
      const f = files[0];
      if (!f) return;

      const r = new FileReader();
      r.onload = async (ev2) => {
        const text = String(ev2.target.result || "");
        await setCompareModelFromText(f.name || "compare", text, null);
        setStatus("Compare loaded");
      };
      r.readAsText(f);
    });

    window.addEventListener("keydown", (e) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (!mod) return;

      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (e.shiftKey) saveAsActive();
        else saveActive();
      }

      if (e.key.toLowerCase() === "o") {
        e.preventDefault();
        openFiles();
      }

      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        newTab();
      }
    });
  }

  // ---------------------------
  // Boot
  // ---------------------------
  window.bootMoonskaiEditor = async function bootMoonskaiEditor() {
        try {
      defineMoonskaiDarkTheme();
      // Load settings
      loadSettingsFromStorage();
      applyTheme();
      applyEditorOptionsFromSettings();
      hydrateSettingsUI();
      updateEolUI();

      // Language select list
                 state.languages = [
        { id: "plaintext", label: "Plain text" },

        { id: "javascript", label: "JavaScript" },
        { id: "typescript", label: "TypeScript" },
        { id: "html", label: "HTML" },
        { id: "ejs", label: "EJS" },
        { id: "css", label: "CSS" },
        { id: "scss", label: "SCSS" },
        { id: "less", label: "Less" },

        { id: "python", label: "Python" },
        { id: "java", label: "Java" },
        { id: "c", label: "C" },
        { id: "cpp", label: "C++" },
        { id: "csharp", label: "C#" },
        { id: "go", label: "Go" },
        { id: "rust", label: "Rust" },
        { id: "php", label: "PHP" },
        { id: "ruby", label: "Ruby" },
        { id: "lua", label: "Lua" },
        { id: "kotlin", label: "Kotlin" },
        { id: "swift", label: "Swift" },

        { id: "json", label: "JSON" },
        { id: "yaml", label: "YAML" },
        { id: "xml", label: "XML" },
        { id: "sql", label: "SQL" },
        { id: "markdown", label: "Markdown" },

        { id: "shell", label: "Shell" },
        { id: "powershell", label: "PowerShell" },
        { id: "bat", label: "Batch" },
        { id: "dockerfile", label: "Dockerfile" },
      ];

      ui.languageSelect.innerHTML = state.languages.map(l => `<option value="${l.id}">${l.label}</option>`).join("");

      // Create Monaco editors
            editor = monaco.editor.create(ui.editorLeftEl, {
        automaticLayout: false,
        language: "plaintext",
        theme: state.settings.theme || "moonskai-dark",
        minimap: { enabled: !!state.settings.minimap },
        wordWrap: state.settings.wordWrap ? "on" : "off",
        fontSize: clamp(state.settings.fontSize, 10, 28),
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        value: ""
      });

      // COMPARE editor (right) — read-only by default (slave)
      state.compare.model = monaco.editor.createModel("", "plaintext");

      editorCompare = monaco.editor.create(ui.editorRightEl, {
        automaticLayout: false,
        model: state.compare.model,
        minimap: { enabled: !!state.settings.minimap },
        wordWrap: state.settings.wordWrap ? "on" : "off",
        fontSize: clamp(state.settings.fontSize, 10, 28),
        readOnly: !!state.settings.compareReadOnly,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
      });

      // Keep status updated
      updateCompareUI();

      // Scroll lock: left drives right (master -> slave)
      editor.onDidScrollChange(() => {
        if (state.scrollLock.enabled && state.view.mode === "split") {
          syncCompareScrollFromMaster();
        }
      });

      const ro = new ResizeObserver(() => {
        if (!editor) return;
        editor.layout();
        if (editorCompare) editorCompare.layout();
        if (diffEditor) diffEditor.layout();
      });
      ro.observe(ui.editorWrap);

      editor.onDidChangeCursorPosition(() => updateCursorUI());
            editor.onDidChangeModelContent(() => {
        const t = activeTab();
        if (!t) return;
        t.dirty = true;
        updateDirtyUI();
        renderTabs();
        persistSessionSoon();
        autosaveActiveSoon();
      });


            // Session load (tabs)
      await loadSession();

      // If no stored docs, create a default tab
      if (!state.tabs.length) {
        const tab = await createTab({
          name: "untitled",
          content: "",
          language: "plaintext",
          handle: null
        });
        state.activeId = tab.id;
        editor.setModel(tab.model);
        renderTabs();
        updateDirtyUI();
      }
      // Apply settings that require live editor/model instances (line numbers, indentation, etc.)
      applyEditorOptionsFromSettings();

      // Set language select to active tab language
      const t = activeTab();
      if (t) ui.languageSelect.value = t.language;

           bindUI();
      setupInstall();

      // v4: split vs single layout toggle (split mode only)
      applySplitLayout();

      // v4: plugin API + load installed plugins
      ensureMoonskaiAPI();
      await loadEnabledPlugins();

      hideBootOverlay();
      setStatus("Ready");
      updateCursorUI();
    } catch (e) {
      showBootError((e && (e.stack || e.message)) ? (e.stack || e.message) : String(e));
    }
  };
  // ---------------------------
  // v4 Split layout (single vs split)
  // ---------------------------
  function applySplitLayoutClass() {
    const isDiff = (typeof isDiffMode === "function") ? isDiffMode() : false;
    const layout = (state && state.view && state.view.layout) ? state.view.layout : "split";
    const isSingle = layout === "single";

    if (ui && ui.splitWrap) ui.splitWrap.classList.toggle("single", isSingle);

    const disableSplitControls = isDiff || isSingle;
    if (ui && ui.scrollLock) ui.scrollLock.disabled = disableSplitControls;
    if (ui && ui.lockMode) ui.lockMode.disabled = disableSplitControls;

    // If controls are disabled, turn off scroll lock to avoid stale state
    if (disableSplitControls && state && state.scrollLock && state.scrollLock.enabled) {
      state.scrollLock.enabled = false;
      try { ui.scrollLock && ui.scrollLock.setAttribute("aria-pressed", "false"); } catch (_) {}
    }

    updateViewToggleUI();
  }

  function applySplitLayout() {
    applySplitLayoutClass();
    requestAnimationFrame(() => {
      try { editor && editor.layout && editor.layout(); } catch (_) {}
      try { editorCompare && editorCompare.layout && editorCompare.layout(); } catch (_) {}
      try { diffEditor && diffEditor.layout && diffEditor.layout(); } catch (_) {}
    });
  }

  function toggleSplitLayout() {
    if (!state.view) state.view = {};
    const cur = state.view.layout || "split";
    state.view.layout = (cur === "single") ? "split" : "single";
    applySplitLayout();
  }

  function updateViewToggleUI() {
    if (!ui || !ui.viewToggle) return;
    const isDiff = (typeof isDiffMode === "function") ? isDiffMode() : false;
    const isSingle = state && state.view && state.view.layout === "single";

    ui.viewToggle.disabled = isDiff;
    try { ui.viewToggle.setAttribute("aria-pressed", (!isDiff && isSingle) ? "true" : "false"); } catch (_) {}
    ui.viewToggle.textContent = isSingle ? "Split View" : "Single View";
    ui.viewToggle.title = isDiff
      ? "View toggle disabled in Diff mode"
      : (isSingle ? "Show split view (master + compare)" : "Show single view (master only)");
  }

  function getActiveEditor() {
    // Plugins + commands should act on the editable editor
    try {
      if (typeof isDiffMode === "function" && isDiffMode() && diffEditor) {
        return diffEditor.getOriginalEditor();
      }
    } catch (_) {}
    return editor;
  }

})(); 
