/* =========================================================
   도트 웨딩홀 (혼자 돌아다니는 첫 버전)
   - 캐릭터 고르기 → 옆에서 보는 스타티스홀 맵
   - 바닥을 터치하면 걸어가요. 맵이 화면보다 넓어서 카메라가 따라와요
   ========================================================= */

const SPRITE_DIR = "../assets/characters/sprites/";

const GUESTS = [
  "guest-m-mocha", "guest-f-ribbon", "guest-f-butter", "guest-m-black",
  "guest-f-sage", "guest-f-rose", "guest-m-navy", "guest-f-tweed",
  "guest-f-coral", "guest-m-coat", "guest-f-sky", "guest-f-lilac",
];
const COUPLE = { bride: "bride-b", groom: "groom-b" };

const ZONES = [
  { name: "로비", from: 0, to: 380 },
  { name: "예식홀", from: 380, to: 940 },
  { name: "포토존", from: 940, to: 1200 },
  { name: "연회장", from: 1200, to: 1560 },
];
const MAP_W = 1560;

const BOT_NAMES = ["태용친구", "원선친구", "회사동기", "대학선배", "사촌언니", "후배"];
const BOT_LINES = [
  "결혼 축하해!!", "드레스 너무 예뻐", "샹들리에 미쳤다", "부케 내꺼야",
  "신부 입장 언제야?", "둘이 너무 잘 어울려", "사진 찍자!", "케이크 맛있겠다",
];

/* ---------- 공통: 저장 ---------- */
const store = {
  get() { try { return JSON.parse(localStorage.getItem("wh_profile") || "null"); } catch { return null; } },
  set(v) { try { localStorage.setItem("wh_profile", JSON.stringify(v)); } catch {} },
};

/* ---------- 공통: 한 줄 맞춤 ---------- */
function fitText(root = document) {
  root.querySelectorAll(".fit").forEach((el) => {
    if (!el.dataset.split) {
      const parts = el.innerHTML.split(/<br\s*\/?>/i).map((s) => s.trim()).filter(Boolean);
      el.innerHTML = parts.map((p) => `<span class="ln">${p}</span>`).join("");
      el.dataset.split = "1";
    }
    el.style.fontSize = "";
    const base = parseFloat(getComputedStyle(el).fontSize);
    const avail = el.clientWidth;
    if (!avail) return;
    const widest = Math.max(...[...el.querySelectorAll(".ln")].map((l) => l.scrollWidth));
    if (widest > avail) el.style.fontSize = `${Math.floor(base * (avail / widest) * 0.97 * 10) / 10}px`;
  });
}

/* ---------- 이미지 불러오기 ---------- */
const images = {};
function loadImage(key) {
  if (images[key]) return images[key];
  const img = new Image();
  img.src = SPRITE_DIR + key + ".png";
  images[key] = img;
  return img;
}

/* =========================================================
   1. 캐릭터 고르기
   ========================================================= */
const selectEl = document.getElementById("select");
const hallEl = document.getElementById("hall");
const roster = document.getElementById("roster");
const nameInput = document.getElementById("nameInput");
const enterBtn = document.getElementById("enterBtn");

let chosen = null;
const saved = store.get();

GUESTS.forEach((key, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "pick";
  b.setAttribute("role", "radio");
  b.setAttribute("aria-checked", "false");
  b.setAttribute("aria-label", `캐릭터 ${i + 1}`);
  const img = document.createElement("img");
  img.src = SPRITE_DIR + key + ".png";
  img.alt = "";
  b.appendChild(img);
  b.addEventListener("click", () => {
    chosen = key;
    roster.querySelectorAll(".pick").forEach((p) => p.setAttribute("aria-checked", String(p === b)));
    updateEnter();
  });
  roster.appendChild(b);
  if (saved && saved.sprite === key) b.click();
});

if (saved && saved.name) nameInput.value = saved.name;

function updateEnter() {
  enterBtn.disabled = !(chosen && nameInput.value.trim());
}
nameInput.addEventListener("input", updateEnter);
nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !enterBtn.disabled) enterBtn.click(); });

enterBtn.addEventListener("click", () => {
  const profile = { sprite: chosen, name: nameInput.value.trim().slice(0, 8) };
  store.set(profile);
  selectEl.hidden = true;
  selectEl.style.display = "none";
  hallEl.hidden = false;
  startHall(profile);
});

