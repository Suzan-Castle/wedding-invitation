/* =========================================================
   청첩장 정보는 여기서만 고치면 돼요
   ========================================================= */
const CONFIG = {
  date: new Date("2027-10-16T13:20:00+09:00"),
  venue: "신도림 웨딩시티 스타티스홀",
  address: "서울특별시 구로구 새말로 97 신도림테크노마트 8층",
  mapKeyword: "신도림웨딩시티",

  // 사진: images 폴더에 넣고 파일명만 적기 (6장 단위로 배치가 예쁘게 맞아요)
  gallery: ["g1.jpg", "g2.jpg", "g3.jpg", "g4.jpg", "g5.jpg", "g6.jpg"],

  // 마음 전하실 곳 (정해지면 채우기)
  accounts: [
    {
      side: "신랑측",
      list: [
        { who: "신랑 이태용", bank: "은행명", number: "000-0000-0000" },
        { who: "신랑 아버지", bank: "은행명", number: "000-0000-0000" },
        { who: "신랑 어머니", bank: "은행명", number: "000-0000-0000" },
      ],
    },
    {
      side: "신부측",
      list: [
        { who: "신부 성원선", bank: "은행명", number: "000-0000-0000" },
        { who: "신부 아버지", bank: "은행명", number: "000-0000-0000" },
        { who: "신부 어머니", bank: "은행명", number: "000-0000-0000" },
      ],
    },
  ],
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =========================================================
   한 줄 맞춤: .fit 문단은 <br> 기준으로 줄을 나누고,
   어떤 줄이 화면보다 길면 그 문단 전체 글자 크기를 줄여서
   한두 글자만 다음 줄로 떨어지는 일이 없게 해요.
   ========================================================= */
const fitEls = [...document.querySelectorAll(".fit")];
fitEls.forEach((el) => {
  if (el.tagName === "DIV") return; // 이름 줄은 통째로 한 줄
  const parts = el.innerHTML.split(/<br\s*\/?>/i).map((s) => s.trim()).filter(Boolean);
  el.innerHTML = parts.map((p) => `<span class="ln">${p}</span>`).join("");
});

function fitAll() {
  fitEls.forEach((el) => {
    el.style.fontSize = "";
    const base = parseFloat(getComputedStyle(el).fontSize);
    const avail = el.clientWidth;
    if (!avail) return;
    const lines = el.tagName === "DIV" ? [el] : [...el.querySelectorAll(".ln")];
    const widest = Math.max(...lines.map((l) => l.scrollWidth));
    if (widest > avail) el.style.fontSize = `${Math.floor(base * (avail / widest) * 0.97 * 10) / 10}px`;
  });
}
fitAll();
document.fonts && document.fonts.ready.then(fitAll);
window.addEventListener("resize", fitAll);

/* =========================================================
   3D 샹들리에
   여러 층의 원형 링에 크리스탈 줄이 달려 천천히 돌아요.
   옆으로 쓸면 관성 있게 돌고, 빛 방향에 맞은 크리스탈이 반짝여요.
   ========================================================= */
(function chandelier() {
  const canvas = document.getElementById("chandelier");
  const cover = document.getElementById("cover");
  const hint = document.getElementById("touchHint");
  const ctx = canvas.getContext("2d");

  // 미리 그려두는 빛 스프라이트
  function sprite(size, stops) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => grd.addColorStop(o, col));
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return c;
  }
  const BEAD = sprite(32, [[0, "rgba(255,255,255,1)"], [0.18, "rgba(255,246,224,0.95)"], [0.4, "rgba(240,214,160,0.35)"], [1, "rgba(240,214,160,0)"]]);
  const HALO = sprite(64, [[0, "rgba(255,236,196,0.55)"], [0.35, "rgba(255,220,170,0.14)"], [1, "rgba(255,220,170,0)"]]);
  const LILAC = sprite(32, [[0, "rgba(255,255,255,1)"], [0.2, "rgba(226,214,255,0.9)"], [0.45, "rgba(170,150,220,0.3)"], [1, "rgba(170,150,220,0)"]]);

  // 물방울 모양 크리스탈
  const DROP = (() => {
    const c = document.createElement("canvas");
    c.width = 24; c.height = 48;
    const g = c.getContext("2d");
    const grd = g.createLinearGradient(2, 8, 22, 44);
    grd.addColorStop(0, "#fff7e6"); grd.addColorStop(0.35, "#e9cf98");
    grd.addColorStop(0.5, "#ffffff"); grd.addColorStop(0.7, "#c9a466"); grd.addColorStop(1, "#fff1d0");
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(12, 2); g.lineTo(21, 22); g.lineTo(12, 46); g.lineTo(3, 22); g.closePath();
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(12, 2); g.lineTo(12, 46); g.moveTo(3, 22); g.lineTo(21, 22); g.stroke();
    return c;
  })();

  let W, H, dpr, cx, topY, scale, items = [], dust = [];
  let rot = 0, spin = 0.12, sway = 0, swayVel = 0;
  const t0 = performance.now();

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cover.clientWidth; H = cover.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2;
    topY = H * 0.06;
    scale = Math.min(W / 390, H / 740) * 1.04;
    items = [];

    const Rmax = 150 * scale;
    const tiers = 6;
    for (let k = 0; k < tiers; k++) {
      const f = (k + 1) / (tiers + 1);
      const r = Rmax * (0.28 + 0.72 * Math.sin(Math.PI * f * 0.92));
      const y = topY + (22 + k * 44) * scale;
      const n = Math.round(9 + r / (10 * scale));
      const strandLen = Math.round(5 + (tiers - Math.abs(k - 3.2)) * 1.6);
      for (let i = 0; i < n; i++) {
        const th = (i / n) * Math.PI * 2 + k * 0.21;
        // 줄
        for (let b = 0; b < strandLen; b++) {
          items.push({ th, r, y: y + b * 8.6 * scale, depth: b / strandLen, kind: "bead" });
        }
        items.push({ th, r, y: y + strandLen * 8.6 * scale + 4 * scale, depth: 1, kind: "drop", tier: k, seed: Math.random() * 100 });
        // 링 사이 늘어진 구슬 장식
        const th2 = ((i + 1) / n) * Math.PI * 2 + k * 0.21;
        for (let s = 1; s < 5; s++) {
          const u = s / 5;
          items.push({ th: th + (th2 - th) * u, r, y: y + Math.sin(Math.PI * u) * 12 * scale, depth: 0, kind: "swag" });
        }
      }
    }
    // 가운데 기둥에서 떨어지는 긴 줄
    for (let b = 0; b < 34; b++) items.push({ th: 0, r: 0, y: topY + b * 8 * scale, depth: b / 34, kind: "core" });
    items.push({ th: 0, r: 0, y: topY + 34 * 8 * scale + 6, depth: 1, kind: "drop", tier: 9 });

    dust = Array.from({ length: 46 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      v: 4 + Math.random() * 10, s: 0.6 + Math.random() * 1.6, p: Math.random() * 6.28,
    }));
  }

  // 터치로 돌리기
  let lastX = null, lastT = 0;
  cover.addEventListener("pointerdown", (e) => {
    lastX = e.clientX; lastT = performance.now();
    swayVel += 0.6;
    hint.classList.add("gone");
  });
  cover.addEventListener("pointermove", (e) => {
    if (lastX === null) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dt = Math.max(16, now - lastT);
    rot += dx * 0.006;
    spin = (dx / dt) * 6;
    swayVel += dx * 0.02;
    lastX = e.clientX; lastT = now;
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) =>
    cover.addEventListener(ev, () => { lastX = null; })
  );

  const LIGHT = -0.6; // 빛이 오는 방향
  let prev = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    const elapsed = now - t0;

    if (lastX === null) {
      spin += (0.12 - spin) * 0.02; // 천천히 기본 속도로
      rot += spin * dt;
    }
    swayVel += -sway * 0.06; swayVel *= 0.93; sway += swayVel * dt * 10;

    ctx.clearRect(0, 0, W, H);

    // 천장 빛
    const intro = reduceMotion ? 1 : Math.min(1, elapsed / 1800);
    const glow = ctx.createRadialGradient(cx, topY + 150 * scale, 0, cx, topY + 150 * scale, W * 0.9);
    glow.addColorStop(0, `rgba(255, 226, 176, ${0.26 * intro})`);
    glow.addColorStop(0.45, `rgba(170, 130, 120, ${0.07 * intro})`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // 금가루
    for (const d of dust) {
      d.y -= d.v * dt; d.x += Math.sin(now / 1500 + d.p) * 0.15;
      if (d.y < -4) { d.y = H + 4; d.x = Math.random() * W; }
      const a = (0.25 + 0.35 * Math.sin(now / 700 + d.p)) * intro;
      ctx.globalAlpha = Math.max(0, a);
      ctx.drawImage(BEAD, d.x - d.s * 2, d.y - d.s * 2, d.s * 4, d.s * 4);
    }

    // 투영 후 뒤에서 앞으로
    const proj = items.map((it) => {
      const a = it.th + rot;
      const z = Math.cos(a);
      const persp = 1 + z * 0.18;
      const swayX = sway * 6 * it.depth * scale;
      return {
        it, z, a,
        x: cx + Math.sin(a) * it.r * persp + swayX,
        y: it.y + z * it.r * 0.12,
        p: persp,
      };
    });
    proj.sort((m, n) => m.z - n.z);

    // 등장: 위에서부터 차례로 켜짐
    const reveal = reduceMotion ? 1e9 : (elapsed / 1600) * H;

    for (const q of proj) {
      if (q.y - topY > reveal) continue;
      const { it } = q;
      const front = (q.z + 1) / 2; // 0 뒤 ~ 1 앞
      const bright = 0.08 + 0.92 * Math.pow(front, 1.6);
      const tw = 0.75 + 0.25 * Math.sin(now / 420 + it.th * 7 + it.y);

      if (it.kind === "drop") {
        const w = 6.5 * scale * q.p, h = 13 * scale * q.p;
        ctx.globalAlpha = bright;
        ctx.drawImage(DROP, q.x - w / 2, q.y - 2, w, h);
        // 빛 방향과 맞으면 반짝
        const twinkle = Math.pow(Math.max(0, Math.sin(now / 900 + it.seed)), 30);
        const spec = Math.min(1, (Math.pow(Math.max(0, Math.cos(q.a - LIGHT)), 30) + twinkle * 0.8) * front);
        if (spec > 0.05) {
          const s = 26 * scale * spec + 8 * scale * spec;
          ctx.globalAlpha = spec;
          ctx.drawImage(HALO, q.x - s, q.y + h * 0.4 - s, s * 2, s * 2);
          star(q.x, q.y + h * 0.4, 14 * scale * spec, spec);
        }
      } else {
        const base = it.kind === "swag" ? 1.5 : it.kind === "core" ? 2.4 : 1.8;
        const s = base * scale * q.p * (0.85 + 0.3 * tw);
        ctx.globalAlpha = bright * (it.kind === "swag" ? 0.7 : 0.95);
        const spr = it.kind === "swag" && Math.round(it.th * 10) % 5 === 0 ? LILAC : BEAD;
        ctx.drawImage(spr, q.x - s * 2, q.y - s * 2, s * 4, s * 4);
      }
    }
    ctx.globalAlpha = 1;

    if (!reduceMotion) requestAnimationFrame(frame);
  }

  function star(x, y, r, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "#fffaf0";
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r * 0.12, y);
    ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r * 0.12, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.moveTo(x - r * 0.7, y); ctx.quadraticCurveTo(x, y, x, y - r * 0.1);
    ctx.quadraticCurveTo(x, y, x + r * 0.7, y); ctx.quadraticCurveTo(x, y, x, y + r * 0.1);
    ctx.quadraticCurveTo(x, y, x - r * 0.7, y);
    ctx.fill();
    ctx.restore();
  }

  build();
  window.addEventListener("resize", build);
  requestAnimationFrame(frame);
})();

