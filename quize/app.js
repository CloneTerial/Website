/* ================================================================
   STATE
================================================================ */
let appData = JSON.parse(localStorage.getItem("quizAppData")) || [];
let currentEditSetId = null;
let currentQuizSession = [];
let correctCount = 0;
// Track which cards are currently "pending check" (input disabled during wrong animation)
const pendingCards = new Set();

/* ================================================================
   PERSISTENCE
================================================================ */
function saveData() {
  localStorage.setItem("quizAppData", JSON.stringify(appData));
}

/* ================================================================
   TOAST NOTIFICATIONS
================================================================ */
function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toast-container");
  const icons = { success: "✓", error: "✕", info: "⚡" };
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || "•"}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("hide");
    toast.addEventListener("animationend", () => toast.remove(), {
      once: true,
    });
  }, duration);
}

/* ================================================================
   MODAL DIALOGS
================================================================ */
function showModal({ icon = "", title, body, actions }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const actionBtns = actions
      .map(
        (a) =>
          `<button class="btn ${a.cls || ""}" id="modal-btn-${a.id}">${a.label}</button>`,
      )
      .join("");

    overlay.innerHTML = `
      <div class="modal-box">
        ${icon ? `<div class="modal-icon">${icon}</div>` : ""}
        <div class="modal-title">${title}</div>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">${actionBtns}</div>
      </div>`;

    document.getElementById("modal-placeholder").appendChild(overlay);

    actions.forEach((a) => {
      document
        .getElementById(`modal-btn-${a.id}`)
        .addEventListener("click", () => {
          overlay.remove();
          resolve(a.value);
        });
    });

    // Close on backdrop click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(actions[0].value);
      }
    });
  });
}

async function confirmDialog(title, body) {
  return showModal({
    icon: "⚠️",
    title,
    body,
    actions: [
      { id: "cancel", label: "Batal", cls: "btn-ghost", value: false },
      { id: "ok", label: "Ya, Lanjut", cls: "btn-red", value: true },
    ],
  });
}

async function choiceDialog(title, body) {
  return showModal({
    icon: "📂",
    title,
    body,
    actions: [
      { id: "cancel", label: "Batal", cls: "btn-ghost", value: null },
      { id: "replace", label: "Timpa Data", cls: "btn-red", value: false },
      { id: "merge", label: "Gabungkan", cls: "btn-green", value: true },
    ],
  });
}

/* ================================================================
   VIEW MANAGEMENT
================================================================ */
const VIEWS = ["dashboard", "editor", "quiz", "stats"];

function showView(viewName) {
  VIEWS.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    if (v === viewName) {
      el.classList.remove("hidden");
      el.style.animation = "none";
      el.offsetHeight;
      el.style.animation = "";
    } else {
      el.classList.add("hidden");
    }
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  // Sticky bar only visible on dashboard
  const bar = document.getElementById("sticky-action-bar");
  if (bar) bar.classList.toggle("hidden-bar", viewName !== "dashboard");
  if (viewName === "dashboard") renderDashboard();
}

