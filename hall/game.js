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

// 오른쪽을 보고 걷는 그림(2장)이 있는 캐릭터. 왼쪽으로 갈 땐 좌우로 뒤집어요
const HAS_WALK = new Set([
  "guest-m-mocha", "guest-f-ribbon", "guest-f-butter", "guest-m-black",
  "guest-f-sage", "guest-f-rose", "bride-a", "groom-a",
  "guest-m-navy", "guest-f-tweed", "guest-f-coral", "guest-m-coat",
  "guest-f-sky", "guest-f-lilac", "bride-b", "groom-b",
]);

// 구역은 배경 그림의 가로 비율로 나눠요
const ZONE_FRACS = [
  { name: "로비", from: 0, to: 0.29 },
  { name: "예식홀", from: 0.29, to: 0.61 },
  { name: "포토존", from: 0.61, to: 0.8 },
  { name: "연회장", from: 0.8, to: 1.01 },
];
const BG_SRC = "../assets/hall/hall-bg.webp";
const BG_FLOOR = 0.776;   // 그림 속 바닥이 시작되는 높이
const BG_STAGE = 0.735;   // 꽃 아치 아래 단상 위 (신랑·신부 자리)
const ARCH_X = 0.452;     // 꽃 아치 가운데
let MAP_W = 1560;
let imgH = 0;

const BOT_NAMES = ["태용친구", "원선친구", "회사동기", "대학선배", "사촌언니", "후배", "고등학교친구"];
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
    this.walkImgs = HAS_WALK.has(sprite) ? [loadImage(sprite + "-walk1"), loadImage(sprite + "-walk2")] : null;
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
          this.tx = clamp(this.x + (Math.random() - 0.5) * 500, 40, MAP_W - 40);
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
    return clamp(0.86 + 0.18 * t, 0.84, 1.06);
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
    const walking = this.moving && !reduceMotion;
    const ph = this.walkT * 9;                 // 걸음 주기
    const step = Math.sin(ph);                  // -1 ~ 1: 왼발/오른발
    const bob = walking ? Math.abs(Math.cos(ph)) * 1.2 * s : 0; // 발 디딜 때 살짝 내려앉음
    const sway = walking ? step * 0.018 : 0;    // 몸이 아주 살짝 좌우로
    const hop = 0;
    const sx = this.x - camX;

    // 그림자
    ctx.fillStyle = "rgba(30, 18, 34, 0.28)";
    ctx.beginPath();
    ctx.ellipse(sx, this.y, w * 0.32, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    const nw = this.img.naturalWidth, nh = this.img.naturalHeight;
    const walkReady = this.walkImgs && this.walkImgs.every((im) => im.complete && im.naturalWidth);

    ctx.save();
    ctx.translate(sx, this.y);

    if (walking && walkReady) {
      // 가는 방향을 보고 걷기: 걸음 그림 2장을 번갈아
      const im = this.walkImgs[Math.floor(this.walkT / 0.17) % 2];
      const wh = h;
      const ww = (im.naturalWidth / im.naturalHeight) * wh;
      ctx.scale(this.face, 1);
      ctx.drawImage(im, -ww / 2, -wh + bob * 0.6, ww, wh);
    } else if (walking) {
      ctx.scale(this.face, 1);
      const cut = 0.86;
      const legSrcY = nh * cut, legSrcH = nh - legSrcY;
      const legH = h * (1 - cut);
      const lift = 2.6 * s, fwd = 1.2 * s;
      [{ sx0: 0, a: Math.max(0, step) }, { sx0: nw / 2, a: Math.max(0, -step) }].forEach(({ sx0, a }) => {
        ctx.drawImage(this.img, sx0, legSrcY, nw / 2, legSrcH,
          -w / 2 + (sx0 / nw) * w + a * fwd, -legH - a * lift, w / 2, legH);
      });
      ctx.save();
      ctx.translate(0, -legH + 2 * s);
      ctx.rotate(sway);
      ctx.drawImage(this.img, 0, 0, nw, legSrcY + 2, -w / 2, -(h * cut) + bob, w, h * cut + 1 * s);
      ctx.restore();
    } else {
      // 멈추면 정면
      ctx.drawImage(this.img, -w / 2, -h, w, h);
    }
    ctx.restore();

    // 이름표와 말풍선은 모아서 마지막에 겹치지 않게 배치해요
    const top = this.y - h;
    const isMe = this === player;
    ctx.font = "12px MaruBuri, serif";
    const tw = ctx.measureText(this.name).width + 16;
    // 이름표: 캐릭터와 같은 앞뒤 순서로 그려서, 앞사람이 있으면 그 뒤로 가려져요
    roundRect(sx - tw / 2, this.y + 6, tw, 18, 9, isMe ? "rgba(216, 189, 138, 0.95)" : "rgba(18, 13, 22, 0.72)");
    ctx.fillStyle = isMe ? "#120d16" : "#efe6d6";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(this.name, sx, this.y + 15.5);
    if (this.bubble && now < this.bubble.until) {
      ctx.font = "12px Dandi, serif";
      const nw2 = ctx.measureText(this.name).width;
      ctx.font = "14px MaruBuri, serif";
      const tw2 = ctx.measureText(this.bubble.text).width;
      const bw = nw2 + 8 + tw2 + 26;
      labelQueue.push({ kind: "bubble", owner: this, isMe, name: this.name, nameW: nw2, text: this.bubble.text, cx: sx, anchorY: top - 2, w: bw, h: 32 });
    } else this.bubble = null;
  }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/* ---------- 이름표·말풍선 겹침 방지: 겹치면 위로 쌓기 ---------- */