document.getElementById("changeBtn").addEventListener("click", () => {
  hallEl.hidden = true;
  selectEl.hidden = false;
  selectEl.style.display = "";
  fitText(selectEl);
});

fitText(selectEl);
document.fonts && document.fonts.ready.then(() => fitText(selectEl));

/* =========================================================
   2. 웨딩홀
   ========================================================= */
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const zoneEl = document.getElementById("zoneName");
const tipEl = document.getElementById("tip");

let W = 0, H = 0, dpr = 1, floorTop = 0, floorBottom = 0;
let bg = null; // 미리 그려둔 배경
let camX = 0;
let running = false;
let player = null;
const entities = [];
let last = performance.now();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

class Person {
  constructor({ sprite, name, x, y, npc = false, fixed = false }) {
    this.sprite = sprite;
    this.img = loadImage(sprite);
    this.name = name;
    this.x = x; this.y = y;
    this.tx = x; this.ty = y;
    this.npc = npc; this.fixed = fixed;
    this.face = 1;
    this.walkT = 0;
    this.bubble = null;
    this.nextThink = 1 + Math.random() * 3;
  }
  get moving() { return Math.hypot(this.tx - this.x, this.ty - this.y) > 2; }
  say(text, secs = 3) { this.bubble = { text, until: performance.now() + secs * 1000 }; }
  update(dt) {
    if (this.npc && !this.fixed) {
      this.nextThink -= dt;
      if (this.nextThink <= 0) {
        this.nextThink = 3 + Math.random() * 5;
        if (Math.random() < 0.65) {
          this.tx = clamp(this.x + (Math.random() - 0.5) * 360, 40, MAP_W - 40);
          this.ty = floorTop + 20 + Math.random() * (floorBottom - floorTop - 20);
        }
        if (Math.random() < 0.3) this.say(BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)]);
      }
    }
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 2) {
      const speed = (this === player ? 150 : 70) * dt;
      const k = Math.min(1, speed / dist);
      this.x += dx * k; this.y += dy * k;
      if (Math.abs(dx) > 1) this.face = dx < 0 ? -1 : 1;
      this.walkT += dt;
    } else {
      this.walkT = 0;
    }
  }
  scale() {
    // 안쪽(위)일수록 살짝 작게
    const t = (this.y - floorTop) / Math.max(1, floorBottom - floorTop);
    return 0.86 + 0.18 * t;
  }
  bounds() {
    const s = this.scale();
    const h = 96 * s;
    const w = this.img.naturalWidth ? (this.img.naturalWidth / this.img.naturalHeight) * h : h * 0.6;
    return { x: this.x - w / 2, y: this.y - h, w, h };
  }
  draw(now) {
    if (!this.img.complete || !this.img.naturalWidth) return;
    const s = this.scale();
    const h = 96 * s;
    const w = (this.img.naturalWidth / this.img.naturalHeight) * h;
    const hop = this.moving && !reduceMotion ? Math.abs(Math.sin(this.walkT * 11)) * 6 * s : 0;
    const squash = this.moving && !reduceMotion ? 1 - Math.abs(Math.cos(this.walkT * 11)) * 0.04 : 1;
    const sx = this.x - camX;

    // 그림자
    ctx.fillStyle = "rgba(30, 18, 34, 0.28)";
    ctx.beginPath();
    ctx.ellipse(sx, this.y, w * 0.32 * (1 - hop / 40), 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(sx, this.y - hop);
    ctx.scale(this.face, 1);
    ctx.drawImage(this.img, -w / 2, -h * squash, w, h * squash);
    ctx.restore();

    // 이름표
    const top = this.y - h - hop;
    ctx.font = `12px MaruBuri, serif`;
    const tw = ctx.measureText(this.name).width;
    const isMe = this === player;
    roundRect(sx - tw / 2 - 8, top - 22, tw + 16, 18, 9, isMe ? "rgba(216, 189, 138, 0.95)" : "rgba(18, 13, 22, 0.72)");
    ctx.fillStyle = isMe ? "#120d16" : "#efe6d6";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.name, sx, top - 13);

    // 말풍선
    if (this.bubble && now < this.bubble.until) {
      ctx.font = `14px MaruBuri, serif`;
      const bw = ctx.measureText(this.bubble.text).width + 24;
      const by = top - 62;
      roundRect(sx - bw / 2, by, bw, 32, 12, "#fcf9f3");
      ctx.beginPath();
      ctx.moveTo(sx - 6, by + 32); ctx.lineTo(sx + 6, by + 32); ctx.lineTo(sx, by + 40); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#2a1d2e";
      ctx.fillText(this.bubble.text, sx, by + 16);
    } else this.bubble = null;
  }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function roundRect(x, y, w, h, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

/* ---------- 배경 그리기 (도트 느낌: 2px 단위 블록) ---------- */
function buildBackground() {
  const c = document.createElement("canvas");
  c.width = MAP_W * dpr; c.height = H * dpr;
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  const P = 2;
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x / P) * P, Math.round(y / P) * P, Math.max(P, Math.round(w / P) * P), Math.max(P, Math.round(h / P) * P)); };
  let seed = 11;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  // 벽
  const wall = g.createLinearGradient(0, 0, 0, floorTop);
  wall.addColorStop(0, "#1a1220"); wall.addColorStop(1, "#2b1f31");
  g.fillStyle = wall; g.fillRect(0, 0, MAP_W, floorTop);

  // 천장 몰딩
  for (let x = 0; x < MAP_W; x += 12) px(x, 18, 8, 4, "#3a2b3e");
  px(0, 24, MAP_W, 2, "rgba(216,189,138,0.35)");

  // 벽 패널 + 아치 창
  const archY = floorTop - H * 0.36;
  for (let x = 30; x < MAP_W; x += 150) {
    if (x > 520 && x < 760) continue; // 꽃 아치 자리
    if (x > 960 && x < 1180) continue; // 포토존 자리
    const aw = 64, ah = H * 0.3;
    g.fillStyle = "#33263a";
    g.beginPath(); g.moveTo(x, archY + ah); g.lineTo(x, archY + aw / 2); g.arc(x + aw / 2, archY + aw / 2, aw / 2, Math.PI, 0); g.lineTo(x + aw, archY + ah); g.fill();
    g.fillStyle = "#1d1524";
    g.beginPath(); g.moveTo(x + 5, archY + ah); g.lineTo(x + 5, archY + aw / 2); g.arc(x + aw / 2, archY + aw / 2, aw / 2 - 5, Math.PI, 0); g.lineTo(x + aw - 5, archY + ah); g.fill();
    for (let k = 0; k < 10; k++) px(x + 8 + rnd() * (aw - 16), archY + 10 + rnd() * (ah - 20), 2, 2, rnd() > 0.5 ? "#d8bd8a" : "#8f80b8");
    // 벽등
    px(x + aw + 38, archY + 30, 6, 10, "#c79e5d");
    const glow = g.createRadialGradient(x + aw + 41, archY + 32, 0, x + aw + 41, archY + 32, 40);
    glow.addColorStop(0, "rgba(255,226,170,0.25)"); glow.addColorStop(1, "rgba(255,226,170,0)");
    g.fillStyle = glow; g.fillRect(x + aw, archY - 10, 84, 84);
  }

  // 징두리 판넬
  px(0, floorTop - 34, MAP_W, 34, "#251a2b");
  for (let x = 6; x < MAP_W; x += 60) { px(x, floorTop - 28, 48, 2, "#3b2d40"); px(x, floorTop - 8, 48, 2, "#3b2d40"); px(x, floorTop - 28, 2, 22, "#3b2d40"); px(x + 46, floorTop - 28, 2, 22, "#3b2d40"); }

  // 바닥: 대리석
  const fl = g.createLinearGradient(0, floorTop, 0, H);
  fl.addColorStop(0, "#d9d1dd"); fl.addColorStop(1, "#a99cb0");
  g.fillStyle = fl; g.fillRect(0, floorTop, MAP_W, H - floorTop);
  px(0, floorTop, MAP_W, 3, "#d8bd8a");
  let gap = 10;
  for (let y = floorTop + 10; y < H; y += gap) { px(0, y, MAP_W, 1, "rgba(120,100,130,0.22)"); gap *= 1.35; }
  for (let i = 0; i < 40; i++) {
    const x = rnd() * MAP_W, y = floorTop + 8 + rnd() * (H - floorTop - 10);
    g.strokeStyle = "rgba(140,120,150,0.25)"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + rnd() * 30, y + (rnd() - 0.3) * 12); g.stroke();
  }
  // 버진로드 (예식홀 구간을 가로지르는 러너)
  const rTop = floorTop + (floorBottom - floorTop) * 0.35;
  px(380, rTop, 560, 26, "#f6f1f7");
  px(380, rTop, 560, 2, "#d8bd8a"); px(380, rTop + 24, 560, 2, "#d8bd8a");
  for (let x = 390; x < 940; x += 22) px(x, rTop + 6 + (rnd() * 12 | 0), 2, 2, rnd() > 0.5 ? "#e9b9c6" : "#b9a3d6");

  // 꽃 뭉치 그리는 도구
  const FLOWERS = ["#b9a3d6", "#f4d7de", "#ffffff", "#e9b9c6", "#d9cdee", "#f6e3cf", "#8a78b8"];
  function bloom(cx, cy, r, n) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8;
      px(x, y, 4, 4, FLOWERS[(rnd() * FLOWERS.length) | 0]);
      if (rnd() < 0.25) px(x + 2, y + 4, 4, 2, "#7f9576");
    }
  }

  /* --- 로비 --- */
  // 입구 문
  const dx = 70, dw = 110, dh = H * 0.34;
  px(dx - 8, floorTop - dh - 8, dw + 16, dh + 8, "#c79e5d");
  px(dx, floorTop - dh, dw, dh, "#3b2a33");
  px(dx + dw / 2 - 1, floorTop - dh, 2, dh, "#c79e5d");
  px(dx + dw / 2 - 12, floorTop - dh * 0.5, 4, 10, "#f1d9a0"); px(dx + dw / 2 + 8, floorTop - dh * 0.5, 4, 10, "#f1d9a0");
  bloom(dx - 4, floorTop - dh - 4, 22, 70); bloom(dx + dw + 4, floorTop - dh - 4, 22, 70); bloom(dx + dw / 2, floorTop - dh - 12, 28, 90);
  // 웰컴 보드 (이젤)
  const ex = 250;
  px(ex - 2, floorTop - 6, 4, 12, "#6b4e3a"); px(ex - 30, floorTop - 4, 4, 10, "#6b4e3a"); px(ex + 26, floorTop - 4, 4, 10, "#6b4e3a");
  px(ex - 40, floorTop - 120, 80, 104, "#c79e5d");
  px(ex - 36, floorTop - 116, 72, 96, "#f7f1e6");
  g.fillStyle = "#2a1d2e"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "12px Dandi, serif"; g.fillText("WELCOME", ex, floorTop - 98);
  g.font = "13px Dandi, serif"; g.fillText("태용", ex, floorTop - 76); g.fillText("원선", ex, floorTop - 50);
  g.fillStyle = "#a593d1"; g.font = "10px MaruBuri, serif"; g.fillText("그리고", ex, floorTop - 63);
  g.fillStyle = "#8c7a68"; g.font = "10px MaruBuri, serif"; g.fillText("2027.10.16", ex, floorTop - 32);
  bloom(ex, floorTop - 118, 18, 50);
  // 방명록 테이블
  px(310, floorTop - 30, 60, 6, "#f7f1e6"); px(314, floorTop - 24, 52, 24, "#e8dfe9"); px(326, floorTop - 36, 28, 6, "#ffffff"); px(352, floorTop - 42, 2, 10, "#2a1d2e");

  /* --- 예식홀: 꽃 아치 + 단상 --- */
  const ax = 650;
  px(ax - 120, floorTop - 14, 240, 14, "#efe6d6"); px(ax - 120, floorTop - 14, 240, 2, "#d8bd8a");
  for (let a = 0; a <= Math.PI; a += 0.06) {
    const x = ax + Math.cos(a) * 110, y = floorTop - 20 - Math.sin(a) * (H * 0.34);
    bloom(x, y, 16, 26);
  }
  bloom(ax - 112, floorTop - 26, 26, 80); bloom(ax + 112, floorTop - 26, 26, 80);
  // 하객석 꽃 스탠드
  [430, 520, 780, 870].forEach((x) => {
    px(x - 2, floorTop - 70, 4, 70, "#c79e5d"); px(x - 10, floorTop - 4, 20, 4, "#c79e5d");
    bloom(x, floorTop - 82, 18, 60);
  });

  /* --- 포토존: 전구 액자 --- */
  const fx = 1070, fw = 180, fh = H * 0.3, fy = floorTop - fh - 30;
  px(fx - fw / 2 - 10, fy - 10, fw + 20, fh + 20, "#c79e5d");
  px(fx - fw / 2, fy, fw, fh, "#2b1f31");
  bloom(fx - fw / 2 - 8, fy + fh, 28, 90); bloom(fx + fw / 2 + 8, fy - 6, 24, 70);
  g.fillStyle = "rgba(216,189,138,0.9)"; g.font = "28px Dandi, serif"; g.fillText("10.16", fx, fy + fh * 0.45);
  g.fillStyle = "rgba(239,230,214,0.7)"; g.font = "11px MaruBuri, serif"; g.fillText("태용 그리고 원선", fx, fy + fh * 0.45 + 26);

  /* --- 연회장: 원형 테이블 + 케이크 --- */
  [1260, 1420].forEach((x, i) => {
    const y = floorTop + 4;
    px(x - 50, y - 26, 100, 8, "#f7f1e6");
    px(x - 46, y - 18, 92, 26, "#e8dfe9");
    px(x - 46, y + 4, 92, 2, "#d8bd8a");
    px(x - 18, y - 34, 6, 8, "#ffffff"); px(x + 12, y - 34, 6, 8, "#ffffff");
    bloom(x, y - 34, 10, 26);
    if (i === 1) {
      px(x - 16, y - 66, 32, 14, "#fff7ee"); px(x - 22, y - 52, 44, 16, "#fff7ee"); px(x - 28, y - 36, 56, 10, "#fff7ee");
      px(x - 22, y - 52, 44, 2, "#e9b9c6"); px(x - 28, y - 36, 56, 2, "#e9b9c6");
      bloom(x, y - 70, 8, 16);
    }
  });

  bg = c;
}