/* ================================================================
   DASHBOARD
================================================================ */
function renderDashboard() {
  const listDiv = document.getElementById("set-list");
  const chipEl = document.getElementById("set-count-chip");
  chipEl.textContent = `${appData.length} set`;

  if (appData.length === 0) {
    listDiv.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h2>Belum ada set</h2>
        <p>Buat set baru di atas atau import via JSON untuk memulai.</p>
      </div>`;
    return;
  }

  listDiv.innerHTML = "";
  appData.forEach((set) => {
    const div = document.createElement("div");
    div.className = "set-item";
    div.innerHTML = `
      <label class="set-check-label" for="check-${set.id}">
        <input type="checkbox" class="set-checkbox" id="check-${set.id}" value="${set.id}" onchange="updateStickyBar()">
        <div class="custom-check">
          <svg width="10" height="8" fill="none" stroke="#0a0a0f" stroke-width="2.5" viewBox="0 0 12 10"><path d="M1 5l3.5 3.5L11 1"/></svg>
        </div>
        <div class="set-label-text">
          <span class="set-name">${escHtml(set.name)}</span>
          <span class="set-count">${set.items.length} soal</span>
        </div>
      </label>
      <div class="set-actions">
        <button class="btn btn-sm" onclick="openEditor('${set.id}')">Edit</button>
        <button class="btn btn-gold btn-sm" onclick="handleSplitSet('${set.id}')">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
          Pecah
        </button>
        <button class="btn btn-red btn-sm btn-icon" onclick="handleDeleteSet('${set.id}')">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>`;
    listDiv.appendChild(div);
  });
  updateStickyBar();
}

function createNewSet() {
  const nameInput = document.getElementById("new-set-name");
  const name = nameInput.value.trim();
  if (!name) {
    showToast("Nama set tidak boleh kosong!", "error");
    return;
  }
  appData.push({ id: Date.now().toString(), name, items: [] });
  saveData();
  nameInput.value = "";
  renderDashboard();
  showToast(`Set "${name}" berhasil dibuat.`, "success");
}

async function handleDeleteSet(id) {
  const set = appData.find((s) => s.id === id);
  const confirmed = await confirmDialog(
    `Hapus "${escHtml(set.name)}"?`,
    `Set dengan <strong>${set.items.length} soal</strong> ini akan dihapus permanen dan tidak bisa dikembalikan.`,
  );
  if (!confirmed) return;
  appData = appData.filter((s) => s.id !== id);
  saveData();
  renderDashboard();
  showToast("Set berhasil dihapus.", "info");
}

/* ================================================================
   SPLIT SET (PECAH SET)
================================================================ */
// Modal khusus untuk input angka pemecahan set
async function splitDialog(title, maxItems) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-icon">✂️</div>
        <div class="modal-title">${title}</div>
        <div class="modal-body">
          <p>Set ini memiliki total <strong>${maxItems}</strong> soal.</p>
          <div style="margin-top: 12px;" class="field">
            <label>Jumlah soal per set baru</label>
            <input type="number" id="split-size-input" class="input" min="1" max="${maxItems}" placeholder="Contoh: 10 atau 20">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="modal-btn-cancel">Batal</button>
          <button class="btn btn-gold" id="modal-btn-ok">Pecah Set</button>
        </div>
      </div>`;

    document.getElementById("modal-placeholder").appendChild(overlay);

    const inputEl = document.getElementById("split-size-input");
    inputEl.focus();

    // Event listeners
    document
      .getElementById("modal-btn-cancel")
      .addEventListener("click", () => {
        overlay.remove();
        resolve(null);
      });

    document.getElementById("modal-btn-ok").addEventListener("click", () => {
      const val = parseInt(inputEl.value, 10);
      overlay.remove();
      resolve(val);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(null);
      }
    });
  });
}

// Logika utama memecah array dan membuat set baru
async function handleSplitSet(id) {
  const set = appData.find((s) => s.id === id);

  if (set.items.length < 2) {
    showToast("Set harus memiliki minimal 2 soal untuk bisa dipecah.", "error");
    return;
  }

  const chunkSize = await splitDialog(
    `Pecah Set "${escHtml(set.name)}"`,
    set.items.length,
  );

  // Validasi input
  if (!chunkSize || isNaN(chunkSize) || chunkSize <= 0) {
    return; // Dibatalkan atau input tidak valid
  }

  if (chunkSize >= set.items.length) {
    showToast(
      "Jumlah per set harus lebih kecil dari total soal saat ini.",
      "error",
    );
    return;
  }

  // Pecah array items menjadi beberapa chunk
  const chunks = [];
  for (let i = 0; i < set.items.length; i += chunkSize) {
    chunks.push(set.items.slice(i, i + chunkSize));
  }

  // Buat set baru berdasarkan chunk
  const newSets = chunks.map((chunk, index) => {
    return {
      id: Date.now().toString() + "-" + index, // Buat ID unik
      name: `${set.name} (${index + 1})`,
      items: chunk,
    };
  });

  // Tambahkan set baru ke dalam database aplikasi
  appData.push(...newSets);
  saveData();
  renderDashboard();

  showToast(
    `Berhasil memecah menjadi ${chunks.length} set baru!`,
    "success",
    4000,
  );
}

/* ================================================================
   EDITOR
================================================================ */
function openEditor(id) {
  currentEditSetId = id;
  showView("editor");
  renderEditor();
}

