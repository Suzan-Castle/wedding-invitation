/* =========================================================
   청첩장 정보는 여기서만 고치면 돼요
   ========================================================= */
const CONFIG = {
  // 예식 일시 (한국 시간)
  date: new Date("2027-10-16T13:20:00+09:00"),
  venue: "신도림 웨딩시티 스타티스홀",
  address: "서울특별시 구로구 새말로 97 신도림테크노마트 8층",
  mapKeyword: "신도림웨딩시티",

  // 갤러리 사진: images 폴더에 넣고 파일명만 적기
  gallery: ["g1.jpg", "g2.jpg", "g3.jpg", "g4.jpg", "g5.jpg", "g6.jpg"],

  // 마음 전하실 곳 (확정되면 채우기)
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

/* ---------- 샹들리에 ---------- */
(function buildChandelier() {
  const el = document.getElementById("chandelier");
  if (!el) return;
  const strands = 46;
  for (let i = 0; i < strands; i++) {
    const t = i / (strands - 1); // 0 ~ 1
    const curve = Math.sin(t * Math.PI); // 가운데가 길게
    const len = Math.round(6 + curve * 22 + Math.random() * 4);
    const strand = document.createElement("div");
    strand.className = "strand";
    strand.style.left = `${t * 100}%`;
    for (let j = 0; j < len; j++) {
      const c = document.createElement("span");
      c.className = "crystal";
      c.style.animationDelay = `${(Math.random() * 3).toFixed(2)}s`;
      strand.appendChild(c);
    }
    el.appendChild(strand);
  }
})();

/* ---------- 커버 하단 꽃장식 ---------- */
(function flowers() {
  const el = document.querySelector(".flowers");
  if (!el) return;
  const colors = ["#eab8c0", "#f3d6dc", "#ffffff", "#b7a6d9", "#d9cdee", "#f6e3c9"];
  for (let i = 0; i < 26; i++) {
    const leaf = document.createElement("span");
    leaf.className = "leaf";
    leaf.style.left = `${Math.random() * 100}%`;
    leaf.style.bottom = `${Math.random() * 60}px`;
    leaf.style.transform = `rotate(${Math.random() * 360}deg)`;
    el.appendChild(leaf);
  }
  for (let i = 0; i < 70; i++) {
    const b = document.createElement("span");
    b.className = "bloom";
    const x = Math.random() * 100;
    const edge = Math.abs(x - 50) / 50; // 양 끝일수록 높게 쌓이게
    const size = 8 + Math.random() * 18;
    b.style.width = b.style.height = `${size}px`;
    b.style.left = `calc(${x}% - ${size / 2}px)`;
    b.style.bottom = `${Math.random() * (30 + edge * 70)}px`;
    b.style.background = colors[Math.floor(Math.random() * colors.length)];
    b.style.opacity = (0.7 + Math.random() * 0.3).toFixed(2);
    el.appendChild(b);
  }
})();

/* ---------- 꽃잎 ---------- */
(function petals() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#eab8c0", "#b7a6d9", "#ffffff", "#f3d6dc", "#d9cdee"];
  let count = 0;
  const timer = setInterval(() => {
    if (count++ > 40) return clearInterval(timer);
    const p = document.createElement("span");
    p.className = "petal";
    p.style.left = `${Math.random() * 100}vw`;
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.setProperty("--drift", `${(Math.random() - 0.5) * 160}px`);
    p.style.animationDuration = `${6 + Math.random() * 5}s`;
    p.style.opacity = 0.85;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 12000);
  }, 450);
})();

/* ---------- 스크롤 등장 ---------- */
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("show");
        io.unobserve(e.target);
      }
    }),
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

/* ---------- 달력 ---------- */
(function calendar() {
  const el = document.getElementById("calendar");
  const year = 2027, month = 9; // 0부터 시작 → 9 = 10월
  const dows = ["일", "월", "화", "수", "목", "금", "토"];
  dows.forEach((d, i) => {
    const s = document.createElement("div");
    s.className = "dow" + (i === 0 ? " sun" : i === 6 ? " sat" : "");
    s.textContent = d;
    el.appendChild(s);
  });
  const first = new Date(year, month, 1).getDay();
  const last = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < first; i++) el.appendChild(document.createElement("div"));
  for (let d = 1; d <= last; d++) {
    const s = document.createElement("div");
    const dow = (first + d - 1) % 7;
    s.className = "day" + (dow === 0 ? " sun" : dow === 6 ? " sat" : "");
    if (d === 16) s.classList.add("wedding");
    s.textContent = d;
    el.appendChild(s);
  }
})();