/* ---------- 움직이는 장식: 샹들리에, 포토존 전구, 금가루 ---------- */
const dust = Array.from({ length: 40 }, () => ({ x: Math.random() * MAP_W, y: Math.random() * 600, v: 6 + Math.random() * 12, p: Math.random() * 6 }));

function drawChandelier(cx, now, size = 1) {
  const sx = cx - camX;
  if (sx < -200 || sx > W + 200) return;
  const top = 26;
  ctx.fillStyle = "#c79e5d";
  ctx.fillRect(sx - 1, top, 2, 28 * size);
  const rings = [[18, 56], [34, 72], [48, 90], [36, 108], [20, 122]];
  const glow = ctx.createRadialGradient(sx, top + 80 * size, 0, sx, top + 80 * size, 160 * size);
  glow.addColorStop(0, "rgba(255,228,180,0.22)"); glow.addColorStop(1, "rgba(255,228,180,0)");
  ctx.fillStyle = glow; ctx.fillRect(sx - 170 * size, top, 340 * size, 260 * size);
  rings.forEach(([r, y], k) => {
    const n = 8 + k * 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + now / 4000;
      const x = sx + Math.cos(a) * r * size;
      const z = Math.sin(a);
      const yy = top + (y + z * 3) * size;
      const tw = 0.5 + 0.5 * Math.sin(now / 300 + i * 2 + k);
      const front = z > -0.2;
      for (let b = 0; b < 3; b++) {
        ctx.fillStyle = front ? `rgba(255,${238 - b * 6},${206 + b * 10},${0.55 + 0.45 * tw})` : "rgba(150,130,140,0.5)";
        ctx.fillRect(Math.round(x), Math.round(yy + b * 5 * size), 2, 2);
      }
      if (front && tw > 0.94) {
        ctx.fillStyle = "#fffaf0";
        ctx.fillRect(Math.round(x) - 3, Math.round(yy + 14 * size), 8, 2);
        ctx.fillRect(Math.round(x), Math.round(yy + 11 * size), 2, 8);
      }
    }
  });
}