function renderEditor() {
  const set = appData.find((s) => s.id === currentEditSetId);
  document.getElementById("editor-title").textContent = set.name;
  document.getElementById("editor-count-chip").textContent =
    `${set.items.length} soal`;

  const listDiv = document.getElementById("item-list");
  listDiv.innerHTML = "";

  if (set.items.length === 0) {
    listDiv.innerHTML = `
      <div class="empty-state" style="padding:40px 20px;">
        <div class="empty-icon">🗂️</div>
        <h2>Set ini masih kosong</h2>
        <p>Tambahkan soal pertama di form di atas.</p>
      </div>`;
    return;
  }

  set.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item-row";
    const preview =
      item.type === "image"
        ? `<a href="${escHtml(item.content)}" target="_blank" style="color:var(--gold);font-size:.78rem;">🖼 Lihat Gambar</a>`
        : escHtml(item.content);
    row.innerHTML = `
      <span class="item-row-num">${index + 1}</span>
      <div class="item-row-content">
        <div class="item-row-q">${preview}</div>
        <div class="item-row-a">Jawaban: <span>${escHtml(item.answer)}</span></div>
      </div>
      <button class="btn btn-red btn-sm btn-icon" onclick="deleteItem(${index})">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>`;
    listDiv.appendChild(row);
  });
}

function addItemToSet() {
  const type = document.getElementById("item-type").value;
  const content = document.getElementById("item-content").value.trim();
  const answer = document.getElementById("item-answer").value.trim();
  if (!content || !answer) {
    showToast("Konten dan jawaban harus diisi!", "error");
    return;
  }
  const idx = appData.findIndex((s) => s.id === currentEditSetId);
  appData[idx].items.push({ type, content, answer });
  saveData();
  document.getElementById("item-content").value = "";
  document.getElementById("item-answer").value = "";
  renderEditor();
  showToast("Soal berhasil ditambahkan.", "success");
}

function deleteItem(index) {
  const idx = appData.findIndex((s) => s.id === currentEditSetId);
  appData[idx].items.splice(index, 1);
  saveData();
  renderEditor();
  showToast("Soal dihapus.", "info");
}

/* ================================================================
   QUIZ — SINGLE CARD FOCUS MODE
================================================================ */
let quizCurrentIdx = 0;
let quizSwipeLocked = false; // prevents rapid swipe double-fire

function startQuiz() {
  const checkboxes = document.querySelectorAll(".set-checkbox:checked");
  if (checkboxes.length === 0) {
    showToast("Pilih minimal 1 set untuk memulai!", "error");
    return;
  }

  currentQuizSession = [];
  correctCount = 0;
  quizCurrentIdx = 0;
  pendingCards.clear();

  checkboxes.forEach((cb) => {
    const set = appData.find((s) => s.id === cb.value);
    set.items.forEach((item) =>
      currentQuizSession.push({
        ...item,
        wrongCount: 0,
        answered: false,
        sourceSet: set.name,
      })
    );
  });

  if (currentQuizSession.length === 0) {
    showToast("Set yang dipilih tidak memiliki soal.", "error");
    return;
  }

  if (document.getElementById("check-shuffle").checked) {
    for (let i = currentQuizSession.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [currentQuizSession[i], currentQuizSession[j]] = [currentQuizSession[j], currentQuizSession[i]];
    }
  }

  document.getElementById("quiz-total-count").textContent = currentQuizSession.length;
  document.getElementById("quiz-correct-count").textContent = 0;
  document.getElementById("quiz-progress-bar").style.width = "0%";
  document.getElementById("quiz-finish-area").style.display = "none";

  setupQuizSwipe();
  setupQuizKeyboard();

  showView("quiz");
  goToCard(0, false);

  // Focus input after animation
  setTimeout(() => {
    document.getElementById("quiz-main-input")?.focus();
  }, 320);
}