const labelQueue = [];
function drawLabels() {
  const placed = [];
  const GAP = 4;
  const overlaps = (r) => placed.find((p) =>
    r.x < p.x + p.w + GAP && r.x + r.w + GAP > p.x && r.y < p.y + p.h + GAP && r.y + r.h + GAP > p.y);
  // 순서: 이름표 먼저(앞사람 우선), 그다음 말풍선(내 것 먼저, 그다음 앞사람)
  const order = labelQueue.slice().sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "name" ? -1 : 1;
    if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
    return b.owner.y - a.owner.y;
  });
  for (const L of order) {
    let guard = 0, hit;
    let r;
    if (L.kind === "name") {
      // 이름표는 발밑, 겹치면 아래로
      r = { x: L.cx - L.w / 2, y: L.anchorY, w: L.w, h: L.h };
      while ((hit = overlaps(r)) && guard++ < 30) r.y = hit.y + hit.h + GAP;
    } else {
      // 말풍선은 머리 위, 겹치면 위로
      r = { x: L.cx - L.w / 2, y: L.anchorY - L.h - 8, w: L.w, h: L.h };
      while ((hit = overlaps(r)) && guard++ < 30) r.y = hit.y - r.h - GAP;
      r.y = Math.max(r.y, 52); // 위쪽 구역 이름표와 겹치지 않게
    }
    L.rect = r;
    placed.push(r);
  }
  // 그리기: 말풍선 꼬리/연결선 → 상자 → 글자
  for (const L of order) {
    const r = L.rect;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (L.kind === "name") {
      roundRect(r.x, r.y, r.w, r.h, 9, L.isMe ? "rgba(216, 189, 138, 0.95)" : "rgba(18, 13, 22, 0.72)");
      ctx.fillStyle = L.isMe ? "#120d16" : "#efe6d6";
      ctx.font = "12px MaruBuri, serif";
      ctx.fillText(L.text, L.cx, r.y + r.h / 2 + 0.5);
    } else {
      const lifted = L.anchorY - 8 - (r.y + r.h) > 6;
      roundRect(r.x, r.y, r.w, r.h, 12, L.isMe ? "#fff6dc" : "#fcf9f3");
      if (!lifted) {
        // 제자리일 때만 꼬리
        ctx.beginPath();
        ctx.moveTo(L.cx - 6, r.y + r.h); ctx.lineTo(L.cx + 6, r.y + r.h); ctx.lineTo(L.cx, r.y + r.h + 7); ctx.closePath();
        ctx.fill();
      }
      // 이름 + 내용
      const midY = r.y + r.h / 2 + 0.5;
      ctx.textAlign = "left";
      ctx.font = "12px Dandi, serif";
      ctx.fillStyle = L.isMe ? "#a8834b" : "#8a78b8";
      ctx.fillText(L.name, r.x + 13, midY);
      ctx.font = "14px MaruBuri, serif";
      ctx.fillStyle = "#2a1d2e";
      ctx.fillText(L.text, r.x + 13 + L.nameW + 8, midY);
      ctx.textAlign = "center";
    }
  }
  labelQueue.length = 0;
}

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

/* ---------- 배경: 힉스필드로 그린 스타티스홀 파노라마 ---------- */
const bgImg = new Image();
bgImg.src = BG_SRC;
bgImg.onload = () => { if (running) { resize(); } };

