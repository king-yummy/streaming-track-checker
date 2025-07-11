const SHEET_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7sUDMYoUsBpvEC9LjO25CnstexV74iKXfwRWVdqpQCOm65rzvJ6RrnedOv6JSqEYJNqyr2cje75CJ/pub?gid=0&single=true&output=csv";

      const START_AT_MS = new Date("2025-06-16T00:00:00+09:00").getTime();

      const TARGETS = {
        kakurenbo: "かくれんぼ",
        rizz: "Rizz - japanese Ver.",
        chroma: "Chroma Drift - japanese Ver.",
      };

      let schedule = [];

      const CUTOVER_AT_MS = new Date("2025-07-06T23:00:00+09:00").getTime();
      const PER_CYCLE_OLD = { kakurenbo: 4, rizz: 3, chroma: 1 };
      const PER_CYCLE_NEW = { kakurenbo: 2, rizz: 1, chroma: 1 };

      const OLD_SYSTEM_DURATION_SEC = Math.floor(
        (CUTOVER_AT_MS - START_AT_MS) / 1000
      );
      const OLD_SYSTEM_CYCLES = Math.floor(OLD_SYSTEM_DURATION_SEC / 3600);
      const BASE_COUNTS = {
        kakurenbo: OLD_SYSTEM_CYCLES * PER_CYCLE_OLD.kakurenbo,
        rizz: OLD_SYSTEM_CYCLES * PER_CYCLE_OLD.rizz,
        chroma: OLD_SYSTEM_CYCLES * PER_CYCLE_OLD.chroma,
      };

      function updateCounts(cycles, secInLoop) {
        const now = Date.now();
        let counts = {};

        if (now < CUTOVER_AT_MS) {
          counts = {
            kakurenbo: cycles * PER_CYCLE_OLD.kakurenbo,
            rizz: cycles * PER_CYCLE_OLD.rizz,
            chroma: cycles * PER_CYCLE_OLD.chroma,
          };

          schedule.forEach((item) => {
            if (item.startSec <= secInLoop) {
              if (item.title === TARGETS.kakurenbo) counts.kakurenbo += 1;
              else if (item.title === TARGETS.rizz) counts.rizz += 1;
              else if (item.title === TARGETS.chroma) counts.chroma += 1;
            }
          });
        } else {
          counts = { ...BASE_COUNTS };

          const diffSecNew = Math.floor((now - CUTOVER_AT_MS) / 1000);
          const cyclesNew = Math.floor(diffSecNew / 3600);
          const secInLoopNew = diffSecNew % 3600;

          counts.kakurenbo += cyclesNew * PER_CYCLE_NEW.kakurenbo;
          counts.rizz += cyclesNew * PER_CYCLE_NEW.rizz;
          counts.chroma += cyclesNew * PER_CYCLE_NEW.chroma;

          schedule.forEach((item) => {
            if (item.startSec <= secInLoopNew) {
              if (item.title === TARGETS.kakurenbo) counts.kakurenbo += 1;
              else if (item.title === TARGETS.rizz) counts.rizz += 1;
              else if (item.title === TARGETS.chroma) counts.chroma += 1;
            }
          });
        }

        document.getElementById("count-kakurenbo").textContent =
          counts.kakurenbo;
        document.getElementById("count-rizz").textContent = counts.rizz;
        document.getElementById("count-chroma").textContent = counts.chroma;
      }

      const toSec = (mmss) => {
        const [m, s] = mmss.split(":").map(Number);
        return m * 60 + s;
      };

      const formatKoreanTime = (str) => {
        const [m, s] = str.split(":").map(Number);
        return `${m}분 ${s.toString().padStart(2, "0")}초`;
      };

      const formatTimeMMSS = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
      };

      let loadingStartTime = Date.now();
      const MIN_LOADING_TIME = 2300;

      async function loadSchedule() {
        const res = await fetch(SHEET_URL);
        const text = await res.text();
        const rows = text.trim().split("\n").slice(1);

        schedule = rows.map((line) => {
          const [title, start, end, cover] = line
            .split(",")
            .map((s) => s.trim());
          return {
            title,
            start,
            end,
            cover,
            startSec: toSec(start),
            endSec: toSec(end),
          };
        });

        renderPlaylist();
        tick();
        setInterval(tick, 1000);

        const timeElapsed = Date.now() - loadingStartTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - timeElapsed);

        setTimeout(() => {
          document.getElementById("loading-screen").style.display = "none";
        }, remainingTime);
      }

      function renderPlaylist() {
        const ul = document.getElementById("playlist");
        ul.innerHTML = schedule
          .map(
            (item, i) => `
    <li data-index="${i}" class="flex flex-col p-2 rounded-lg shadow w-full opacity-50 transition-all bg-white text-[13px]">
      <div class="flex items-center gap-2">
        <div class="w-10 h-10 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
          <img src="${item.cover}" alt="${
              item.title
            }" class="w-full h-full object-cover" />
        </div>
        <div class="flex-1">
          <p class="font-medium truncate">${i + 1}. ${item.title}</p>
          <p class="text-xs text-gray-500">${formatKoreanTime(
            item.start
          )} ~ ${formatKoreanTime(item.end)}</p>
        </div>
      </div>
      <div class="flex items-center gap-1 text-[11px] px-1 mt-1">
        <span id="start-${i}" class="w-[40px] text-left text-gray-400">+0:00</span>
        <div class="flex-1 h-1 bg-gray-200 rounded overflow-hidden">
          <div id="p-${i}" class="h-full bg-blue-400 transition-all" style="width:0%"></div>
        </div>
        <span id="end-${i}" class="w-[40px] text-right text-gray-400">-0:00</span>
      </div>
    </li>`
          )
          .join("");
      }

      function tick() {
        const now = new Date();
        const diffSec = Math.max(
          0,
          Math.floor((Date.now() - START_AT_MS) / 1000)
        );
        const cycles = Math.floor(diffSec / 3600);
        const secInLoop = diffSec % 3600;

        updateHighlight(secInLoop);
        updateCounts(cycles, secInLoop);
        updateProgress(secInLoop);
      }

      function updateHighlight(secInLoop) {
        const idx = schedule.findIndex(
          (item) => secInLoop >= item.startSec && secInLoop < item.endSec
        );

        document.querySelectorAll("#playlist li").forEach((li) => {
          const i = Number(li.dataset.index);
          const startEl = document.getElementById(`start-${i}`);
          const endEl = document.getElementById(`end-${i}`);

          if (i === idx) {
            li.classList.remove("opacity-50");
            li.classList.add("opacity-100", "playing");
            startEl.classList.remove("text-gray-400");
            endEl.classList.remove("text-gray-400");
            startEl.classList.add("text-blue-600");
            endEl.classList.add("text-blue-600");
          } else {
            li.classList.add("opacity-50");
            li.classList.remove("opacity-100", "playing");
            startEl.classList.add("text-gray-400");
            endEl.classList.add("text-gray-400");
            startEl.classList.remove("text-blue-600");
            endEl.classList.remove("text-blue-600");
          }
        });
      }

      function updateProgress(secInLoop) {
        schedule.forEach((item, i) => {
          const bar = document.getElementById(`p-${i}`);
          const startEl = document.getElementById(`start-${i}`);
          const endEl = document.getElementById(`end-${i}`);

          if (!bar || !startEl || !endEl) return;

          const total = item.endSec - item.startSec;
          const passed = secInLoop - item.startSec;
          const remain = item.endSec - secInLoop;

          if (secInLoop >= item.startSec && secInLoop < item.endSec) {
            const pct = (passed / total) * 100;
            bar.style.width = `${pct}%`;
            startEl.textContent = `+${formatTimeMMSS(passed)}`;
            endEl.textContent = `-${formatTimeMMSS(remain)}`;
          } else {
            bar.style.width = "0%";
            startEl.textContent = `+0:00`;
            endEl.textContent = `-0:00`;
          }
        });
      }

      // --- 랜덤 로딩 GIF 설정 ---
      function setRandomLoadingGif() {
        const gifs = [1, 2, 3, 4, 5, 6];
        const randomIndex = Math.floor(Math.random() * gifs.length);
        const selectedGifIndex = gifs[randomIndex];
        const loadingScreen = document.getElementById('loading-screen');
        const loadingGif = document.getElementById('loading-gif');

        if (loadingScreen) {
          loadingScreen.style.backgroundImage = `url('images/Bamby.png')`;
        }
        if (loadingGif) {
          loadingGif.src = `images/bamby${selectedGifIndex}.gif`;
        }
      }

      // --- 페이지 로드 후 실행되는 모든 기능 ---
      document.addEventListener("DOMContentLoaded", () => {
        setRandomLoadingGif(); // 페이지 로드 시 랜덤 GIF 설정

        // --- 팝업(Modal) 기능 ---
        const modalOverlay = document.getElementById("guide-modal-overlay");
        const modalPanel = document.getElementById("guide-modal-panel");
        const openButton = document.getElementById("guide-button");
        const closeButtonX = document.getElementById("close-guide-button-x");
        const closeButtonMain = document.getElementById(
          "close-guide-button-main"
        );
        const tabButtons = document.querySelectorAll(".tab-button");
        const tabContents = document.querySelectorAll(".tab-content");

        const openModal = () => {
          modalOverlay.classList.remove("hidden");
          modalPanel.classList.remove("hidden");
          modalPanel.classList.add("flex");
        };

        const closeModal = () => {
          modalOverlay.classList.add("hidden");
          modalPanel.classList.add("hidden");
          modalPanel.classList.remove("flex");
        };

        if (openButton) openButton.addEventListener("click", openModal);
        if (closeButtonX) closeButtonX.addEventListener("click", closeModal);
        if (closeButtonMain)
          closeButtonMain.addEventListener("click", closeModal);
        if (modalOverlay) modalOverlay.addEventListener("click", closeModal);

        if (tabButtons) {
          tabButtons.forEach((button) => {
            button.addEventListener("click", () => {
              tabButtons.forEach((btn) => btn.classList.remove("active"));
              tabContents.forEach((content) => content.classList.add("hidden"));
              button.classList.add("active");
              const activeContent = document.querySelector(
                `[data-content="${button.dataset.tab}"]`
              );
              if (activeContent) activeContent.classList.remove("hidden");
            });
          });
        }

        // --- 화력 게이지 기능 (업그레이드) ---
        const GAUGE_GOAL = 7500;
        const gaugeFill = document.getElementById("gauge-fill");
        const gaugeCount = document.getElementById("gauge-count");
        const gaugeCountWrapper = document.getElementById(
          "gauge-count-wrapper"
        );
        const gaugeButton = document.getElementById("gauge-button");
        const cooldownCircle = document.getElementById("cooldown-circle");
        const infoButton = document.getElementById("info-button");
        const infoTooltip = document.getElementById("info-tooltip");
        let isGaugeCoolingDown = false;

        if (cooldownCircle) {
          const circumference = 2 * Math.PI * 16;
          cooldownCircle.style.strokeDasharray = circumference;
          cooldownCircle.style.strokeDashoffset = circumference;
        }

        const updateGaugeUI = (count) => {
          const safeCount = count || 0;
          const percentage = Math.min((safeCount / GAUGE_GOAL) * 100, 100);
          const labelPosition = Math.min(percentage, 95);

          if (gaugeFill) {
            gaugeFill.style.width = `${percentage}%`;
          }

          if (gaugeCount) {
            gaugeCount.textContent = safeCount.toLocaleString();
            gaugeCount.style.left = `${labelPosition}%`;
          }
        };
        const fetchInitialCount = async () => {
          try {
            const response = await fetch("/api/getGauge");
            if (!response.ok) throw new Error("API request failed");
            const data = await response.json();
            updateGaugeUI(data.count);
          } catch (error) {
            console.error("Error fetching gauge count:", error);
            updateGaugeUI(0);
          }
        };

        if (gaugeButton) {
          gaugeButton.addEventListener("click", async () => {
            if (isGaugeCoolingDown) return;

            isGaugeCoolingDown = true;
            gaugeButton.style.cursor = "not-allowed";

            if (cooldownCircle) {
              cooldownCircle.style.transition = "none";
              cooldownCircle.style.strokeDashoffset = 2 * Math.PI * 16;

              requestAnimationFrame(() => {
                cooldownCircle.style.transition =
                  "stroke-dashoffset 1.5s linear";
                cooldownCircle.style.strokeDashoffset = 0;
              });
            }

            try {
              const response = await fetch("/api/incrementGauge", {
                method: "POST",
              });
              if (!response.ok) throw new Error("API request failed");
              const data = await response.json();
              updateGaugeUI(data.count);
            } catch (error) {
              console.error("Error incrementing gauge count:", error);
            }

            setTimeout(() => {
              isGaugeCoolingDown = false;
              gaugeButton.style.cursor = "pointer";
              if (cooldownCircle) {
                cooldownCircle.style.transition = "none";
                cooldownCircle.style.strokeDashoffset = 2 * Math.PI * 16;
              }
            }, 1500);
          });
        }

        if (infoButton) {
          infoButton.addEventListener("click", (e) => {
            e.stopPropagation();
            infoTooltip.classList.toggle("hidden");
          });
        }

        document.addEventListener("click", (e) => {
          if (
            infoTooltip &&
            !infoButton.contains(e.target) &&
            !infoTooltip.contains(e.target)
          ) {
            infoTooltip.classList.add("hidden");
          }
        });

        fetchInitialCount();

        // --- PWA 설치 버튼 로직 ---
        let deferredPrompt;
        const installBanner = document.getElementById("install-banner");
        const installButton = document.getElementById("install-button");
        const dismissButton = document.getElementById("install-dismiss-week");

        window.addEventListener("beforeinstallprompt", (e) => {
          const hideUntil = localStorage.getItem("hideInstallBannerUntil");
          if (hideUntil && new Date().getTime() < parseInt(hideUntil, 10))
            return;
          if (window.matchMedia("(display-mode: standalone)").matches) return;

          e.preventDefault();
          deferredPrompt = e;
          if (installBanner) installBanner.classList.remove("hidden");
        });

        if (installButton) {
          installButton.addEventListener("click", async () => {
            if (!deferredPrompt) return;
            if (installBanner) installBanner.classList.add("hidden");
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
          });
        }

        if (dismissButton) {
          dismissButton.addEventListener("click", () => {
            const expiry = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
            localStorage.setItem("hideInstallBannerUntil", expiry);
            if (installBanner) installBanner.classList.add("hidden");
          });
        }

        window.addEventListener("appinstalled", () => {
          if (installBanner) installBanner.classList.add("hidden");
          deferredPrompt = null;
        });
      });

      loadSchedule();