/* Navigate to a specific card index */
function goToCard(idx, animate = true) {
  if (idx < 0 || idx >= currentQuizSession.length) return;

  const prev = quizCurrentIdx;
  quizCurrentIdx = idx;
  const item = currentQuizSession[idx];

  const card    = document.getElementById("quiz-active-card");
  const display = document.getElementById("quiz-card-display");
  const input   = document.getElementById("quiz-main-input");
  const submit  = document.getElementById("btn-submit-main");

  // --- Card slide animation ---
  if (animate && card) {
    const dir = idx > prev ? 1 : -1;
    card.style.transition = "none";
    card.style.transform  = `translateX(${dir * 55}px)`;
    card.style.opacity    = "0";
    card.offsetHeight; // reflow
    card.style.transition = "transform 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.25s ease";
    card.style.transform  = "translateX(0)";
    card.style.opacity    = "1";
  }

  // --- Render question content ---
  if (display) {
    display.innerHTML = item.type === "image"
      ? `<img src="${escHtml(item.content)}" alt="Soal gambar">`
      : `<div class="quiz-question-text">${escHtml(item.content)}</div>`;
  }

  // --- Input + card state ---
  if (card)  card.classList.remove("state-correct", "state-wrong");
  if (input && submit) {
    if (item.answered) {
      input.value   = item.answer;
      input.disabled = true;
      submit.disabled = true;
      input.classList.add("state-correct-input");
      card?.classList.add("state-correct");
    } else if (pendingCards.has(idx)) {
      input.disabled  = true;
      submit.disabled = true;
      card?.classList.add("state-wrong");
    } else {
      input.value   = "";
      input.disabled  = false;
      submit.disabled = false;
      input.classList.remove("state-correct-input");
      // Only auto-focus on desktop (mobile keyboard opens on demand)
      if (window.innerWidth > 640) input.focus();
    }
  }

  // --- Update counter + dots + arrows ---
  document.getElementById("quiz-card-counter").textContent = `${idx + 1}/${currentQuizSession.length}`;
  updateQuizDots();
  updateQuizArrows();

  // Subtle haptic
  if (animate && navigator.vibrate) navigator.vibrate(8);
}

/* Quick helpers */
function quizNextCard() {
  if (quizCurrentIdx < currentQuizSession.length - 1) goToCard(quizCurrentIdx + 1);
}

function quizPrevCard() {
  if (quizCurrentIdx > 0) goToCard(quizCurrentIdx - 1);
}

function updateQuizArrows() {
  const prev = document.getElementById("btn-quiz-prev");
  const next = document.getElementById("btn-quiz-next");
  if (prev) prev.style.opacity = quizCurrentIdx === 0 ? "0.25" : "1";
  if (next) next.style.opacity = quizCurrentIdx === currentQuizSession.length - 1 ? "0.25" : "1";
}

function updateQuizDots() {
  const bar   = document.getElementById("quiz-dots-bar");
  const total = currentQuizSession.length;
  if (!bar) return;

  // Too many? Show text summary instead of dots
  if (total > 20) {
    const done = currentQuizSession.filter(i => i.answered).length;
    bar.innerHTML = `
      <div class="quiz-dots-text">
        <span class="dot-answered">✓ ${done} selesai</span>
        <span class="dot-sep">·</span>
        <span class="dot-remaining">${total - done} tersisa</span>
        <span class="dot-sep">·</span>
        <span style="color:var(--text3)">${quizCurrentIdx + 1}/${total}</span>
      </div>`;
    return;
  }

  bar.innerHTML = "";
  currentQuizSession.forEach((item, i) => {
    const dot = document.createElement("div");
    dot.className = "quiz-dot";
    if (i === quizCurrentIdx)           dot.classList.add("quiz-dot-current");
    else if (item.answered && item.wrongCount === 0) dot.classList.add("quiz-dot-perfect");
    else if (item.answered)              dot.classList.add("quiz-dot-done");
    else if (pendingCards.has(i))        dot.classList.add("quiz-dot-wrong");
    dot.onclick = () => goToCard(i);
    bar.appendChild(dot);
  });
}