function buildBackground() {
  if (!bgImg.complete || !bgImg.naturalWidth) { bg = null; return; }
  const c = document.createElement("canvas");
  c.width = Math.round(MAP_W * dpr); c.height = Math.round(H * dpr);
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  g.imageSmoothingQuality = "high";
  const sw = bgImg.naturalWidth, sh = bgImg.naturalHeight;

  // 그림 아래 바닥: 늘리지 않고, 원래 바닥 색으로 대리석을 새로 그려 이어 붙여요
  const probe = document.createElement("canvas"); probe.width = 1; probe.height = 1;
  const pg = probe.getContext("2d");
  pg.drawImage(bgImg, 0, sh * 0.94, sw, sh * 0.06, 0, 0, 1, 1);
  const [pr, pgc, pb] = pg.getImageData(0, 0, 1, 1).data;
  const base = `rgb(${pr},${pgc},${pb})`;
  const deep = `rgb(${Math.round(pr * 0.9)},${Math.round(pgc * 0.88)},${Math.round(pb * 0.92)})`;
  const ext = g.createLinearGradient(0, imgH, 0, H);
  ext.addColorStop(0, base); ext.addColorStop(1, deep);
  g.fillStyle = ext; g.fillRect(0, imgH - 2, MAP_W, H - imgH + 2);

  let fseed = 7;
  const frnd = () => (fseed = (fseed * 9301 + 49297) % 233280) / 233280;
  // 타일 줄눈 (아래로 갈수록 간격 넓게)
  g.strokeStyle = "rgba(150, 128, 160, 0.16)"; g.lineWidth = 1;
  let ty = imgH + 14, step = 26;
  while (ty < H) { g.beginPath(); g.moveTo(0, ty); g.lineTo(MAP_W, ty); g.stroke(); ty += step; step *= 1.35; }
  // 비스듬한 줄눈 (그림 속 바닥 방향과 비슷하게)
  for (let x = -H; x < MAP_W + H; x += imgH * 0.32) {
    g.beginPath(); g.moveTo(x, imgH); g.lineTo(x - (H - imgH) * 0.55, H); g.stroke();
  }
  // 대리석 결
  for (let i = 0; i < MAP_W / 60; i++) {
    const x = frnd() * MAP_W, y = imgH + frnd() * (H - imgH);
    g.strokeStyle = `rgba(160, 140, 170, ${0.08 + frnd() * 0.1})`;
    g.lineWidth = 0.8 + frnd();
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + 20 + frnd() * 30, y + (frnd() - 0.5) * 16, x + 50 + frnd() * 60, y + (frnd() - 0.3) * 20);
    g.stroke();
  }
  // 은은한 빛 반사
  for (let i = 0; i < MAP_W / 400; i++) {
    const x = frnd() * MAP_W, y = imgH + 20 + frnd() * (H - imgH) * 0.5;
    const rg = g.createRadialGradient(x, y, 0, x, y, 90);
    rg.addColorStop(0, "rgba(255, 246, 230, 0.35)"); rg.addColorStop(1, "rgba(255, 246, 230, 0)");
    g.fillStyle = rg; g.fillRect(x - 90, y - 90, 180, 180);
  }
  g.drawImage(bgImg, 0, 0, MAP_W, imgH);
  // 그림 아래 가장자리를 새 바닥 색으로 부드럽게 녹이기
  const seam = g.createLinearGradient(0, imgH - imgH * 0.07, 0, imgH + 4);
  seam.addColorStop(0, `rgba(${pr},${pgc},${pb},0)`);
  seam.addColorStop(1, `rgba(${pr},${pgc},${pb},1)`);
  g.fillStyle = seam; g.fillRect(0, imgH - imgH * 0.07, MAP_W, imgH * 0.07 + 4);

  const U = (u) => u * MAP_W, V = (v) => v * imgH;
  g.textAlign = "center"; g.textBaseline = "middle";

  // 웰컴 보드 글씨 다시 쓰기
  g.fillStyle = "#fbf6ee";
  g.fillRect(U(0.2095), V(0.592), U(0.0225), V(0.106));
  const bx = U(0.2207);
  const boardW = U(0.0225);
  const fs = Math.max(6, Math.min(imgH * 0.022, boardW * 0.26));
  g.fillStyle = "#5b4a6e"; g.font = `${boardW * 0.155}px Dandi, serif`; g.fillText("WELCOME", bx, V(0.612));
  g.fillStyle = "#2a1d2e"; g.font = `${fs}px Dandi, serif`;
  g.fillText("태용", bx, V(0.638)); g.fillText("원선", bx, V(0.675));
  g.fillStyle = "#a593d1"; g.font = `${fs * 0.6}px MaruBuri, serif`; g.fillText("그리고", bx, V(0.657));

  // 포토존 액자 안 글씨
  const px0 = U(0.703), py0 = V(0.53);
  g.fillStyle = "rgba(246, 227, 180, 0.95)"; g.font = `${imgH * 0.075}px Dandi, serif`;
  g.fillText("10.16", px0, py0);
  g.fillStyle = "rgba(255, 245, 230, 0.8)"; g.font = `${imgH * 0.026}px MaruBuri, serif`;
  g.fillText("태용 그리고 원선", px0, py0 + imgH * 0.065);

  bg = c;
}