/* ---------- 날짜 / 남은 날 ---------- */
function renderCountdown() {
  const el = document.getElementById("countdown");
  const now = new Date();
  const dayMs = 86400000;
  const kst = (d) => Math.floor((d.getTime() + 9 * 3600000) / dayMs);
  const left = kst(CONFIG.date) - kst(now);
  if (left > 0) el.innerHTML = `그날까지 <b>${left}</b>일`;
  else if (left === 0) el.textContent = "오늘이에요";
  else el.innerHTML = `함께한 지 <b>${-left}</b>일`;
}
renderCountdown();
setInterval(renderCountdown, 60000);

/* ---------- 사진 ---------- */
(function gallery() {
  const wrap = document.getElementById("gallery");
  const box = document.createElement("div");
  box.className = "lightbox";
  box.innerHTML = `<img alt="" /><button type="button">닫기</button>`;
  document.body.appendChild(box);
  const boxImg = box.querySelector("img");
  const close = () => box.classList.remove("open");
  box.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  CONFIG.gallery.forEach((file, i) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    tile.setAttribute("aria-label", `사진 ${i + 1} 크게 보기`);
    const img = new Image();
    img.loading = "lazy";
    img.alt = "";
    img.src = `images/${file}`;
    img.onerror = () => tile.classList.add("empty");
    const ph = document.createElement("span");
    ph.textContent = i + 1;
    tile.append(img, ph);
    tile.addEventListener("click", () => {
      if (tile.classList.contains("empty")) return;
      boxImg.src = img.src;
      box.classList.add("open");
    });
    wrap.appendChild(tile);
  });
})();