/* Submit answer for current card */
function submitCurrentCard() {
  const idx    = quizCurrentIdx;
  const item   = currentQuizSession[idx];
  const input  = document.getElementById("quiz-main-input");
  const submit = document.getElementById("btn-submit-main");
  const card   = document.getElementById("quiz-active-card");

  if (!input || item.answered || pendingCards.has(idx)) return;

  const userAnswer = input.value.trim();

  if (!userAnswer) {
    input.classList.add("shake-input");
    setTimeout(() => input.classList.remove("shake-input"), 400);
    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
    return;
  }

  if (userAnswer.toLowerCase() === item.answer.toLowerCase()) {
    // ✅ Correct
    item.answered = true;
    correctCount++;

    card?.classList.add("state-correct");
    input.classList.add("state-correct-input");
    input.disabled  = true;
    submit.disabled = true;

    document.getElementById("quiz-correct-count").textContent = correctCount;
    document.getElementById("quiz-progress-bar").style.width =
      `${(correctCount / currentQuizSession.length) * 100}%`;

    updateQuizDots();
    if (navigator.vibrate) navigator.vibrate(60);

    if (correctCount === currentQuizSession.length) {
      // 🎉 All done
      setTimeout(() => {
        const finishArea = document.getElementById("quiz-finish-area");
        if (finishArea) finishArea.style.display = "flex";
        showToast("🎉 Semua soal berhasil dijawab!", "success", 4000);
      }, 600);
    } else {
      // Auto-advance to next unanswered after brief green flash
      setTimeout(() => {
        let next = -1;
        for (let i = idx + 1; i < currentQuizSession.length; i++) {
          if (!currentQuizSession[i].answered) { next = i; break; }
        }
        if (next === -1) {
          for (let i = 0; i < idx; i++) {
            if (!currentQuizSession[i].answered) { next = i; break; }
          }
        }
        if (next !== -1) goToCard(next);
      }, 450);
    }
  } else {
    // ❌ Wrong
    item.wrongCount++;
    card?.classList.add("state-wrong");
    pendingCards.add(idx);
    input.disabled  = true;
    submit.disabled = true;

    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    updateQuizDots();

    setTimeout(() => {
      card?.classList.remove("state-wrong");
      input.disabled  = false;
      submit.disabled = false;
      input.value     = "";
      input.classList.remove("state-correct-input");
      input.focus();
      pendingCards.delete(idx);
      updateQuizDots();
    }, 900);
  }
}

/* Touch swipe setup */
function setupQuizSwipe() {
  const viewport = document.getElementById("quiz-viewport");
  if (!viewport) return;

  let startX = 0, startY = 0;

  viewport.addEventListener("touchstart", (e) => {
    startX = e.changedTouches[0].clientX;
    startY = e.changedTouches[0].clientY;
    quizSwipeLocked = false;
  }, { passive: true });

  viewport.addEventListener("touchend", (e) => {
    if (quizSwipeLocked) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    // Only register horizontal swipe, not accidental vertical scroll
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) {
      quizSwipeLocked = true;
      if (dx < 0) quizNextCard();
      else         quizPrevCard();
    }
  }, { passive: true });
}

/* Keyboard Enter key for quiz input */
function setupQuizKeyboard() {
  const input = document.getElementById("quiz-main-input");
  if (!input) return;

  let lastEnter = false;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.keyCode === 13) {
      lastEnter = true;
      e.preventDefault();
      submitCurrentCard();
    }
  });

  input.addEventListener("keyup", (e) => {
    if ((e.key === "Enter" || e.keyCode === 13) && !lastEnter) {
      e.preventDefault();
      submitCurrentCard();
    }
    lastEnter = false;
  });

  // Mobile: some keyboards fire newline via "input" event
  input.addEventListener("input", function () {
    if (this.value.endsWith("\n") || this.value.endsWith("\r")) {
      this.value = this.value.replace(/[\r\n]/g, "");
      submitCurrentCard();
    }
  });
}

async function confirmEndQuiz() {
  const confirmed = await confirmDialog(
    "Akhiri Sesi Kuis?",
    "Progress kamu saat ini akan hilang. Yakin ingin keluar?"
  );
  if (confirmed) showView("dashboard");
}