function drawMarquee(now) {
  const fx = 1070, fw = 180, fh = H * 0.3, fy = floorTop - fh - 30;
  const sx = fx - camX;
  if (sx < -200 || sx > W + 200) return;
  let i = 0;
  const bulb = (x, y) => {
    const on = Math.sin(now / 250 + i++ * 0.7) > -0.2;
    ctx.fillStyle = on ? "#fff3cf" : "#7a6650";
    ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
    if (on) { ctx.fillStyle = "rgba(255,230,170,0.25)"; ctx.fillRect(Math.round(x) - 5, Math.round(y) - 5, 10, 10); }
  };
  for (let x = sx - fw / 2 - 5; x <= sx + fw / 2 + 5; x += 15) { bulb(x, fy - 5); bulb(x, fy + fh + 5); }
  for (let y = fy + 10; y < fy + fh; y += 15) { bulb(sx - fw / 2 - 5, y); bulb(sx + fw / 2 + 5, y); }
}

/* ---------- 화면 크기 ---------- */
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  floorTop = Math.round(H * 0.6);
  floorBottom = H - 96;
  buildBackground();
  for (const e of entities) { e.y = clamp(e.y, floorTop + 10, floorBottom); e.ty = clamp(e.ty, floorTop + 10, floorBottom); }
}

