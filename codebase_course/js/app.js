/* =============================================================================
   subly · Codebase Course — APP ENGINE
   Hash router · gamified state (XP/levels/badges) · block renderer ·
   quiz logic · confetti · lightweight syntax highlighter.
   Vanilla JS, no build step. State persists in localStorage.
============================================================================= */
(function () {
  "use strict";
  const C = window.COURSE;
  // Topical sticker per module (decoration that encodes the subject, not random).
  const MODULE_STICKER = {
    "big-picture": "🗺️", audio: "🎚️", chunking: "✂️", whisper: "🧠",
    clean: "🧹", translate: "🗾", events: "📡", desktop: "🖥️",
  };
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));

  /* ---------------- XP economy ---------------- */
  const XP_LESSON = 15;     // first time you open a lesson section view
  const XP_MODULE = 60;     // finishing all reading in a module
  const XP_QUIZ_Q = 20;     // per correct quiz answer
  const XP_QUIZ_PASS = 60;  // bonus for passing the quiz
  const XP_PERFECT = 50;    // bonus for a flawless quiz
  const PASS_RATIO = 0.6;

  /* ---------------- state ---------------- */
  // Both builds (paper "v1" and blackboard "v2 dark") share ONE progress store
  // so your XP / lessons / quizzes follow you when you switch themes. Older
  // builds wrote to per-page keys; we merge those in once on first load.
  const SAVE_KEY = "subly_course_shared";
  // Older builds (pre-rename + per-theme) stored progress under these keys; we
  // fold them into the new shared store once so nobody loses XP on the rename.
  const LEGACY_KEYS = ["jvs_course_shared", "jvs_course_v1", "jvs_course_v2_dark"];
  const blank = () => ({ xp: 0, lessons: {}, modulesRead: {}, quizzes: {}, badges: {}, seen: false });
  let S = load();
  function readKey(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }
  // Combine two saved states without losing progress: max XP, union of every
  // boolean map, and the "better" quiz result (passed beats not-passed).
  function mergeState(a, b) {
    if (!a) return b ? Object.assign(blank(), b) : null;
    if (!b) return Object.assign(blank(), a);
    const out = Object.assign(blank(), a);
    out.xp = Math.max(a.xp || 0, b.xp || 0);
    out.seen = !!(a.seen || b.seen);
    for (const map of ["lessons", "modulesRead", "badges"]) {
      out[map] = Object.assign({}, a[map], b[map]);
    }
    out.quizzes = Object.assign({}, a.quizzes);
    for (const id in (b.quizzes || {})) {
      const cur = out.quizzes[id], inc = b.quizzes[id];
      if (!cur || (!cur.passed && inc.passed) ||
          (cur.passed === inc.passed && (inc.score || 0) > (cur.score || 0))) {
        out.quizzes[id] = inc;
      }
    }
    return out;
  }
  function load() {
    const shared = readKey(SAVE_KEY);
    if (shared) return Object.assign(blank(), shared);
    // First run on the shared store: fold any legacy per-page progress together.
    let merged = null;
    for (const k of LEGACY_KEYS) merged = mergeState(merged, readKey(k));
    return merged || blank();
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} }

  /* ---------------- progress helpers ---------------- */
  const modById = (id) => C.modules.find((m) => m.id === id);
  const moduleDone = (m) => !!(S.quizzes[m.id] && S.quizzes[m.id].passed);
  function moduleUnlocked(m) {
    const i = C.modules.indexOf(m);
    if (i === 0) return true;
    return moduleDone(C.modules[i - 1]);
  }
  function moduleProgress(m) {
    const total = m.lessons.length + 1; // lessons + quiz
    let done = m.lessons.filter((l) => S.lessons[m.id + "/" + l.id]).length;
    if (moduleDone(m)) done += 1;
    return done / total;
  }
  function overallProgress() {
    const done = C.modules.filter(moduleDone).length;
    return Math.round((done / C.modules.length) * 100);
  }
  function rankFor(xp) {
    let r = C.levels[0], next = null;
    for (let i = 0; i < C.levels.length; i++) {
      if (xp >= C.levels[i].xp) { r = C.levels[i]; next = C.levels[i + 1] || null; }
    }
    return { rank: r, next, idx: C.levels.indexOf(r) };
  }

  /* ---------------- XP + badges ---------------- */
  function addXp(n, label) {
    if (n <= 0) return;
    const before = rankFor(S.xp).rank.rank;
    S.xp += n; save();
    toast("✨", "+" + n + " XP", label || "", "xp");
    const after = rankFor(S.xp);
    if (after.rank.rank !== before) {
      setTimeout(() => toast(after.rank.icon, "Rank up!", after.rank.rank, "xp"), 700);
    }
    renderSidebar();
  }
  function grantBadge(id) {
    if (S.badges[id]) return;
    const b = C.badges.find((x) => x.id === id); if (!b) return;
    S.badges[id] = true; save();
    setTimeout(() => badgeModal(b), 500);
    confettiBurst();
  }
  function checkBadges() {
    const map = {
      "big-picture": "first-steps", audio: "audiophile", chunking: "the-surgeon",
      whisper: "on-device", clean: "ghostbuster", translate: "diplomat",
      events: "contract", desktop: "full-stack",
    };
    C.modules.forEach((m) => { if (moduleDone(m) && map[m.id]) grantBadge(map[m.id]); });
    if (C.modules.every(moduleDone)) grantBadge("the-engineer");
  }

  /* =========================================================================
     ROUTER
  ========================================================================= */
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  window.addEventListener("hashchange", route);

  function route() {
    closeMenu();
    const h = (location.hash || "#/").slice(1);
    const parts = h.split("/").filter(Boolean); // ["module","audio","2"] etc
    const main = $("#view");
    main.style.opacity = 0;
    setTimeout(() => {
      if (parts[0] === "module") {
        const m = modById(parts[1]);
        if (!m || !moduleUnlocked(m)) return renderHome(main);
        if (parts[2] === "quiz") renderQuiz(main, m);
        else renderLesson(main, m, parseInt(parts[2] || "0", 10));
      } else {
        renderHome(main);
      }
      main.style.opacity = 1;
      window.scrollTo(0, 0);
      renderSidebar();
      setAccentFromRoute();
    }, 120);
  }

  function setAccentFromRoute() {
    const h = location.hash.slice(1).split("/").filter(Boolean);
    let accent = "coral";
    if (h[0] === "module") { const m = modById(h[1]); if (m) accent = m.color; }
    document.documentElement.setAttribute("data-accent", accent);
  }

  /* =========================================================================
     SIDEBAR
  ========================================================================= */
  function renderSidebar() {
    const sb = $("#sidebar");
    const { rank, next } = rankFor(S.xp);
    const cur = next ? rank.xp : C.levels[C.levels.length - 1].xp;
    const span = next ? next.xp - rank.xp : 1;
    const into = next ? S.xp - rank.xp : 1;
    const pct = Math.max(4, Math.min(100, Math.round((into / span) * 100)));
    const done = C.modules.filter(moduleDone).length;
    const badges = Object.keys(S.badges).length;

    const activeId = (() => { const h = location.hash.slice(1).split("/").filter(Boolean); return h[0] === "module" ? h[1] : null; })();

    sb.innerHTML = "";
    const brand = el("div", "brand");
    brand.innerHTML = `<div class="brand-logo">字</div><div class="brand-txt"><b>Subly</b><span>codebase course</span></div>`;
    brand.onclick = () => go("#/");
    sb.appendChild(brand);

    const player = el("div", "player");
    player.innerHTML = `
      <div class="player-top">
        <div class="player-rank-icon">${rank.icon}</div>
        <div><div class="player-rank-name">${esc(rank.rank)}</div><div class="player-level">${next ? "Level " + (rankFor(S.xp).idx + 1) : "Max rank reached"}</div></div>
      </div>
      <div class="xp-bar"><div class="xp-fill" style="width:${pct}%"></div></div>
      <div class="xp-meta"><span><b>${S.xp}</b> XP</span><span>${next ? next.xp + " → " + next.rank.split("/")[0] : "★ max"}</span></div>`;
    sb.appendChild(player);

    const stats = el("div", "side-stats");
    stats.innerHTML = `
      <div class="side-stat"><div class="n">${done}<span style="color:var(--tx-faint);font-size:13px">/${C.modules.length}</span></div><div class="l">Modules</div></div>
      <div class="side-stat"><div class="n" style="color:var(--gold-2)">${badges}<span style="color:var(--tx-faint);font-size:13px">/${C.badges.length}</span></div><div class="l">Badges</div></div>`;
    sb.appendChild(stats);

    sb.appendChild(el("div", "side-label", "Curriculum"));
    const nav = el("nav", "nav");
    C.modules.forEach((m) => {
      const unlocked = moduleUnlocked(m), dn = moduleDone(m);
      const item = el("button", "nav-item" + (m.id === activeId ? " active" : "") + (unlocked ? "" : " locked"));
      item.setAttribute("data-accent", m.color);
      item.innerHTML = `
        <div class="nav-num ${dn ? "done" : ""}">${dn ? "✓" : m.num}</div>
        <div class="nav-body"><div class="nav-title">${esc(m.title)}</div><div class="nav-tag">${esc(m.tag)} · ${esc(m.est)}</div></div>
        ${unlocked ? (dn ? '<div class="nav-check">●</div>' : "") : '<div class="nav-lock">🔒</div>'}`;
      if (unlocked) item.onclick = () => go("#/module/" + m.id + "/0");
      else item.onclick = () => toast("🔒", "Locked", "Pass module " + (m.num - 1) + "'s quiz first");
      nav.appendChild(item);
    });
    sb.appendChild(nav);

    const foot = el("div", "side-foot");
    foot.innerHTML = `<div>${overallProgress()}% of the course complete</div><button id="resetBtn">reset progress</button>`;
    sb.appendChild(foot);
    $("#resetBtn", foot).onclick = () => {
      if (confirm("Reset all course progress, XP and badges?")) { S = blank(); save(); go("#/"); renderSidebar(); }
    };

    // top bar progress
    $("#topProgFill").style.width = overallProgress() + "%";
    $("#topProgNum").textContent = overallProgress() + "%";
  }

  /* =========================================================================
     HOME / MAP
  ========================================================================= */
  function renderHome(main) {
    setCrumb([{ t: "Home" }]);
    main.innerHTML = "";
    const v = el("div", "view");

    const hero = el("section", "hero");
    hero.innerHTML = `
      <span class="sticker s1">✏️</span><span class="sticker s2">🚀</span>
      <span class="sticker s3">📖</span><span class="sticker s4">💡</span>
      <div class="stamp">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <defs><path id="stampcirc" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"></path></defs>
          <text><textPath href="#stampcirc" startOffset="0">LEARN THE CODE ✦ SHIP IT ✦ READ EVERY FILE ✦ </textPath></text>
        </svg>
        <div class="stamp-mid">🎓</div>
      </div>
      <div class="hero-badge"><span class="dot"></span> Interactive codebase course · 8 modules</div>
      <h1>
        <span class="w fill-coral">LET'S</span> <span class="w fill-ink">DECODE</span><br>
        <span class="w boxed">JAP·VIDEO·SUB</span> <span class="w kanji">字幕</span><br>
        <span class="w fill-blue">ONE FILE</span> <span class="w fill-ink">AT A</span> <span class="w fill-purple">TIME</span>
      </h1>
      <p class="hero-sub">${esc(C.tagline)} No fluff — real code from every file, gamified so you actually finish.</p>
      <div class="hero-cta">
        <button class="btn btn-primary" id="startBtn">${anyProgress() ? "▶  Continue learning" : "▶  Start Module 1"}</button>
        <button class="btn btn-ghost" id="mapBtn">See the map ↓</button>
      </div>
      <div class="pipeline-strip">
        <span class="ps cyan">① ffmpeg</span><span class="arr">→</span>
        <span class="ps coral">② whisper</span><span class="arr">→</span>
        <span class="ps iris">③ openai</span><span class="arr">→</span>
        <span class="ps" style="background:var(--green);color:#fff">.en.srt</span>
      </div>`;
    v.appendChild(hero);

    const sh = el("div", "section-head");
    sh.innerHTML = `<h2>The curriculum</h2><p>Each module unlocks the next when you pass its quiz. Earn XP, climb ranks, collect badges.</p>`;
    sh.id = "map";
    v.appendChild(sh);

    const grid = el("div", "mods");
    C.modules.forEach((m, i) => {
      const unlocked = moduleUnlocked(m), dn = moduleDone(m), prog = Math.round(moduleProgress(m) * 100);
      const card = el("div", "modcard" + (unlocked ? "" : " locked") + (dn ? " done" : ""));
      card.setAttribute("data-accent", m.color);
      card.style.setProperty("--accent", `var(--${m.color})`);
      card.innerHTML = `
        <div class="modcard-tab"></div>
        <div class="modcard-sticker">${MODULE_STICKER[m.id] || "📦"}</div>
        <div class="modcard-top">
          <div class="modcard-num">${dn ? "✓" : m.num}</div>
          <div><div class="modcard-tag">${esc(m.tag)}</div><h3>${esc(m.title)}</h3></div>
        </div>
        <p>${esc(m.blurb)}</p>
        <div class="modcard-foot">
          <span>◷ ${esc(m.est)}</span><span>·</span><span>${m.lessons.length} lessons</span>
          <span class="pill ${dn ? "ok" : unlocked ? "todo" : "lock"}">${dn ? "✓ done" : unlocked ? "start" : "🔒 locked"}</span>
        </div>
        <div class="mc-prog"><i style="width:${prog}%"></i></div>`;
      if (unlocked) card.onclick = () => go("#/module/" + m.id + "/0");
      else card.onclick = () => toast("🔒", "Locked", "Finish module " + (m.num - 1) + " first");
      grid.appendChild(card);
    });
    v.appendChild(grid);

    // badges
    const bh = el("div", "section-head");
    bh.innerHTML = `<h2>Achievements <span style="color:var(--tx-faint);font-size:16px;font-weight:400">${Object.keys(S.badges).length}/${C.badges.length}</span></h2><p>Trophies for mastering each part of the system.</p>`;
    v.appendChild(bh);
    const shelf = el("div", "badges-shelf");
    C.badges.forEach((b) => {
      const got = !!S.badges[b.id];
      const bd = el("div", "badge" + (got ? " unlocked" : ""));
      bd.innerHTML = `<div class="ic">${b.icon}</div><div class="nm">${got ? esc(b.name) : "Locked"}</div><div class="tip"><b>${esc(b.name)}</b> — ${esc(b.desc)}</div>`;
      shelf.appendChild(bd);
    });
    v.appendChild(shelf);

    main.appendChild(v);
    $("#startBtn").onclick = () => { const m = nextModule(); go("#/module/" + m.id + "/0"); };
    $("#mapBtn").onclick = () => $("#map").scrollIntoView({ behavior: "smooth" });

    if (!S.seen) { S.seen = true; save(); }
  }
  function anyProgress() { return S.xp > 0 || Object.keys(S.lessons).length > 0; }
  function nextModule() {
    for (const m of C.modules) if (!moduleDone(m) && moduleUnlocked(m)) return m;
    return C.modules.find(moduleUnlocked) || C.modules[0];
  }

  /* =========================================================================
     LESSON RENDERER
  ========================================================================= */
  function renderLesson(main, m, idx) {
    idx = Math.max(0, Math.min(idx, m.lessons.length - 1));
    const lesson = m.lessons[idx];
    setCrumb([{ t: "Home", h: "#/" }, { t: m.title, b: true }, { t: "Lesson " + (idx + 1) }]);

    // award lesson XP once
    const key = m.id + "/" + lesson.id;
    if (!S.lessons[key]) { S.lessons[key] = true; save(); addXp(XP_LESSON, m.title + " · " + lesson.title); }

    main.innerHTML = "";
    const v = el("div", "view");
    v.style.setProperty("--accent", `var(--${m.color})`);
    v.style.setProperty("--accent-2", `var(--${m.color}-2)`);

    const head = el("div", "lesson-head");
    head.innerHTML = `
      <div class="lesson-eyebrow"><span class="num">${m.num}.${idx + 1}</span> ${esc(m.title)} · <span style="opacity:.7">${esc(m.tag)}</span></div>
      <h1>${esc(lesson.title)}</h1>
      <div class="lesson-meta"><span>Lesson ${idx + 1} of ${m.lessons.length}</span><span>◷ ${esc(m.est)} module</span></div>`;
    v.appendChild(head);

    lesson.blocks.forEach((b, i) => { const node = renderBlock(b); node.style.animationDelay = Math.min(i * 50, 400) + "ms"; v.appendChild(node); });

    // dots / sublesson tracker
    const nav = el("div", "lesson-nav");
    const prevBtn = el("button", "btn btn-ghost", idx === 0 ? "← Module map" : "← Previous");
    prevBtn.onclick = () => idx === 0 ? go("#/") : go("#/module/" + m.id + "/" + (idx - 1));
    const nextBtn = el("button", "btn btn-primary");
    if (idx < m.lessons.length - 1) {
      nextBtn.innerHTML = "Next lesson →";
      nextBtn.onclick = () => go("#/module/" + m.id + "/" + (idx + 1));
    } else {
      nextBtn.innerHTML = "Take the quiz →";
      nextBtn.onclick = () => {
        if (!S.modulesRead[m.id]) { S.modulesRead[m.id] = true; save(); addXp(XP_MODULE, "Finished reading " + m.title); }
        go("#/module/" + m.id + "/quiz");
      };
    }
    nav.appendChild(prevBtn); nav.appendChild(nextBtn);
    v.appendChild(nav);

    main.appendChild(v);
    highlightAll(v);
  }

  function renderBlock(b) {
    const wrap = el("div", "block");
    if (b.lead != null) { wrap.innerHTML = `<p class="b-lead">${b.lead}</p>`; }
    else if (b.h != null) { wrap.className = ""; wrap.innerHTML = `<div class="b-h">${esc(b.h)}</div>`; }
    else if (b.p != null) { wrap.innerHTML = `<p class="b-p">${b.p}</p>`; }
    else if (b.code != null) { wrap.appendChild(codeBlock(b)); }
    else if (b.note != null) {
      const n = el("div", "note " + (b.kind || "info"));
      n.innerHTML = (b.title ? `<span class="nt">${esc(b.title)}</span>` : "") + b.note;
      wrap.appendChild(n);
    }
    else if (b.list != null) {
      const list = el(b.ordered ? "ol" : "ul", "b-list");
      b.list.forEach((li) => list.appendChild(el("li", "b-li", li)));
      wrap.appendChild(list);
    }
    else if (b.steps != null) {
      const s = el("div", "steps");
      b.steps.forEach((st) => { const d = el("div", "b-step"); d.innerHTML = `<div class="t">${esc(st.t)}</div><div class="d">${st.d}</div>`; s.appendChild(d); });
      wrap.appendChild(s);
    }
    else if (b.stat != null) {
      const s = el("div", "stat-strip");
      b.stat.forEach((c) => { const d = el("div", "stat-cell"); d.innerHTML = `<div class="n">${esc(c.n)}</div><div class="l">${esc(c.label)}</div>`; s.appendChild(d); });
      wrap.appendChild(s);
    }
    else if (b.files != null) {
      const t = el("div", "files-tbl");
      b.files.forEach((f) => { const r = el("div", "files-row"); r.innerHTML = `<div class="fp">${esc(f.path)}</div><div class="fd">${f.desc}</div>`; t.appendChild(r); });
      wrap.appendChild(t);
    }
    else if (b.diagram != null) { wrap.className = "block b-diagram"; wrap.innerHTML = b.diagram; }
    else if (b.q != null) {
      const sc = el("div", "selfcheck");
      sc.innerHTML = `<div class="q"><span class="label">CHECK</span><span>${esc(b.q)}</span></div><button class="reveal">Reveal answer ↓</button><div class="a">${b.a}</div>`;
      $(".reveal", sc).onclick = () => { sc.classList.toggle("open"); $(".reveal", sc).textContent = sc.classList.contains("open") ? "Hide answer ↑" : "Reveal answer ↓"; };
      wrap.appendChild(sc);
    }
    else { wrap.innerHTML = ""; }
    return wrap;
  }

  function codeBlock(b) {
    const w = el("div", "codewrap");
    const bar = el("div", "codebar");
    bar.innerHTML = `<span class="dots"><i></i><i></i><i></i></span>` +
      (b.file ? `<span class="file">${esc(b.file)}</span>` : "") +
      (b.lines ? `<span class="lines">L${esc(b.lines)}</span>` : "") +
      (!b.lines && !b.file ? "" : "") +
      `<span class="lang">${esc(b.lang || "text")}</span>`;
    const pre = el("pre");
    const code = el("code");
    code.setAttribute("data-lang", b.lang || "text");
    code.textContent = b.code;
    pre.appendChild(code); w.appendChild(bar); w.appendChild(pre);
    return w;
  }

  /* =========================================================================
     SYNTAX HIGHLIGHTER  (lightweight, token-based)
  ========================================================================= */
  const KW = {
    python: ["def","return","import","from","for","in","if","elif","else","while","with","as","class","try","except","finally","raise","yield","lambda","not","and","or","is","None","True","False","async","await","pass","continue","break","nonlocal","global"],
    javascript: ["const","let","var","function","return","if","else","for","while","try","catch","finally","throw","new","class","export","import","from","async","await","of","in","typeof","instanceof","null","true","false","this","yield","do","switch","case","break","continue","default"],
    typescript: ["const","let","var","function","return","if","else","for","while","try","catch","throw","new","class","export","import","from","interface","type","extends","implements","async","await","of","in","typeof","null","true","false","this","public","private","switch","case","break","default","enum","as","number","string","boolean","void"],
    json: ["true","false","null"],
  };
  const BUILTIN = ["self","print","str","int","float","list","dict","set","len","range","min","max","round","sum","sorted","abs","map","filter","enumerate","open","Path","console","window","document","Math","JSON","Object","Array","String","Number"];

  function highlightAll(root) { root.querySelectorAll("code[data-lang]").forEach(hl); }
  function hl(code) {
    const lang = code.getAttribute("data-lang");
    const kws = KW[lang] || [];
    const src = code.textContent;
    let out = "", i = 0, n = src.length;
    const isW = (c) => /[A-Za-z0-9_$]/.test(c);
    while (i < n) {
      const c = src[i];
      // comments
      if (lang === "python" && c === "#") { let j = src.indexOf("\n", i); if (j < 0) j = n; out += span("tk-com", src.slice(i, j)); i = j; continue; }
      if ((lang === "javascript" || lang === "typescript") && c === "/" && src[i + 1] === "/") { let j = src.indexOf("\n", i); if (j < 0) j = n; out += span("tk-com", src.slice(i, j)); i = j; continue; }
      // strings
      if (c === '"' || c === "'" || c === "`") {
        let j = i + 1; while (j < n && src[j] !== c) { if (src[j] === "\\") j++; j++; }
        out += span("tk-str", src.slice(i, j + 1)); i = j + 1; continue;
      }
      // python triple handled by single quotes above mostly; numbers
      if (/[0-9]/.test(c) && !isW(src[i - 1] || "")) {
        let j = i; while (j < n && /[0-9._a-fx]/.test(src[j])) j++;
        out += span("tk-num", src.slice(i, j)); i = j; continue;
      }
      // words
      if (isW(c)) {
        let j = i; while (j < n && isW(src[j])) j++;
        const word = src.slice(i, j);
        const after = src[j];
        if (kws.includes(word)) out += span("tk-kw", word);
        else if (BUILTIN.includes(word)) out += span("tk-builtin", word);
        else if (after === "(") out += span("tk-fn", word);
        else out += esc(word);
        i = j; continue;
      }
      out += esc(c); i++;
    }
    code.innerHTML = out;
  }
  function span(cls, txt) { return `<span class="${cls}">${esc(txt)}</span>`; }

  /* =========================================================================
     QUIZ
  ========================================================================= */
  function renderQuiz(main, m) {
    setCrumb([{ t: "Home", h: "#/" }, { t: m.title, b: true }, { t: "Quiz" }]);
    main.innerHTML = "";
    const v = el("div", "view");
    v.style.setProperty("--accent", `var(--${m.color})`);
    v.style.setProperty("--accent-2", `var(--${m.color}-2)`);

    const intro = el("div", "quiz-intro");
    intro.innerHTML = `<div class="qicon">🎯</div><h1>${esc(m.title)} — Checkpoint</h1><p>${m.quiz.length} questions. Score ${Math.ceil(m.quiz.length * PASS_RATIO)}+ to pass and unlock the next module. ${XP_QUIZ_Q} XP per correct answer.</p>`;
    v.appendChild(intro);

    const state = { q: 0, correct: 0, answered: false, results: [] };
    const card = el("div", "quiz-card");
    v.appendChild(card);
    main.appendChild(v);

    function drawProgress() {
      return `<div class="quiz-progress">${m.quiz.map((_, i) => {
        let cls = i === state.q ? "cur" : "";
        if (state.results[i] === true) cls = "ok"; else if (state.results[i] === false) cls = "bad";
        return `<i class="${cls}"></i>`;
      }).join("")}</div>`;
    }

    function drawQuestion() {
      const q = m.quiz[state.q];
      state.answered = false;
      card.innerHTML = drawProgress() +
        `<div class="quiz-qnum">Question ${state.q + 1} / ${m.quiz.length}</div>
         <div class="quiz-q">${esc(q.q)}</div>
         <div class="quiz-opts"></div>
         <div class="quiz-explain"></div>
         <div class="quiz-next"></div>`;
      const opts = $(".quiz-opts", card);
      q.options.forEach((o, oi) => {
        const btn = el("button", "quiz-opt");
        btn.innerHTML = `<span class="key">${String.fromCharCode(65 + oi)}</span><span>${esc(o)}</span>`;
        btn.onclick = () => choose(oi, btn);
        opts.appendChild(btn);
      });
    }

    function choose(oi, btn) {
      if (state.answered) return;
      state.answered = true;
      const q = m.quiz[state.q];
      const correct = oi === q.answer;
      state.results[state.q] = correct;
      if (correct) state.correct++;
      const all = card.querySelectorAll(".quiz-opt");
      all.forEach((b, bi) => {
        b.disabled = true;
        if (bi === q.answer) b.classList.add("correct");
        else if (bi === oi) b.classList.add("wrong");
        else b.classList.add("dim");
      });
      const ex = $(".quiz-explain", card);
      ex.classList.add("show", correct ? "good" : "bad");
      ex.innerHTML = `<b>${correct ? "Correct!" : "Not quite."}</b> ${esc(q.explain)}`;
      if (correct) addXp(XP_QUIZ_Q, "Correct answer");
      card.querySelector(".quiz-progress").innerHTML = "";
      card.querySelector(".quiz-progress").outerHTML = drawProgress();
      const next = $(".quiz-next", card);
      const nb = el("button", "btn btn-primary", state.q < m.quiz.length - 1 ? "Next question →" : "See results →");
      nb.onclick = () => { if (state.q < m.quiz.length - 1) { state.q++; drawQuestion(); } else finish(); };
      next.appendChild(nb);
      if (correct) confettiBurst(0.4);
    }

    function finish() {
      const total = m.quiz.length, score = state.correct;
      const ratio = score / total, passed = ratio >= PASS_RATIO, perfect = score === total;
      const prev = S.quizzes[m.id] || {};
      const wasPassed = prev.passed;
      S.quizzes[m.id] = { passed: passed || wasPassed, best: Math.max(prev.best || 0, score) };
      save();

      if (passed && !wasPassed) { addXp(XP_QUIZ_PASS, "Passed " + m.title); }
      if (perfect) { addXp(XP_PERFECT, "Flawless run!"); grantBadge("flawless"); }
      checkBadges();

      const circ = 2 * Math.PI * 76;
      const offset = circ * (1 - ratio);
      card.className = "quiz-card"; card.style.background = "transparent"; card.style.border = "none"; card.style.boxShadow = "none"; card.style.padding = "0";
      card.innerHTML = `
        <div class="quiz-result">
          <div class="score-ring">
            <svg width="168" height="168"><circle class="track" cx="84" cy="84" r="76"></circle>
              <circle class="fill" cx="84" cy="84" r="76" stroke-dasharray="${circ}" stroke-dashoffset="${circ}"></circle></svg>
            <div class="num">${score}<small>of ${total}</small></div>
          </div>
          <h1>${perfect ? "Flawless! 💯" : passed ? "Module passed! 🎉" : "Almost there"}</h1>
          <p class="sub">${passed ? (perfect ? "A perfect score — you truly get this part of the codebase." : "You've unlocked the next module.") : "You need " + Math.ceil(total * PASS_RATIO) + " correct to pass. Review the lessons and retry — you've got this."}</p>
          <div class="actions"></div>
        </div>`;
      const ring = $(".score-ring .fill", card);
      ring.style.stroke = passed ? "var(--green)" : "var(--accent)";
      requestAnimationFrame(() => requestAnimationFrame(() => { ring.style.strokeDashoffset = offset; }));

      const actions = $(".actions", card);
      const retry = el("button", "btn btn-ghost", "↻ Retry quiz");
      retry.onclick = () => renderQuiz(main, m);
      actions.appendChild(retry);
      if (passed) {
        const i = C.modules.indexOf(m);
        const nextM = C.modules[i + 1];
        if (nextM) { const b = el("button", "btn btn-primary", "Next: " + nextM.title + " →"); b.onclick = () => go("#/module/" + nextM.id + "/0"); actions.appendChild(b); }
        else { const b = el("button", "btn btn-primary", "🏁 Finish — back to map"); b.onclick = () => go("#/"); actions.appendChild(b); }
      } else {
        const b = el("button", "btn btn-primary", "← Review lessons"); b.onclick = () => go("#/module/" + m.id + "/0"); actions.appendChild(b);
      }
      if (passed) confettiBurst(1);
      renderSidebar();
    }

    drawQuestion();
  }

  /* =========================================================================
     CRUMB
  ========================================================================= */
  function setCrumb(parts) {
    const c = $("#crumb");
    c.innerHTML = parts.map((p, i) => {
      const sep = i ? '<span style="opacity:.4"> / </span>' : "";
      const txt = p.b ? `<b>${esc(p.t)}</b>` : esc(p.t);
      return sep + (p.h ? `<a href="${p.h}" style="color:inherit;text-decoration:none">${txt}</a>` : txt);
    }).join("");
  }

  /* =========================================================================
     TOASTS / MODAL / CONFETTI
  ========================================================================= */
  function toast(ic, title, sub, cls) {
    const t = el("div", "toast " + (cls || ""));
    t.innerHTML = `<div class="ic">${ic}</div><div class="tx"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div>`;
    const host = $("#toasts");
    host.appendChild(t);
    while (host.children.length > 4) host.firstChild.remove(); // don't let them pile up
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 2600);
  }

  function badgeModal(b) {
    const back = el("div", "modal-back");
    back.innerHTML = `<div class="modal"><div class="ach">Achievement unlocked</div><div class="big">${b.icon}</div><h2>${esc(b.name)}</h2><p>${esc(b.desc)}</p><button class="btn btn-primary">Nice →</button></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    $(".btn", back).onclick = close;
    back.onclick = (e) => { if (e.target === back) close(); };
    confettiBurst(1.4);
  }

  // canvas confetti (no deps)
  const cv = $("#confetti"), cx = cv.getContext("2d");
  let parts = [], raf = null;
  function resize() { cv.width = innerWidth; cv.height = innerHeight; }
  addEventListener("resize", resize); resize();
  function confettiBurst(scale = 1) {
    const colors = ["#ff5a45", "#2ee6c8", "#8b7bff", "#ffc24d", "#36d399"];
    const n = Math.round(70 * scale);
    for (let i = 0; i < n; i++) {
      parts.push({
        x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.32,
        vx: (Math.random() - 0.5) * 11, vy: Math.random() * -13 - 4,
        g: 0.32 + Math.random() * 0.15, s: 5 + Math.random() * 7,
        c: colors[(Math.random() * colors.length) | 0], rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.3, life: 90 + Math.random() * 40,
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach((p) => { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--; });
    parts = parts.filter((p) => p.life > 0 && p.y < cv.height + 30);
    parts.forEach((p) => {
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.c; cx.globalAlpha = Math.min(1, p.life / 40);
      cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); cx.restore();
    });
    if (parts.length) raf = requestAnimationFrame(tick); else raf = null;
  }

  /* =========================================================================
     MOBILE MENU
  ========================================================================= */
  function openMenu() { $("#sidebar").classList.add("open"); if (!$(".scrim")) { const s = el("div", "scrim"); s.onclick = closeMenu; document.body.appendChild(s); } }
  function closeMenu() { $("#sidebar").classList.remove("open"); const s = $(".scrim"); if (s) s.remove(); }
  $("#menuBtn").onclick = openMenu;

  /* ---------------- boot ---------------- */
  renderSidebar();
  route();
})();