/* ================================================================
   STATS
================================================================ */
function showStats() {
  let totalWrong = 0;
  currentQuizSession.forEach((item) => {
    totalWrong += item.wrongCount;
  });

  const perfectCount = currentQuizSession.filter(
    (i) => i.wrongCount === 0,
  ).length;
  const score = Math.round((perfectCount / currentQuizSession.length) * 100);

  document.getElementById("stats-summary").innerHTML = `
    <div class="stat-box">
      <div class="stat-val">${currentQuizSession.length}</div>
      <div class="stat-lbl">Total Soal</div>
    </div>
    <div class="stat-box">
      <div class="stat-val" style="color:var(--green);">${perfectCount}</div>
      <div class="stat-lbl">Langsung Benar</div>
    </div>
    <div class="stat-box">
      <div class="stat-val" style="color:var(--red);">${totalWrong}</div>
      <div class="stat-lbl">Total Salah</div>
    </div>
    <div class="stat-box stat-box-score">
      <div class="stat-val" style="color:var(--gold);">${score}%</div>
      <div class="stat-lbl">Skor Akurasi</div>
    </div>`;

  const statsContent = document.getElementById("stats-content");
  statsContent.innerHTML = "";
  currentQuizSession.forEach((item) => {
    const row = document.createElement("div");
    row.className = "stat-item";
    const displayContent =
      item.type === "image" ? "🖼 Gambar" : escHtml(item.content);
    row.innerHTML = `
      <div class="item-row-content">
        <div class="item-row-q">${displayContent}</div>
        <div class="item-row-a">Jawaban: <span>${escHtml(item.answer)}</span></div>
      </div>
      <span class="stat-badge ${item.wrongCount === 0 ? "badge-perfect" : "badge-wrong"}">
        ${item.wrongCount === 0 ? "✓ Sempurna" : `✕ ${item.wrongCount}x`}
      </span>`;
    statsContent.appendChild(row);
  });

  showView("stats");
}

/* ================================================================
   IMPORT JSON
================================================================ */
function importJSON() {
  const jsonText = document.getElementById("import-json-text").value.trim();
  if (!jsonText) {
    showToast("Kotak teks masih kosong!", "error");
    return;
  }

  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed.name || !Array.isArray(parsed.items)) {
      throw new Error("Harus ada field 'name' dan 'items' berbentuk array.");
    }
    const newSet = {
      id: Date.now().toString(),
      name: parsed.name,
      items: parsed.items,
    };
    appData.push(newSet);
    saveData();
    document.getElementById("import-json-text").value = "";
    renderDashboard();
    showToast(
      `Set "${newSet.name}" (${newSet.items.length} soal) berhasil diimport!`,
      "success",
      4000,
    );
  } catch (err) {
    showModal({
      icon: "❌",
      title: "Gagal Import JSON",
      body: `Format JSON tidak valid.<br><br><code style="font-family:var(--font-mono);font-size:.8rem;color:var(--red);">${escHtml(err.message)}</code>`,
      actions: [{ id: "ok", label: "Tutup", cls: "", value: null }],
    });
  }
}

