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
   샹들리에: 크리스탈 줄 사이에 10.16이 도트로 숨어 있어요.
   손가락으로 쓸면 줄이 흔들려요.
   ========================================================= */
(function chandelier() {
  const canvas = document.getElementById("chandelier");
  const cover = document.getElementById("cover");
  const hint = document.getElementById("touchHint");
  const ctx = canvas.getContext("2d");

  // 5x7 도트 글꼴
  const GLYPHS = {
    "1": [".#.", "##.", ".#.", ".#.", ".#.", ".#.", "###"],
    "0": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
    ".": [".", ".", ".", ".", ".", ".", "#"],
  };

  let W, H, dpr, cols, gap, strands, textCells;
  const t0 = performance.now();

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cover.clientWidth;
    H = cover.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    gap = W < 380 ? 8 : 9;
    cols = Math.floor(W / gap) + 2;
    const offsetX = (W - (cols - 1) * gap) / 2;
    const maxRows = Math.floor((H * 0.56) / gap);

    // 10.16 위치 (글자 사이 1칸)
    const word = "10.16";
    const wordCols = [...word].reduce((n, ch) => n + GLYPHS[ch][0].length, 0) + word.length - 1;
    const startCol = Math.floor((cols - wordCols) / 2);
    const startRow = Math.floor(maxRows * 0.42);
    textCells = new Set();
    let c = startCol;
    for (const ch of word) {
      const g = GLYPHS[ch];
      g.forEach((row, r) => [...row].forEach((px, i) => {
        if (px === "#") textCells.add(`${c + i},${startRow + r}`);
      }));
      c += g[0].length + 1;
    }

    strands = [];
    for (let i = 0; i < cols; i++) {
      const t = i / (cols - 1);
      // 둥근 돔 모양 샹들리에: 반원 실루엣 + 층층이 늘어진 크리스탈
      const u = 2 * t - 1;
      const dome = Math.sqrt(Math.max(0, 1 - u * u));
      const tier = (i % 3 === 0 ? 2 : i % 3 === 1 ? 0 : -1.5);
      const scallop = Math.abs(Math.sin(t * Math.PI * 7)) * 2.2;
      const len = Math.max(3, Math.round(maxRows * (0.34 + 0.6 * dome) + tier + scallop));
      const dots = [];
      for (let r = 0; r < len; r++) {
        dots.push({
          r,
          lit: textCells.has(`${i},${r}`),
          phase: Math.random() * Math.PI * 2,
          speed: 0.6 + Math.random() * 1.2,
        });
      }
      const centerDist = Math.abs(t - 0.5) * 2;
      strands.push({ x: offsetX + i * gap, dots, sway: 0, vel: 0, delay: centerDist * 900 });
    }
  }

  // 터치로 흔들기
  let lastX = null;
  function push(clientX, strength) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    for (const s of strands) {
      const d = (s.x - x) / 46;
      s.vel += strength * Math.exp(-d * d);
    }
  }

  cover.addEventListener("pointerdown", (e) => {
    lastX = e.clientX;
    push(e.clientX, 2.2);
    hint.classList.add("gone");
  });
  cover.addEventListener("pointermove", (e) => {
    if (lastX === null && e.pointerType !== "mouse") return;
    const dx = lastX === null ? 0 : e.clientX - lastX;
    lastX = e.clientX;
    if (Math.abs(dx) > 0.5) push(e.clientX, Math.max(-3, Math.min(3, dx * 0.12)));
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) =>
    cover.addEventListener(ev, () => { lastX = null; })
  );

  function draw(now) {
    const elapsed = now - t0;
    ctx.clearRect(0, 0, W, H);

    // 천장 빛
    const glow = ctx.createRadialGradient(W / 2, H * 0.18, 10, W / 2, H * 0.18, W * 0.75);
    glow.addColorStop(0, "rgba(243, 226, 189, 0.13)");
    glow.addColorStop(1, "rgba(243, 226, 189, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const textOn = Math.min(1, Math.max(0, (elapsed - 1500) / 1200));

    for (const s of strands) {
      // 스프링
      s.vel += -s.sway * 0.045;
      s.vel *= 0.94;
      s.sway += s.vel;

      const appear = reduceMotion ? 1 : Math.min(1, Math.max(0, (elapsed - s.delay) / 700));
      if (appear <= 0) continue;
      const len = s.dots.length;
      const shown = Math.ceil(len * appear);

      // 줄
      ctx.strokeStyle = "rgba(241, 239, 243, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x, 0);
      ctx.lineTo(s.x + s.sway, (shown - 1) * gap + 4);
      ctx.stroke();

      for (let k = 0; k < shown; k++) {
        const d = s.dots[k];
        const depth = d.r / Math.max(1, len - 1);
        const x = s.x + s.sway * depth;
        const y = d.r * gap + 4;
        const tw = reduceMotion ? 0.7 : 0.5 + 0.5 * Math.sin(now / 1000 * d.speed + d.phase);

        if (d.lit && textOn > 0) {
          const a = textOn * (0.85 + 0.15 * tw);
          ctx.fillStyle = `rgba(243, 226, 189, ${0.18 * a})`;
          ctx.beginPath(); ctx.arc(x, y, 6.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(255, 244, 220, ${a})`;
          ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
        } else {
          const a = (0.22 + 0.5 * tw) * (d.lit ? 1 - textOn * 0.4 : 1);
          ctx.fillStyle = `rgba(241, 239, 243, ${a})`;
          ctx.beginPath(); ctx.arc(x, y, 1.25 + tw * 0.35, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    if (!reduceMotion || elapsed < 100) requestAnimationFrame(draw);
  }

  layout();
  window.addEventListener("resize", layout);
  requestAnimationFrame(draw);
  if (reduceMotion) {
    // 움직임 줄이기 설정이면 한 번만 그리고, 터치할 때만 다시 그림
    cover.addEventListener("pointermove", () => requestAnimationFrame(draw));
  }
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
    const colors = ["#8a78b8", "#b3a4d8", "#f1eff3", "#d9b8c4", "#6f5f9c"];
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
    ctx.fillStyle = "#f1eff3";
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