/* ---------- 지도 ---------- */
(function maps() {
  const q = encodeURIComponent(CONFIG.mapKeyword);
  document.getElementById("naverMap").href = `https://map.naver.com/p/search/${q}`;
  document.getElementById("kakaoMap").href = `https://map.kakao.com/link/search/${q}`;
  document.getElementById("tmap").addEventListener("click", (e) => {
    e.preventDefault();
    location.href = `tmap://search?name=${q}`;
    setTimeout(() => toast("티맵 앱이 있어야 열려요"), 1200);
  });
})();

/* ---------- 계좌 ---------- */
(function accounts() {
  const wrap = document.getElementById("accounts");
  CONFIG.accounts.forEach((group) => {
    const item = document.createElement("div");
    item.className = "acc";
    const head = document.createElement("button");
    head.type = "button";
    head.className = "acc-head";
    head.setAttribute("aria-expanded", "false");
    head.innerHTML = `<span></span><i aria-hidden="true"></i>`;
    head.querySelector("span").textContent = group.side;
    head.addEventListener("click", () => {
      const open = item.classList.toggle("open");
      head.setAttribute("aria-expanded", String(open));
    });
    const body = document.createElement("div");
    body.className = "acc-body";
    const inner = document.createElement("div");
    inner.className = "acc-inner";
    group.list.forEach((a) => {
      const row = document.createElement("div");
      row.className = "acc-row";
      const info = document.createElement("div");
      const who = document.createElement("small");
      who.textContent = a.who;
      const num = document.createElement("span");
      num.textContent = `${a.bank} ${a.number}`;
      info.append(who, num);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "복사";
      btn.dataset.copy = `${a.bank} ${a.number}`;
      row.append(info, btn);
      inner.appendChild(row);
    });
    body.appendChild(inner);
    item.append(head, body);
    wrap.appendChild(item);
  });
})();

