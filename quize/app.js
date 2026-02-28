/* ================================================================
   STATE
================================================================ */
let appData = JSON.parse(localStorage.getItem("quizAppData")) || [];
let currentEditSetId = null;
let currentQuizSession = [];
let correctCount = 0;

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
  toast.innerHTML = `<span>${icons[type] || "•"}</span><span>${message}</span>`;
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
      {
        id: "replace",
        label: "Timpa Data",
        cls: "btn-red",
        value: false,
      },
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
      // retrigger animation
      el.style.animation = "none";
      el.offsetHeight; // reflow
      el.style.animation = "";
    } else {
      el.classList.add("hidden");
    }
  });
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
        <input type="checkbox" class="set-checkbox" id="check-${set.id}" value="${set.id}">
        <div class="custom-check">
          <svg width="10" height="8" fill="none" stroke="#0a0a0f" stroke-width="2.5" viewBox="0 0 12 10"><path d="M1 5l3.5 3.5L11 1"/></svg>
        </div>
        <span class="set-name">${escHtml(set.name)}</span>
        <span class="set-count">${set.items.length} soal</span>
      </label>
      <div class="set-actions">
        <button class="btn btn-sm" onclick="openEditor('${set.id}')">Edit</button>
        <button class="btn btn-red btn-sm btn-icon" onclick="handleDeleteSet('${set.id}')">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>`;
    listDiv.appendChild(div);
  });
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
   QUIZ
================================================================ */
function startQuiz() {
  const checkboxes = document.querySelectorAll(".set-checkbox:checked");
  if (checkboxes.length === 0) {
    showToast("Pilih minimal 1 set untuk memulai!", "error");
    return;
  }

  currentQuizSession = [];
  correctCount = 0;

  checkboxes.forEach((cb) => {
    const set = appData.find((s) => s.id === cb.value);
    set.items.forEach((item) =>
      currentQuizSession.push({
        ...item,
        wrongCount: 0,
        sourceSet: set.name,
      }),
    );
  });

  if (currentQuizSession.length === 0) {
    showToast("Set yang dipilih tidak memiliki soal.", "error");
    return;
  }

  if (document.getElementById("check-shuffle").checked) {
    for (let i = currentQuizSession.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [currentQuizSession[i], currentQuizSession[j]] = [
        currentQuizSession[j],
        currentQuizSession[i],
      ];
    }
  }

  document.getElementById("btn-finish-quiz").classList.add("hidden");
  document.getElementById("quiz-total-count").textContent =
    currentQuizSession.length;
  document.getElementById("quiz-correct-count").textContent = 0;
  document.getElementById("quiz-progress-bar").style.width = "0%";

  renderQuizTrack();
  showView("quiz");
  setTimeout(() => {
    const first = document.getElementById("input-0");
    if (first) {
      first.focus();
      first.scrollIntoView({ inline: "center", behavior: "smooth" });
    }
  }, 100);
}

function renderQuizTrack() {
  const track = document.getElementById("quiz-track");
  track.innerHTML = "";

  currentQuizSession.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "quiz-card";
    card.id = `card-${index}`;

    const mediaHtml =
      item.type === "image"
        ? `<img src="${escHtml(item.content)}" alt="Soal">`
        : `<div class="content-text">${escHtml(item.content)}</div>`;

    card.innerHTML = `
      <span class="card-index">${index + 1}</span>
      ${mediaHtml}
      <input type="text" id="input-${index}" placeholder="Jawaban…" autocomplete="off" spellcheck="false">`;
    track.appendChild(card);

    document
      .getElementById(`input-${index}`)
      .addEventListener("keydown", function (e) {
        if (e.key === "Enter") checkAnswer(index, this.value.trim());
      });
  });
}

function checkAnswer(index, userAnswer) {
  if (!userAnswer) return;
  const item = currentQuizSession[index];
  const card = document.getElementById(`card-${index}`);
  const inputEl = document.getElementById(`input-${index}`);

  if (userAnswer.toLowerCase() === item.answer.toLowerCase()) {
    card.classList.remove("state-wrong");
    card.classList.add("state-correct");
    inputEl.disabled = true;
    correctCount++;

    document.getElementById("quiz-correct-count").textContent = correctCount;
    document.getElementById("quiz-progress-bar").style.width =
      `${(correctCount / currentQuizSession.length) * 100}%`;

    // Focus next
    const nextInput = document.getElementById(`input-${index + 1}`);
    if (nextInput) {
      nextInput.focus();
      nextInput.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }

    if (correctCount === currentQuizSession.length) {
      document.getElementById("btn-finish-quiz").classList.remove("hidden");
      showToast("🎉 Semua soal berhasil dijawab!", "success", 4000);
    }
  } else {
    item.wrongCount++;
    card.classList.add("state-wrong");
    inputEl.disabled = true;
    setTimeout(() => {
      card.classList.remove("state-wrong");
      inputEl.disabled = false;
      inputEl.value = "";
      inputEl.focus();
    }, 900);
  }
}

async function confirmEndQuiz() {
  const confirmed = await confirmDialog(
    "Akhiri Sesi Kuis?",
    "Progress kamu saat ini akan hilang. Yakin ingin keluar?",
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

  // Summary boxes
  document.getElementById("stats-summary").innerHTML = `
    <div class="stat-box">
      <div class="stat-val">${currentQuizSession.length}</div>
      <div class="stat-lbl">Total Soal</div>
    </div>
    <div class="stat-box">
      <div class="stat-val" style="color:var(--green);">${currentQuizSession.filter((i) => i.wrongCount === 0).length}</div>
      <div class="stat-lbl">Langsung Benar</div>
    </div>
    <div class="stat-box">
      <div class="stat-val" style="color:var(--red);">${totalWrong}</div>
      <div class="stat-lbl">Total Salah</div>
    </div>`;

  // Detail list
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
        ${item.wrongCount === 0 ? "✓ Sempurna" : `✕ ${item.wrongCount}x salah`}
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

  document.getElementById("export-header-title").textContent =
    setNames.join(" & ");

  const grid = document.getElementById("export-grid-content");
  grid.innerHTML = "";

  itemsToExport.forEach((item) => {
    const card = document.createElement("div");
    card.className = "export-card";
    const contentHtml =
      item.type === "image"
        ? `<img src="${escHtml(item.content)}" crossorigin="anonymous">`
        : escHtml(item.content);
    card.innerHTML = `
      <div class="export-card-top">
        <div class="export-card-dot"></div>
        ${contentHtml}
      </div>
      <div class="export-card-bottom">
        <span style="color:#55556a;font-size:12px;font-family:'Syne',sans-serif;">→</span>
        <span class="export-card-answer">${escHtml(item.answer)}</span>
      </div>`;
    grid.appendChild(card);
  });

  const exportContainer = document.getElementById("export-container");
  showToast("Sedang memproses gambar…", "info", 5000);

  html2canvas(exportContainer, {
    useCORS: true,
    backgroundColor: "#0d0d14",
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

      if (choice === null) return; // batal
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