/* ---------- 터치 ---------- */
canvas.addEventListener("pointerdown", (e) => {
  if (!player) return;
  const wx = e.clientX + camX, wy = e.clientY;
  tipEl.classList.add("gone");

  // 신랑·신부를 누르면 인사
  for (const p of entities) {
    if (!p.fixed) continue;
    const b = p.bounds();
    if (wx >= b.x && wx <= b.x + b.w && wy >= b.y - 20 && wy <= b.y + b.h) {
      const lines = p.sprite === COUPLE.bride
        ? ["와줘서 정말 고마워요", "오늘 예쁘게 봐주세요", `${player.name}님 반가워요!`]
        : ["와주셔서 감사합니다", "맛있게 드시고 가세요", `${player.name}님 환영해요!`];
      p.say(lines[Math.floor(Math.random() * lines.length)], 3);
      player.tx = clamp(p.x + (player.x < p.x ? -60 : 60), 40, MAP_W - 40);
      player.ty = clamp(p.y + 24, floorTop + 10, floorBottom);
      return;
    }
  }
  player.tx = clamp(wx, 30, MAP_W - 30);
  player.ty = clamp(wy, floorTop + 14, floorBottom);
});

/* ---------- 루프 ---------- */
function frame(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  for (const e of entities) e.update(dt);

  // 카메라
  const target = clamp(player.x - W / 2, 0, Math.max(0, MAP_W - W));
  camX += (target - camX) * Math.min(1, dt * 6);

  // 구역 이름
  const z = ZONES.find((zz) => player.x >= zz.from && player.x < zz.to) || ZONES[0];
  if (zoneEl.textContent !== z.name) zoneEl.textContent = z.name;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(bg, Math.round(camX * dpr), 0, W * dpr, H * dpr, 0, 0, W, H);

  drawChandelier(650, now, 1.2);
  drawChandelier(1340, now, 0.8);
  drawChandelier(160, now, 0.7);
  drawMarquee(now);

  // 금가루
  for (const d of dust) {
    d.y -= d.v * dt; if (d.y < 0) { d.y = floorTop; d.x = Math.random() * MAP_W; }
    const sx = d.x - camX;
    if (sx < 0 || sx > W) continue;
    ctx.fillStyle = `rgba(241,217,160,${0.25 + 0.35 * Math.sin(now / 600 + d.p)})`;
    ctx.fillRect(Math.round(sx), Math.round(d.y), 2, 2);
  }

  // 사람들: 안쪽부터
  [...entities].sort((a, b) => a.y - b.y).forEach((e) => e.draw(now));

  requestAnimationFrame(frame);
}