/* ---------- 도트 웨딩홀 배경: 바닥에 깔린 도트 꽃길 ---------- */
(function hallDots() {
  const canvas = document.getElementById("hallDots");
  const ctx = canvas.getContext("2d");
  function paint() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const px = 8;
    const colors = ["#8a78b8", "#b3a4d8", "#efe3c8", "#d8bd8a", "#6f5f9c", "#c9a466"];
    let seed = 7;
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const rows = Math.ceil(H * 0.26 / px);
    for (let r = 0; r < rows; r++) {
      const y = H - (r + 1) * px;
      const density = 0.75 - r / rows * 0.7;
      for (let x = 0; x < W; x += px) {
        // 가운데는 버진로드처럼 비워두기
        const mid = Math.abs(x + px / 2 - W / 2);
        const road = 28 + r * 3.2;
        if (mid < road) continue;
        if (rand() > density) continue;
        ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
        ctx.globalAlpha = 0.35 + rand() * 0.5;
        ctx.fillRect(Math.round(x), Math.round(y), px - 1, px - 1);
      }
    }
    // 버진로드
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#d8bd8a";
    ctx.beginPath();
    ctx.moveTo(W / 2 - 28, H - rows * px);
    ctx.lineTo(W / 2 + 28, H - rows * px);
    ctx.lineTo(W / 2 + 28 + rows * 3.2, H);
    ctx.lineTo(W / 2 - 28 - rows * 3.2, H);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  paint();
  window.addEventListener("resize", paint);
})();

/* ---------- 복사 ---------- */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy]");
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    toast("복사했어요");
  } catch {
    toast("길게 눌러서 복사해주세요");
  }
});

/* ---------- 캘린더 저장 ---------- */
document.getElementById("addCalendar").addEventListener("click", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//taeyong-wonsun//wedding//KO",
    "BEGIN:VEVENT",
    "UID:taeyong-wonsun-20271016@wedding",
    "DTSTART;TZID=Asia/Seoul:20271016T132000",
    "DTEND;TZID=Asia/Seoul:20271016T150000",
    "SUMMARY:이태용, 성원선 결혼식",
    `LOCATION:${CONFIG.venue}\\, ${CONFIG.address}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  a.download = "taeyong-wonsun-wedding.ics";
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ---------- 공유 ---------- */
document.getElementById("shareBtn").addEventListener("click", async () => {
  const data = {
    title: "이태용, 성원선 결혼합니다",
    text: "2027년 10월 16일 토요일 오후 1시 20분, 신도림 웨딩시티 스타티스홀",
    url: location.href,
  };
  if (navigator.share) {
    try { await navigator.share(data); } catch {}
  } else {
    try { await navigator.clipboard.writeText(location.href); toast("링크를 복사했어요"); } catch {}
  }
});

/* ---------- 토스트 ---------- */
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2000);
}