/* ---------- D-day ---------- */
function renderDday() {
  const el = document.getElementById("dday");
  const diff = CONFIG.date - new Date();
  if (diff <= 0) {
    const daysAfter = Math.floor(-diff / 86400000);
    el.innerHTML = daysAfter === 0
      ? "오늘, 저희 결혼합니다 💐"
      : `태용 ♥ 원선, 함께한 지 <strong>${daysAfter}일</strong>`;
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  el.innerHTML = `
    <div class="dday-boxes">
      <div class="dday-box">${d}<small>DAYS</small></div>
      <div class="dday-box">${h}<small>HOUR</small></div>
      <div class="dday-box">${m}<small>MIN</small></div>
      <div class="dday-box">${s}<small>SEC</small></div>
    </div>
    태용 ♥ 원선의 결혼식이 <strong>${d + 1}일</strong> 남았습니다`;
}
renderDday();
setInterval(renderDday, 1000);

/* ---------- 갤러리 ---------- */
(function gallery() {
  const track = document.getElementById("gallery");
  CONFIG.gallery.forEach((file, i) => {
    const item = document.createElement("div");
    item.className = "gallery-item";
    const img = new Image();
    img.loading = "lazy";
    img.alt = `웨딩 사진 ${i + 1}`;
    img.src = `images/${file}`;
    img.onerror = () => item.classList.add("empty");
    const ph = document.createElement("span");
    ph.textContent = `사진 ${i + 1} 자리`;
    item.append(img, ph);
    track.appendChild(item);
  });
})();

/* ---------- 지도 링크 ---------- */
(function maps() {
  const q = encodeURIComponent(CONFIG.mapKeyword);
  document.getElementById("naverMap").href = `https://map.naver.com/p/search/${q}`;
  document.getElementById("kakaoMap").href = `https://map.kakao.com/link/search/${q}`;
  document.getElementById("tmap").addEventListener("click", (e) => {
    e.preventDefault();
    location.href = `tmap://search?name=${q}`;
    setTimeout(() => toast("티맵 앱이 설치되어 있어야 열려요"), 1200);
  });
})();

/* ---------- 계좌 ---------- */
(function accounts() {
  const wrap = document.getElementById("accounts");
  CONFIG.accounts.forEach((group) => {
    const item = document.createElement("div");
    item.className = "acc-item";
    const head = document.createElement("button");
    head.className = "acc-head";
    head.type = "button";
    head.textContent = `${group.side} 계좌번호`;
    head.addEventListener("click", () => item.classList.toggle("open"));
    const body = document.createElement("div");
    body.className = "acc-body";
    group.list.forEach((a) => {
      const row = document.createElement("div");
      row.className = "acc-row";
      const info = document.createElement("div");
      info.innerHTML = `<small></small><span></span>`;
      info.querySelector("small").textContent = a.who;
      info.querySelector("span").textContent = `${a.bank} ${a.number}`;
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.type = "button";
      btn.textContent = "복사";
      btn.dataset.copy = `${a.bank} ${a.number}`;
      row.append(info, btn);
      body.appendChild(row);
    });
    item.append(head, body);
    wrap.appendChild(item);
  });
})();

/* ---------- 복사 ---------- */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy]");
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    toast("복사되었어요");
  } catch {
    toast("복사가 안 되면 길게 눌러 복사해주세요");
  }
});

/* ---------- 캘린더 저장 (.ics) ---------- */
document.getElementById("addCalendar").addEventListener("click", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//wedding//KO",
    "BEGIN:VEVENT",
    "UID:taeyong-wonsun-20271016@wedding",
    "DTSTART;TZID=Asia/Seoul:20271016T132000",
    "DTEND;TZID=Asia/Seoul:20271016T150000",
    "SUMMARY:이태용 ♥ 성원선 결혼식",
    `LOCATION:${CONFIG.venue}\\, ${CONFIG.address}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "wedding.ics";
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ---------- 공유 ---------- */
document.getElementById("shareBtn").addEventListener("click", async () => {
  const data = {
    title: "이태용 ♥ 성원선 결혼합니다",
    text: "2027.10.16 토 오후 1시 20분, 신도림 웨딩시티 스타티스홀",
    url: location.href,
  };
  if (navigator.share) {
    try { await navigator.share(data); } catch {}
  } else {
    await navigator.clipboard.writeText(location.href);
    toast("링크가 복사되었어요");
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