/* ================================================================
   EXPORT TO IMAGE
================================================================ */
function exportToImage() {
  const checkboxes = document.querySelectorAll(".set-checkbox:checked");
  if (checkboxes.length === 0) {
    showToast("Pilih minimal 1 set untuk diexport!", "error");
    return;
  }

  let itemsToExport = [];
  let setNames = [];

  checkboxes.forEach((cb) => {
    const set = appData.find((s) => s.id === cb.value);
    itemsToExport.push(...set.items);
    setNames.push(set.name);
  });

  if (itemsToExport.length === 0) {
    showToast("Set yang dipilih tidak memiliki soal.", "error");
    return;
  }

  const titleEl = document.getElementById("export-header-title");
  const titleText = setNames.join(" & ");
  titleEl.textContent = titleText;

  // Dynamic font size: prevent overflow on long titles
  if (titleText.length > 80) {
    titleEl.style.fontSize = "22px";
    titleEl.style.padding = "12px 28px";
  } else if (titleText.length > 50) {
    titleEl.style.fontSize = "28px";
    titleEl.style.padding = "13px 32px";
  } else if (titleText.length > 30) {
    titleEl.style.fontSize = "36px";
    titleEl.style.padding = "14px 36px";
  } else {
    titleEl.style.fontSize = "44px";
    titleEl.style.padding = "14px 40px";
  }

  // Update header line to include diamond ornament
  const headerLine = document.querySelector(".export-header-line");
  if (headerLine) {
    headerLine.innerHTML = `<div class="export-header-line-diamond"></div>`;
  }

  const grid = document.getElementById("export-grid-content");
  grid.innerHTML = "";

  itemsToExport.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "export-card";
    const contentHtml =
      item.type === "image"
        ? `<img src="${escHtml(item.content)}" crossorigin="anonymous">`
        : escHtml(item.content);
    card.innerHTML = `
      <div class="export-card-top">
        <div class="export-card-dot">${idx + 1}</div>
        ${contentHtml}
      </div>
      <div class="export-card-bottom">
        <span style="color:rgba(212,168,83,0.5);font-size:13px;font-family:'Syne',sans-serif;">→</span>
        <span class="export-card-answer">${escHtml(item.answer)}</span>
      </div>`;
    grid.appendChild(card);
  });

  const exportContainer = document.getElementById("export-container");
  showToast("Sedang memproses gambar…", "info", 5000);

  html2canvas(exportContainer, {
    useCORS: true,
    backgroundColor: "#08071a",
    scale: 1.5,
  })
    .then((canvas) => {
      const link = document.createElement("a");
      link.download = `FlashMind-CheatSheet-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("Gambar berhasil didownload!", "success");
    })
    .catch((err) => {
      console.error(err);
      showModal({
        icon: "🖼️",
        title: "Gagal Export Gambar",
        body: "Pastikan link gambar valid dan server asal mengizinkan akses lintas domain (CORS).",
        actions: [{ id: "ok", label: "Mengerti", cls: "", value: null }],
      });
    });
}

/* ================================================================
   BACKUP & RESTORE
================================================================ */
function downloadBackupFile() {
  if (appData.length === 0) {
    showToast("Tidak ada data untuk di-backup!", "error");
    return;
  }
  const blob = new Blob([JSON.stringify(appData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FlashMind-Backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("File backup berhasil didownload.", "success");
}

async function restoreFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const importedData = JSON.parse(e.target.result);
      if (!Array.isArray(importedData))
        throw new Error("Format file salah. Harus berupa array dari Set.");

      const choice = await choiceDialog(
        "Restore dari File",
        `File berisi <strong>${importedData.length} set</strong>.<br><br>Pilih <em>Gabungkan</em> untuk menambahkan ke data yang ada, atau <em>Timpa Data</em> untuk mengganti seluruh data yang ada.`,
      );

      if (choice === null) return;
      appData = choice ? appData.concat(importedData) : importedData;
      saveData();
      renderDashboard();
      showToast(
        `${importedData.length} set berhasil di-restore!`,
        "success",
        4000,
      );
    } catch (err) {
      showModal({
        icon: "📁",
        title: "Gagal Membaca File",
        body: `Pastikan file adalah backup .json yang valid.<br><code style="font-family:var(--font-mono);font-size:.8rem;color:var(--red);">${escHtml(err.message)}</code>`,
        actions: [{ id: "ok", label: "Tutup", cls: "", value: null }],
      });
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

/* ================================================================
   COLLAPSIBLE PANELS
================================================================ */
function togglePanel(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  const wrapper = panel.closest(".collapsible-panel");
  wrapper.classList.toggle("open");
}

/* ================================================================
   SET SEARCH / FILTER
================================================================ */
function filterSets() {
  const q = document.getElementById("set-search").value.toLowerCase().trim();
  document.querySelectorAll("#set-list .set-item").forEach((item) => {
    const name = item.querySelector(".set-name")?.textContent.toLowerCase() || "";
    item.style.display = !q || name.includes(q) ? "" : "none";
  });
}

/* ================================================================
   SELECT ALL / DESELECT ALL
================================================================ */
function toggleSelectAll() {
  const checkboxes = document.querySelectorAll(".set-checkbox");
  const allChecked = [...checkboxes].every((cb) => cb.checked);
  checkboxes.forEach((cb) => { cb.checked = !allChecked; });
  const btn = document.getElementById("btn-select-all");
  if (btn) btn.textContent = allChecked ? "Pilih Semua" : "Batal Semua";
  updateStickyBar();
}

/* ================================================================
   STICKY ACTION BAR — update count badge + select all label
================================================================ */
function updateStickyBar() {
  const checkboxes = document.querySelectorAll(".set-checkbox");
  const checked = [...checkboxes].filter((cb) => cb.checked);
  const badge = document.getElementById("sticky-selected-count");
  const btn = document.getElementById("btn-select-all");

  if (badge) {
    badge.textContent = `${checked.length} dipilih`;
    badge.classList.toggle("has-selection", checked.length > 0);
  }
  if (btn) {
    const allChecked = checkboxes.length > 0 && checked.length === checkboxes.length;
    btn.textContent = allChecked ? "Batal Semua" : "Pilih Semua";
  }
}

/* ================================================================
   UTILS
================================================================ */
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ================================================================
   INIT
================================================================ */
renderDashboard();
