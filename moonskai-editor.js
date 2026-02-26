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

  async function pluginsList() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PLUGINS, "readonly");
      const st = tx.objectStore(STORE_PLUGINS);
      const req = st.getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result || []);
    });
  }

  async function pluginsPut(plugin) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PLUGINS, "readwrite");
      const st = tx.objectStore(STORE_PLUGINS);
      const req = st.put(plugin);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(true);
    });
  }

  async function pluginsDelete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PLUGINS, "readwrite");
      const st = tx.objectStore(STORE_PLUGINS);
      const req = st.delete(id);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(true);
    });
  }

  async function pluginsClearAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PLUGINS, "readwrite");
      const st = tx.objectStore(STORE_PLUGINS);
      const req = st.clear();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(true);
    });
  }


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
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> 0;
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

    for (const t of state.tabs) {
      const el = document.createElement("div");
      el.className = `tab${t.id === state.activeId ? " active" : ""}${t.dirty ? " dirty" : ""}`;
      el.setAttribute("data-id", t.id);

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
      // ---------------------------
  // v4 Split layout (single vs split)
  // ---------------------------
  function applySplitLayoutClass() {
    const isDiff = isDiffMode();
    const layout = (state.view && state.view.layout) ? state.view.layout : "split";
    const isSingle = layout === "single";

    if (ui.splitWrap) ui.splitWrap.classList.toggle("single", isSingle);

    const disableSplitControls = isDiff || isSingle;
    if (ui.scrollLock) ui.scrollLock.disabled = disableSplitControls;
    if (ui.lockMode) ui.lockMode.disabled = disableSplitControls;

    if (disableSplitControls && state.scrollLock.enabled) {
      state.scrollLock.enabled = false;
      if (ui.scrollLock) ui.scrollLock.setAttribute("aria-pressed", "false");
    }

    updateViewToggleUI();
  }

  function applySplitLayout() {
    applySplitLayoutClass();
    requestAnimationFrame(() => {
      try { editor && editor.layout(); } catch (_) {}
      try { editorCompare && editorCompare.layout(); } catch (_) {}
    });
  }

  function toggleSplitLayout() {
    const cur = (state.view && state.view.layout) ? state.view.layout : "split";
    state.view.layout = (cur === "single") ? "split" : "single";
    applySplitLayout();
  }

  function updateViewToggleUI() {
    if (!ui.viewToggle) return;
    const isDiff = isDiffMode();
    const isSingle = (state.view && state.view.layout) === "single";
    ui.viewToggle.disabled = isDiff;
    ui.viewToggle.setAttribute("aria-pressed", (!isDiff && isSingle) ? "true" : "false");
    ui.viewToggle.textContent = isSingle ? "Split View" : "Single View";
    ui.viewToggle.title = isDiff ? "View toggle disabled in Diff mode" : (isSingle ? "Show split view (master + compare)" : "Show single view (master only)");
  }

  function getActiveEditor() {
    if (isDiffMode() && diffEditor) {
      try { return diffEditor.getOriginalEditor(); } catch (_) {}
    }
    return editor;
  }

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
  function readFileText(file) {
    if (!file) return Promise.resolve("");
    try {
      if (typeof file.text === "function") return file.text();
    } catch (_) {}
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = (ev) => resolve(String(ev && ev.target ? ev.target.result : "") || "");
      r.onerror = () => resolve("");
      r.readAsText(file);
    });
  }

  function makePluginId() {
    return "plug-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
  }

  function extractPluginMetaFromCode(code) {
    const meta = { name: "", description: "" };
    const src = String(code || "");
    const head = src.split(/\r?\n/).slice(0, 60);

    for (const line of head) {
      let m = line.match(/^\s*\/\/\s*Name\s*:\s*(.+)\s*$/i);
      if (m && m[1] && !meta.name) meta.name = m[1].trim();

      m = line.match(/^\s*\/\/\s*Description\s*:\s*(.+)\s*$/i);
      if (m && m[1] && !meta.description) meta.description = m[1].trim();

      if (meta.name && meta.description) break;
    }
    return meta;
  }

    function ensureMoonskaiAPI() {
    const existing = window.Moonskai || {};
    if (existing && existing.__moonskaiReady) return;

    const api = existing;
    api.__moonskaiReady = true;
    api.version = "4";

    function augmentEditor(ed) {
      if (!ed || ed.__moonskaiAugmented) return;
      try {
        Object.defineProperty(ed, "__moonskaiAugmented", { value: true, configurable: true });
      } catch (_) {
        ed.__moonskaiAugmented = true;
      }

      // Some plugins were written against older editor APIs (CodeMirror-ish).
      if (typeof ed.getValue !== "function") {
        ed.getValue = () => {
          try { return ed.getModel() ? ed.getModel().getValue() : ""; } catch (_) { return ""; }
        };
      }
      if (typeof ed.setValue !== "function") {
        ed.setValue = (v) => {
          try { const m = ed.getModel(); if (m) m.setValue(String(v ?? "")); } catch (_) {}
        };
      }
    }

    Object.defineProperty(api, "editor", {
      get: () => {
        const ed = getActiveEditor();
        augmentEditor(ed);
        return ed;
      }
    });
    Object.defineProperty(api, "compareEditor", {
      get: () => {
        augmentEditor(editorCompare);
        return editorCompare;
      }
    });
    Object.defineProperty(api, "isDiffMode", { get: () => isDiffMode() });

    // Simple logger helpers for plugins written against older versions.
    api.log = api.log || ((...args) => console.log("[Moonskai]", ...args));
    api.warn = api.warn || ((...args) => console.warn("[Moonskai]", ...args));
    api.error = api.error || ((...args) => console.error("[Moonskai]", ...args));

    // Useful helpers for plugins
    api.showStatus = (msg) => setStatus(String(msg || ""));
    api.monaco = window.monaco;

    api.setCompareText = async (name, text) => {
      await setCompareModelFromText(String(name || "compare"), String(text ?? ""), null);
    };
    api.clearCompare = () => clearCompareFile();
    api.setViewMode = (mode) => setViewMode(String(mode || "split"));
    api.toggleDiffMode = () => setViewMode(isDiffMode() ? "split" : "diff");
    // ---- Minimal helpers for API plugins (no core behavior changes) ----
    api.fetch = (...args) => fetch(...args);

    api.requestJSON = async (url, opts = {}) => {
      const res = await fetch(url, opts);
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch (_) {}
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        err.body = (json !== null ? json : text);
        throw err;
      }
      return (json !== null ? json : text);
    };

    api.getSelectionText = () => {
      try {
        const ed = api.editor;
        const m = ed && ed.getModel ? ed.getModel() : null;
        const sel = ed && ed.getSelection ? ed.getSelection() : null;
        if (!m || !sel) return "";
        return m.getValueInRange(sel);
      } catch (_) { return ""; }
    };

    api.replaceSelection = (text) => {
      try {
        const ed = api.editor;
        const sel = ed && ed.getSelection ? ed.getSelection() : null;
        if (!sel) return;
        ed.executeEdits("moonskai-plugin", [{ range: sel, text: String(text ?? ""), forceMoveMarkers: true }]);
        ed.focus();
      } catch (_) {}
    };

    // Plugin-scoped persistent storage (IndexedDB kv)
    function __pluginKey(k) {
      const meta = api.__loadingPlugin || null;
      const pid = meta && meta.id ? String(meta.id) : "global";
      return `plugin:${pid}:${String(k || "")}`;
    }
    api.storageGet = async (k) => await kvGet(__pluginKey(k));
    api.storageSet = async (k, v) => await kvSet(__pluginKey(k), v);

    // Registry for plugin actions (used by the plugin dropdown)
    api._pluginActions = api._pluginActions || new Map();

    function currentPluginMeta() {
      const m = api.__loadingPlugin || null;
      return m && typeof m === "object" ? m : null;
    }

    // Back-compat: plugins call addToolbarButton(), but in v4 we route them into the plugin dropdown.
    api.addToolbarButton = function (id, label, onClick, opts) {
      const actionId = String(id || "").trim() || ("plugin-act-" + makePluginId());
      const text = String(label || "Plugin");
      const fn = (typeof onClick === "function") ? onClick : null;

      const meta = currentPluginMeta();
      const descRaw =
        (opts && (opts.description || opts.desc || opts.title)) ||
        (meta && meta.description) ||
        "";
      const desc = descRaw ? String(descRaw) : "";

      api._pluginActions.set(actionId, {
        id: actionId,
        label: text,
        run: fn,
        description: desc,
        plugin: meta && meta.name ? String(meta.name) : ""
      });

      const sel = ui.pluginSelect || document.getElementById("pluginSelect");
      if (sel) {
        // Replace if already exists
        for (let i = sel.options.length - 1; i >= 0; i--) {
          if (sel.options[i] && sel.options[i].value === actionId) sel.remove(i);
        }
        const opt = document.createElement("option");
        opt.value = actionId;
        opt.textContent = text;
        if (desc) {
          opt.title = desc;
          opt.dataset.desc = desc;
        }
        sel.appendChild(opt);
        return opt;
      }

      // Fallback (older HTML): create real buttons
      const parent =
        ui.pluginButtons ||
        document.getElementById("pluginButtons") ||
        document.querySelector(".toolbar-actions");
      if (!parent) return null;

      const existingBtn = document.getElementById(actionId);
      if (existingBtn) existingBtn.remove();

      const b = document.createElement("button");
      b.id = actionId;
      b.type = "button";
      b.className = "btn";
      b.textContent = text;
      if (desc) b.title = desc;
      if (fn) b.addEventListener("click", fn);
      parent.appendChild(b);
      return b;
    };

    // Alias for clarity in new plugins
    api.addMenuItem = api.addToolbarButton;

    // Back-compat: some plugins use registerCommand() (we expose it into the same dropdown)
    api.registerCommand = function (id, label, onRun, opts) {
      return api.addToolbarButton(id, label, onRun, opts);
    };

    window.Moonskai = api;
  }

    function runPlugin(plugin) {
    const api = window.Moonskai;

    // Extract optional metadata from the plugin header (// Name:, // Description:)
    const code = String(plugin && plugin.code ? plugin.code : "");
    const meta = extractPluginMetaFromCode(code);
    meta.fileName = String(plugin && plugin.name ? plugin.name : (plugin && plugin.id ? plugin.id : "plugin"));
    meta.id = String(plugin && plugin.id ? plugin.id : "");
    if (!meta.name) meta.name = meta.fileName;

    try {
      const safeName = meta.fileName.replace(/[^a-zA-Z0-9_\-\.]/g, "_");

      const wrapped = [
        '"use strict";',
        code,
        `\n//# sourceURL=moonskai-plugin-${safeName}.js\n`
      ].join("\n");

      // Let addToolbarButton()/registerCommand() know which plugin is currently registering.
      if (api) api.__loadingPlugin = meta;

      const fn = new Function("Moonskai", wrapped);
      fn(api);

      console.info("[Moonskai] Plugin loaded:", safeName);
    } catch (e) {
      console.error("[Moonskai] Plugin failed:", plugin && plugin.name ? plugin.name : plugin, e);
      try { setStatus("Plugin error: " + (plugin && plugin.name ? plugin.name : "unknown")); } catch (_) {}
    } finally {
      try {
        if (api && api.__loadingPlugin && api.__loadingPlugin.id === meta.id) {
          delete api.__loadingPlugin;
        }
      } catch (_) {}
    }
  }


  async function loadEnabledPlugins() {
    let list = [];
    try { list = await pluginsList(); } catch (_) { list = []; }
    for (const p of list) {
      if (!p) continue;
      if (p.enabled === false) continue;
      runPlugin(p);
    }
  }

  async function installPluginRecord({ name, code }) {
    const rec = {
      id: makePluginId(),
      name: String(name || "plugin.js"),
      code: String(code || ""),
      enabled: true,
      addedAt: Date.now()
    };
    await pluginsPut(rec);

    // Load immediately (no reload needed for install)
    runPlugin(rec);
    setStatus("Plugin installed: " + rec.name);
    return rec;
  }

  async function renderPluginsDialog() {
    if (!ui.pluginList) return;

    let list = [];
    try { list = await pluginsList(); } catch (_) { list = []; }
    list.sort((a, b) => String(a && a.name ? a.name : "").localeCompare(String(b && b.name ? b.name : "")));

    ui.pluginList.innerHTML = "";
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "muted small";
      empty.textContent = "No plugins installed yet.";
      ui.pluginList.appendChild(empty);
      return;
    }

    for (const p of list) {
      const row = document.createElement("div");
      row.className = "plugin-row";

      const meta = document.createElement("div");
      meta.className = "plugin-meta";

      const toggle = document.createElement("label");
      toggle.className = "plugin-toggle";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = (p.enabled !== false);

      const nm = document.createElement("div");
      nm.className = "plugin-name";
      nm.textContent = p.name || p.id;

      cb.addEventListener("change", async () => {
        p.enabled = !!cb.checked;
        await pluginsPut(p);
        location.reload();
      });

      toggle.appendChild(cb);
      toggle.appendChild(nm);
      meta.appendChild(toggle);

      const actions = document.createElement("div");
      actions.className = "plugin-actions";

      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "btn danger";
      rm.textContent = "Remove";
      rm.addEventListener("click", async () => {
        const ok = confirm(`Remove plugin "${p.name || p.id}"?\n\nThis cannot be undone.`);
        if (!ok) return;
        await pluginsDelete(p.id);
        location.reload();
      });

      actions.appendChild(rm);

      row.appendChild(meta);
      row.appendChild(actions);
      ui.pluginList.appendChild(row);
    }
  }

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
    for (const t of state.tabs) {
      state.activeId = t.id;
      editor.setModel(t.model);
      await saveActive();
    }
    setActiveTab(state.activeId);
    setStatus("Saved all");
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
    const pluginSelect =
      ui.pluginSelect ||
      document.getElementById("pluginSelect") ||
      (ui.pluginButtons ? ui.pluginButtons.querySelector("select") : null) ||
      document.querySelector("#pluginButtons select");

    if (pluginSelect) {
      // Native <select><option title="..."> tooltips are inconsistent across browsers.
      // So we hide the select and render a small custom dropdown menu that shows each action + description.
      try { pluginSelect.style.display = "none"; } catch (_) {}

      const wrap = pluginSelect.closest(".select-wrap") || pluginSelect.parentElement || ui.pluginButtons;

      // Inject CSS once
      if (!document.getElementById("msPluginMenuStyle")) {
        const st = document.createElement("style");
        st.id = "msPluginMenuStyle";
        st.textContent = `
          .ms-plugin-menu-btn{appearance:none; cursor:pointer;}
                                        .ms-plugin-menu{
            position:fixed; z-index:9999; display:none;
            min-width:280px; max-width:520px;
            max-height:calc(100vh - 120px);
            overflow-y:auto; overflow-x:hidden;
            -webkit-overflow-scrolling:touch;
            overscroll-behavior:contain;
            background:#0B0F12; color:#E9F6F2;
            border:1px solid #1B2526; border-radius:12px;
            box-shadow:0 14px 40px rgba(0,0,0,.45);
            padding:6px;
          }

          .ms-plugin-item{
            display:block;
            width:100%; text-align:left; background:transparent; border:0; color:inherit;
            padding:10px 10px; border-radius:10px; cursor:pointer;
          }

          .ms-plugin-item:hover{background:#14483B;}
          .ms-plugin-item .lbl{font-size:13px; font-weight:600; line-height:1.2;}
          .ms-plugin-item .desc{font-size:12px; opacity:.85; margin-top:4px; line-height:1.25;}
          .ms-plugin-empty{padding:10px 10px; font-size:12px; opacity:.8;}
        `;
        document.head.appendChild(st);
      }

      // Create button once (replaces the hidden select)
      let btn = wrap ? wrap.querySelector("#pluginMenuBtn") : null;
      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = (pluginSelect.className || "select") + " ms-plugin-menu-btn";
        btn.id = "pluginMenuBtn";
        btn.setAttribute("aria-haspopup", "menu");
        btn.setAttribute("aria-expanded", "false");
        btn.title = "Plugin actions (hover items for details)";
        btn.textContent = "Actions…";
        if (wrap) wrap.appendChild(btn);
      }

      // Create menu once
      let menu = document.getElementById("pluginMenu");
      if (!menu) {
        menu = document.createElement("div");
        menu.className = "ms-plugin-menu";
        menu.id = "pluginMenu";
        menu.setAttribute("role", "menu");
        document.body.appendChild(menu);
                menu.tabIndex = -1;
      }

      function positionMenu() {
        const r = btn.getBoundingClientRect();
        const gap = 8;
        let left = Math.round(r.left);
        let top = Math.round(r.bottom + gap);

        // Measure after it's visible
        const mw = menu.offsetWidth || 320;
        const mh = menu.offsetHeight || 240;

        const maxLeft = Math.max(8, window.innerWidth - mw - 8);
        left = Math.min(left, maxLeft);

        const maxTop = Math.max(8, window.innerHeight - mh - 8);
        top = Math.min(top, maxTop);

        menu.style.left = left + "px";
        menu.style.top = top + "px";
      }

      function closeMenu() {
        menu.style.display = "none";
        try { btn.setAttribute("aria-expanded", "false"); } catch (_) {}
      }

      function buildMenu() {
        menu.innerHTML = "";

        const api = window.Moonskai;
        const actions = api && api._pluginActions ? Array.from(api._pluginActions.values()) : [];
        actions.sort((a, b) =>
          String(a && a.label ? a.label : "").localeCompare(String(b && b.label ? b.label : ""))
        );

        if (!actions.length) {
          const empty = document.createElement("div");
          empty.className = "ms-plugin-empty";
          empty.textContent = "No plugin actions installed yet.";
          menu.appendChild(empty);
          return;
        }

        for (const rec of actions) {
          const label = String(rec && rec.label ? rec.label : rec && rec.id ? rec.id : "Plugin");
          const desc = String(rec && rec.description ? rec.description : "");

          const item = document.createElement("button");
          item.type = "button";
          item.className = "ms-plugin-item";
          item.setAttribute("role", "menuitem");
          item.title = desc || label;

          const lbl = document.createElement("div");
          lbl.className = "lbl";
          lbl.textContent = label;

          const d = document.createElement("div");
          d.className = "desc";
          d.textContent = desc || "No description provided.";

          item.appendChild(lbl);
          item.appendChild(d);

          item.addEventListener("click", () => {
            closeMenu();
            try {
              if (rec && typeof rec.run === "function") {
                rec.run();
                setStatus("Plugin: " + label);
              } else {
                setStatus("Plugin action not found");
              }
            } catch (e) {
              console.error("[Moonskai] Plugin action failed:", rec && rec.id ? rec.id : label, e);
              setStatus("Plugin error");
            }
            try { getActiveEditor() && getActiveEditor().focus(); } catch (_) {}
          });

          menu.appendChild(item);
        }
      }

      function openMenu() {
        buildMenu();
        menu.style.display = "block";
        positionMenu();
        try { btn.setAttribute("aria-expanded", "true"); } catch (_) {}
      }

      // Toggle
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (menu.style.display === "block") closeMenu();
        else openMenu();
      });

      // Close on outside click + Escape
      if (!window.__msPluginMenuWired) {
        window.__msPluginMenuWired = true;

        document.addEventListener("mousedown", (e) => {
          if (menu.style.display !== "block") return;
          if (e.target === btn || btn.contains(e.target)) return;
          if (menu.contains(e.target)) return;
          closeMenu();
        });

        window.addEventListener("keydown", (e) => {
          if (menu.style.display !== "block") return;
          if (e.key === "Escape") {
            e.preventDefault();
            closeMenu();
            try { btn.focus(); } catch (_) {}
          }
        });

        window.addEventListener("resize", () => {
          if (menu.style.display === "block") positionMenu();
        });
                window.addEventListener(
          "scroll",
          (ev) => {
            if (menu.style.display !== "block") return;

            // Ignore scroll events coming from inside the menu itself (otherwise it fights the menu scroll).
            const tgt = ev && ev.target ? ev.target : null;
            try {
              if (tgt && (tgt === menu || (menu.contains && menu.contains(tgt)))) return;
            } catch (_) {}

            positionMenu();
          },
          true
        );

      }
    }




    if (ui.installPluginBtn && ui.pluginFileInput) {
      ui.installPluginBtn.addEventListener("click", () => {
        ui.pluginFileInput.value = "";
        ui.pluginFileInput.click();
      });
    }

    if (ui.pluginFileInput) {
      ui.pluginFileInput.addEventListener("change", async (ev) => {
        const file = ev && ev.target && ev.target.files ? ev.target.files[0] : null;
        if (!file) return;
        const code = await readFileText(file);
        await installPluginRecord({ name: file.name || "plugin.js", code });
        await renderPluginsDialog();
      });
    }
    // Folder install: installs every .js/.mjs file in a selected folder (and subfolders)
    if (ui.installPluginFolderBtn && ui.pluginFolderInput) {
      ui.installPluginFolderBtn.addEventListener("click", () => {
        ui.pluginFolderInput.value = "";
        ui.pluginFolderInput.click();
      });
    }

    if (ui.pluginFolderInput) {
      ui.pluginFolderInput.addEventListener("change", async (ev) => {
        const files = (ev && ev.target && ev.target.files) ? Array.from(ev.target.files) : [];
        if (!files.length) return;

        // deterministic order
        files.sort((a, b) =>
          String(a.webkitRelativePath || a.name || "").localeCompare(String(b.webkitRelativePath || b.name || ""))
        );

        // only .js/.mjs
        const jsFiles = files.filter(f => f && f.name && /\.m?js$/i.test(f.name));
        if (!jsFiles.length) {
          setStatus("No .js files found in folder");
          return;
        }

        let installed = 0;
        for (const f of jsFiles) {
          const code = await readFileText(f);

          // keep folder structure when available
          const name =
            (f.webkitRelativePath && String(f.webkitRelativePath).trim())
              ? String(f.webkitRelativePath).trim()
              : (f.name || "plugin.js");

          await installPluginRecord({ name, code });
          installed++;
        }

        await renderPluginsDialog();
        setStatus(`Installed ${installed} plugin(s) from folder`);
      });
    }
    if (ui.clearPluginsBtn) {
      ui.clearPluginsBtn.addEventListener("click", async () => {
        const ok = confirm("Remove all installed plugins from this browser?\n\nThis cannot be undone.");
        if (!ok) return;
        await pluginsClearAll();
        location.reload();
      });
    }

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