function startHall(profile) {
  resize();
  entities.length = 0;
  const mid = (floorTop + floorBottom) / 2;

  // 신랑·신부 (예식홀 꽃 아치 아래)
  entities.push(new Person({ sprite: COUPLE.groom, name: "신랑 태용", x: 620, y: floorTop + 18, npc: true, fixed: true }));
  entities.push(new Person({ sprite: COUPLE.bride, name: "신부 원선", x: 682, y: floorTop + 18, npc: true, fixed: true }));

  // 분위기용 하객 (나중에 실제 접속자로 바뀌어요)
  const others = GUESTS.filter((g) => g !== profile.sprite).sort(() => Math.random() - 0.5).slice(0, 6);
  const botNames = BOT_NAMES.filter((n) => n !== profile.name);
  others.forEach((sp, i) => {
    entities.push(new Person({
      sprite: sp, name: botNames[i % botNames.length],
      x: 300 + i * 190 + Math.random() * 60,
      y: floorTop + 24 + Math.random() * (floorBottom - floorTop - 30),
      npc: true,
    }));
  });

  player = new Person({ sprite: profile.sprite, name: profile.name, x: 140, y: mid });
  entities.push(player);
  camX = 0;
  tipEl.classList.remove("gone");
  fitText(hallEl);

  if (!running) {
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
}

window.addEventListener("resize", () => { if (running) resize(); });
document.fonts && document.fonts.ready.then(() => { if (running) buildBackground(); });