/* ---------- 움직이는 장식: 샹들리에 반짝임, 금가루 ---------- */
const GLINTS = [
  [0.452, 0.19], [0.388, 0.09], [0.5, 0.09], [0.367, 0.24], [0.532, 0.24], [0.896, 0.24], [0.452, 0.27],
];
const glints = [];
GLINTS.forEach(([u, v]) => { for (let i = 0; i < 6; i++) glints.push({ u: u + (Math.random() - 0.5) * 0.03, v: v + (Math.random() - 0.3) * 0.12, p: Math.random() * 10, s: 0.6 + Math.random() * 0.8 }); });
const dust = Array.from({ length: 50 }, () => ({ f: Math.random(), y: Math.random(), v: 0.012 + Math.random() * 0.02, p: Math.random() * 6 }));

function drawSparkles(now, dt) {
  for (const gl of glints) {
    const x = gl.u * MAP_W - camX, y = gl.v * imgH;
    if (x < -20 || x > W + 20) continue;
    const t = Math.sin(now / 520 + gl.p);
    if (t < 0.55) continue;
    const a = (t - 0.55) / 0.45;
    const r = 7 * gl.s * a;
    ctx.globalAlpha = a;
    ctx.fillStyle = "#fffaf0";
    ctx.fillRect(x - r, y - 0.75, r * 2, 1.5);
    ctx.fillRect(x - 0.75, y - r, 1.5, r * 2);
    ctx.fillStyle = "rgba(255, 236, 196, 0.5)";
    ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const d of dust) {
    d.y -= d.v * dt; if (d.y < 0) { d.y = 1; d.f = Math.random(); }
    const x = d.f * MAP_W - camX, y = d.y * floorTop;
    if (x < 0 || x > W) continue;
    ctx.fillStyle = `rgba(255, 232, 186, ${Math.max(0, 0.2 + 0.4 * Math.sin(now / 600 + d.p))})`;
    ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
  }
}

/* ---------- 화면 크기 ---------- */
function resize() {
  const oldW = MAP_W;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ratio = bgImg.naturalWidth ? bgImg.naturalWidth / bgImg.naturalHeight : 4.03;
  imgH = Math.round(Math.min(H * 0.64, H - 200));
  MAP_W = Math.round(imgH * ratio);
  floorTop = Math.round(imgH * (BG_FLOOR + 0.02));
  floorBottom = H - 96;
  buildBackground();
  for (const e of entities) {
    if (e.fixed) { e.x = ARCH_X * MAP_W + (e.sprite === COUPLE.groom ? -1 : 1) * imgH * 0.07; e.y = e.ty = imgH * BG_STAGE; e.tx = e.x; continue; }
    const k = MAP_W / (oldW || MAP_W);
    e.x *= k; e.tx *= k;
    e.y = clamp(e.y, floorTop + 10, floorBottom); e.ty = clamp(e.ty, floorTop + 10, floorBottom);
  }
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
  const fx = player.x / MAP_W;
  const z = ZONE_FRACS.find((zz) => fx >= zz.from && fx < zz.to) || ZONE_FRACS[0];
  if (zoneEl.textContent !== z.name) zoneEl.textContent = z.name;

  ctx.clearRect(0, 0, W, H);
  if (bg) ctx.drawImage(bg, Math.round(camX * dpr), 0, Math.min(W, MAP_W) * dpr, H * dpr, 0, 0, Math.min(W, MAP_W), H);
  drawSparkles(now, dt);

  // 사람들: 안쪽부터
  [...entities].sort((a, b) => a.y - b.y).forEach((e) => e.draw(now));
  drawLabels();

  requestAnimationFrame(frame);
}

function startHall(profile) {
  resize();
  entities.length = 0;
  const mid = (floorTop + floorBottom) / 2;

  // 신랑·신부 (예식홀 꽃 아치 아래)
  const gap = imgH * 0.07, stageY = imgH * BG_STAGE;
  entities.push(new Person({ sprite: COUPLE.groom, name: "신랑 태용", x: ARCH_X * MAP_W - gap, y: stageY, npc: true, fixed: true }));
  entities.push(new Person({ sprite: COUPLE.bride, name: "신부 원선", x: ARCH_X * MAP_W + gap, y: stageY, npc: true, fixed: true }));

  // 분위기용 하객 (나중에 실제 접속자로 바뀌어요)
  const others = GUESTS.filter((g) => g !== profile.sprite).sort(() => Math.random() - 0.5).slice(0, 6);
  const botNames = BOT_NAMES.filter((n) => n !== profile.name);
  others.forEach((sp, i) => {
    entities.push(new Person({
      sprite: sp, name: botNames[i % botNames.length],
      x: MAP_W * (0.12 + i * 0.14 + Math.random() * 0.04),
      y: floorTop + 24 + Math.random() * (floorBottom - floorTop - 30),
      npc: true,
    }));
  });

  player = new Person({ sprite: profile.sprite, name: profile.name, x: MAP_W * 0.1, y: mid });
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
