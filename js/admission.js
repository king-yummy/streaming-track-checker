document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("admission-container");
  const progressBar = document.getElementById("progress-bar");
  const backButton = document.getElementById("header-back-button");

  let userDevice = "";
  const admissionData = {
    playlistFile: null,
    cardFile: null,
    nickname: "",
  };

  const allSteps = [
    {
      name: "start",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-2">멜론 스밍, 처음이신가요?</h2>
          <p class="text-gray-600 mb-8">입학처만 따라오시면 5분 안에 입학 완료!<br>입학 인증서 받고 이벤트 참여해보세요❤️</p>
        </div>
        <div><button data-action="next" class="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition">시작하기</button></div>`,
    },
    {
      name: "device_choice",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-8">어떤 기기를 사용 중이신가요?</h2>
        </div>
        <div class="space-y-4">
          <button data-action="set-device" data-device="ios" class="w-full border-2 border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">iPhone (아이폰)</button>
          <button data-action="set-device" data-device="android" class="w-full border-2 border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">Galaxy (안드로이드)</button>
        </div>`,
    },
    {
      name: "app_download",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">멜론 앱 설치 및 가입</h2>
          <p class="text-gray-600 mb-8">스토어에서 멜론(Melon) 앱을 다운로드하고<br>회원가입을 완료해주세요.</p>
        </div>
        <div><button data-action="next" class="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition">완료했어요</button></div>`,
    },
    {
      name: "purchase_pass",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">이용권 구매하기</h2>
          <p class="text-gray-600 mb-6">${
            userDevice === "ios"
              ? "아이폰은 웹에서 구매 가능해요!<br>아래 링크에서 [스트리밍 클럽]을 구매하세요."
              : "멜론 앱 [이용권] 메뉴에서<br>[스트리밍 클럽]을 구매하세요."
          }<br><span class="text-red-500 font-semibold">* 할인 이용권이 있다면 해당 이용권을 구매하세요.</span></p>
          ${
            userDevice === "ios"
              ? '<a href="https://www.melon.com/buy/pamphlet/all.htm" target="_blank" id="melon-purchase-link" class="text-blue-600 underline font-semibold mb-6 block">▶ 멜론 이용권 구매 페이지 바로가기</a>'
              : ""
          }
          <img src="images/purchase.jpg" alt="이용권 구매 안내" class="w-full rounded-md my-4 border mx-auto">
        </div>
        <div><button data-action="next" class="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition">구매했어요</button></div>`,
    },
    {
      name: "settings_1",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">멜론 필수 설정 (1/${
            userDevice === "android" ? 5 : 4
          })</h2>
          <p class="text-gray-600 mb-6">먼저, 설정 화면으로 들어가주세요.</p>
          <img src="images/settings_1.jpg" alt="설정 화면 가이드" class="w-full rounded-md my-4 border mx-auto">
        </div>
        <div><button data-action="next" class="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition">다음</button></div>`,
    },
    {
      name: "settings_2_quality",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">멜론 필수 설정 (2/${
            userDevice === "android" ? 5 : 4
          })</h2>
          <p class="text-gray-600 mb-6">곡 음질 설정을 확인해주세요.</p>
          <div class="space-y-4">
            <img src="images/settings_quality_1.jpg" alt="곡 음질 가이드 1" class="w-full rounded-md border mx-auto">
            <img src="images/settings_quality_2.jpg" alt="곡 음질 가이드 2" class="w-full rounded-md border mx-auto">
          </div>
        </div>
        <div class="mt-8"><button data-action="next" class="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition">다음</button></div>`,
    },
    {
      name: "settings_3_playlist",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">멜론 필수 설정 (3/${
            userDevice === "android" ? 5 : 4
          })</h2>
          <p class="text-gray-600 mb-6">재생목록 설정을 확인해주세요.</p>
          <div class="space-y-4">
            <img src="images/settings_playlist_1.jpg" alt="재생목록 설정 가이드 1" class="w-full rounded-md border mx-auto">
            <img src="images/settings_playlist_2.jpg" alt="재생목록 설정 가이드 2" class="w-full rounded-md border mx-auto">
          </div>
        </div>
        <div class="mt-8"><button data-action="next" class="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition">다음</button></div>`,
    },
    {
      name: "settings_4_cache",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">멜론 필수 설정 (4/${
            userDevice === "android" ? 5 : 4
          })</h2>
          <p class="text-gray-600 mb-6">캐싱 적용은 꼭!! OFF 해주세요!</p>
          <div class="space-y-4">
            <img src="images/settings_cache_1.jpg" alt="캐시 설정 가이드 1" class="w-full rounded-md border mx-auto">
            <img src="images/settings_cache_2.jpg" alt="캐시 설정 가이드 2" class="w-full rounded-md border mx-auto">
          </div>
        </div>
        <div class="mt-8"><button data-action="next" class="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition">${
          userDevice === "android" ? "다음" : "설정 완료!"
        }</button></div>`,
    },
    {
      name: "settings_5_advanced",
      condition: (device) => device === "android",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">멜론 필수 설정 (5/5)</h2>
          <p class="text-gray-600 mb-6">마지막으로 고급 설정을 확인해주세요.</p>
          <div class="space-y-4">
            <img src="images/settings_advanced_1.jpg" alt="고급 설정 1" class="w-full rounded-md border">
            <img src="images/settings_advanced_2.jpg" alt="고급 설정 2" class="w-full rounded-md border">
            <img src="images/settings_advanced_3.jpg" alt="고급 설정 3" class="w-full rounded-md border">
            <img src="images/settings_advanced_4.jpg" alt="고급 설정 4" class="w-full rounded-md border">
          </div>
        </div>
        <div class="mt-8"><button data-action="next" class="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition">설정 완료!</button></div>`,
    },
    {
      name: "playlist_add",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">스밍리스트 원클릭 담기</h2>
          <p class="text-gray-600 mb-6">아래 링크 4개를 순서대로 모두 클릭하면<br>플레이리스트가 자동으로 완성됩니다.</p>
          <div class="grid grid-cols-2 gap-3">
              <a href="https://tinyurl.com/4hkbdx8c" target="_blank" class="p-3 bg-gray-100 text-center rounded hover:bg-gray-200">1번 링크</a>
              <a href="https://tinyurl.com/2ft4u95u" target="_blank" class="p-3 bg-gray-100 text-center rounded hover:bg-gray-200">2번 링크</a>
              <a href="https://tinyurl.com/4s8w5ezd" target="_blank" class="p-3 bg-gray-100 text-center rounded hover:bg-gray-200">3번 링크</a>
              <a href="https://tinyurl.com/nhzj28kj" target="_blank" class="p-3 bg-gray-100 text-center rounded hover:bg-gray-200">4번 링크</a>
          </div>
        </div>
        <div class="mt-8"><button data-action="next" class="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition">다 담았어요</button></div>`,
    },
    {
      name: "final_check",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">마지막 확인!</h2>
          <p class="text-gray-600 mb-6">스밍 시작 전, 꼭 확인해주세요!</p>
          <div class="space-y-4">
            <img src="images/check_repeat.jpg" alt="재생 설정 확인" class="w-full rounded-md border mx-auto">
            <img src="images/check_volume.png" alt="음량 설정 확인" class="w-full rounded-md border mx-auto">
          </div>
        </div>
        <div class="mt-8"><button data-action="next" class="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition">모두 확인했어요</button></div>`,
    },
    {
      name: "cert_start",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">수고하셨습니다!</h2>
          <p class="text-gray-600 mb-8">이제 스밍 입학증을 만들어 드릴게요.</p>
        </div>
        <div><button data-action="next" class="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition">입학증 만들러 가기</button></div>`,
    },
    // ▼▼▼ 다시 추가된 'STEP 1. 재생목록 캡쳐' ▼▼▼
    {
      name: "cert_upload_playlist",
      render: () => `
        <div class="text-center flex-grow">
          <h2 class="text-2xl font-bold mb-4">STEP 1. 재생목록 캡쳐</h2>
          <p class="text-gray-600 mb-6">아래 가이드처럼 재생목록 전체가 보이게<br>캡쳐해서 업로드 해주세요.</p>
          <img src="images/guide_playlist.jpg" alt="재생목록 캡쳐 가이드" class="w-full rounded-md border mx-auto mb-6">
          <input type="file" id="playlist-upload" accept="image/*" class="hidden"/>
          <label for="playlist-upload" id="playlist-label" class="cursor-pointer block w-full border-2 border-dashed border-gray-300 text-gray-500 font-bold py-8 px-4 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">여기를 눌러 이미지 선택</label>
        </div>
        <div class="mt-8"><button data-action="next" id="playlist-next-btn" class="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition opacity-50 cursor-not-allowed" disabled>다음</button></div>`,
    },
    // ▲▲▲ 추가 완료 ▲▲▲
    {
      name: "cert_upload_card",
      render: () => `
        <div class="text-center flex-grow">
          <h2 class="text-2xl font-bold mb-4">STEP 2. 멜론카드 저장</h2>
          <p class="text-gray-600 mb-6">아래 가이드처럼 멜론카드 화면을<br>저장해서 업로드 해주세요.</p>
          <div class="space-y-4 mb-6">
            <img src="images/guide_card_1.jpg" alt="멜론카드 저장 가이드 1" class="w-full rounded-md border mx-auto">
            <img src="images/guide_card_2.jpg" alt="멜론카드 저장 가이드 2" class="w-full rounded-md border mx-auto">
            <img src="images/guide_card_3.jpg" alt="멜론카드 저장 가이드 3" class="w-full rounded-md border mx-auto">
          </div>
          <input type="file" id="card-upload" accept="image/*" class="hidden"/>
          <label for="card-upload" id="card-label" class="cursor-pointer block w-full border-2 border-dashed border-gray-300 text-gray-500 font-bold py-8 px-4 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">여기를 눌러 이미지 선택</label>
        </div>
        <div class="mt-8"><button data-action="next" id="card-next-btn" class="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition opacity-50 cursor-not-allowed" disabled>다음</button></div>`,
    },
    {
      name: "cert_nickname",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">STEP 3. 닉네임 입력</h2>
          <p class="text-gray-600 mb-8">입학증에 워터마크로 사용할<br>플리 닉네임을 입력해주세요.</p>
          <input type="text" id="nickname-input" placeholder="여기에 닉네임 입력" class="w-full text-center text-lg p-3 border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none transition"/>
        </div>
        <div class="mt-8"><button data-action="generate" id="generate-btn" class="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition opacity-50 cursor-not-allowed" disabled>입학증 생성하기</button></div>`,
    },
    {
      name: "cert_result",
      render: () => `
        <div id="result-container" class="text-center flex flex-col items-center justify-center flex-grow">
          <div id="loading-spinner" class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p class="mt-4 text-gray-600">입학증을 만들고 있어요...</p>
          </div>
          <div id="result-content" class="hidden w-full">
            <h3 class="text-xl font-bold mb-4">🎉 PLLI 스밍 입학을 축하합니다! 🎉</h3>
            <canvas id="canvas" class="hidden"></canvas>
            <img id="result-image" alt="PLLI 스밍 입학증" class="w-full max-w-sm rounded-lg shadow-md mx-auto border" />
            <a id="download-btn" class="mt-4 inline-block w-full bg-green-500 text-white font-bold py-3 px-5 rounded-lg hover:bg-green-600 transition">입학증 저장하기</a>
            <div class="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-left space-y-3">
              <div>
                <p class="font-semibold text-gray-800">🎉 입학증 공유 이벤트</p>
                <p class="text-gray-600 mt-1">X(트위터)에 아래 해시태그와 함께 입학증을 공유해주시면 추첨을 통해 기프티콘을 드려요!</p>
                <div class="mt-2 flex items-center bg-white p-2 rounded-md border">
                  <span id="hashtag" class="text-blue-600 font-mono flex-grow">#플리스밍입학증</span>
                  <button id="copy-hashtag-btn" class="bg-gray-200 text-gray-700 text-xs font-semibold px-2 py-1 rounded hover:bg-gray-300">복사</button>
                </div>
              </div>
              <div class="border-t pt-3">
                <p class="font-semibold text-gray-800">X 계정이 없으신가요?</p>
                <p class="text-gray-600 mt-1">
                  <a href="https://open.kakao.com/o/sSSDWXyh" id="event-open-chat-link" target="_blank" class="text-blue-600 underline">개인 오픈채팅</a>으로 보내주시면 대신 올려드려요! 추첨 대상에도 똑같이 포함됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>`,
    },
  ];

  let visibleSteps = [];
  let currentVisibleStepIndex = 0;

  const saveState = () => {
    /* ... */
  };
  const loadState = () => {
    /* ... */ return false;
  };

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveState();
  });
  window.addEventListener("pagehide", saveState);

  function setVisibleSteps() {
    visibleSteps = allSteps.filter(
      (s) => !s.condition || s.condition(userDevice)
    );
  }

  function updateProgressBar() {
    const mainStepsCount = visibleSteps.findIndex(
      (s) => s.name === "cert_upload_playlist"
    );
    const currentMainStepIndex = Math.min(
      currentVisibleStepIndex,
      mainStepsCount
    );
    const progress =
      mainStepsCount > 0 ? (currentMainStepIndex / mainStepsCount) * 100 : 0;
    progressBar.style.width = `${progress}%`;
  }

  function renderCurrentStep() {
    backButton.classList.toggle("hidden", currentVisibleStepIndex <= 0);
    const old = container.querySelector(".step-screen");
    if (old) {
      old.classList.add("step-hidden");
      setTimeout(() => old.remove(), 300);
    }
    const step = visibleSteps[currentVisibleStepIndex];
    const screen = document.createElement("div");
    screen.className =
      "step-screen w-full h-full flex flex-col justify-between step-hidden";
    screen.innerHTML = step.render();
    container.appendChild(screen);
    setTimeout(() => screen.classList.remove("step-hidden"), 10);
    if (
      admissionData.playlistFileName &&
      screen.querySelector("#playlist-label")
    ) {
      screen.querySelector(
        "#playlist-label"
      ).textContent = `✅ ${admissionData.playlistFileName}`;
    }
    if (admissionData.cardFileName && screen.querySelector("#card-label")) {
      screen.querySelector(
        "#card-label"
      ).textContent = `✅ ${admissionData.cardFileName}`;
    }
    addStepEventListeners(screen);
    updateProgressBar();
  }

  function goToNextStep() {
    const currentStepName =
      visibleSteps[currentVisibleStepIndex]?.name || "unknown_step";
    gtag("event", "admission_next_step", {
      step_name: currentStepName,
      user_id: getUserID(),
    });
    if (currentVisibleStepIndex < visibleSteps.length - 1) {
      currentVisibleStepIndex++;
      renderCurrentStep();
    }
  }

  function goToPrevStep() {
    if (currentVisibleStepIndex > 0) {
      const currentStepName =
        visibleSteps[currentVisibleStepIndex]?.name || "unknown_step";
      gtag("event", "admission_prev_step", {
        step_name: currentStepName,
        user_id: getUserID(),
      });
      currentVisibleStepIndex--;
      renderCurrentStep();
    }
  }

  backButton.addEventListener("click", goToPrevStep);

  function addStepEventListeners(stepElement) {
    const nextBtn = stepElement.querySelector('button[data-action="next"]');
    if (nextBtn) nextBtn.addEventListener("click", goToNextStep);

    stepElement
      .querySelectorAll('button[data-action="set-device"]')
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          userDevice = e.currentTarget.dataset.device;
          gtag("event", "admission_select_device", {
            device_type: userDevice,
            user_id: getUserID(),
          });
          setVisibleSteps();
          goToNextStep();
        });
      });

    const nicknameInput = stepElement.querySelector("#nickname-input");
    if (nicknameInput) {
      const genBtn = stepElement.querySelector("#generate-btn");
      nicknameInput.addEventListener("input", (e) => {
        admissionData.nickname = e.target.value.trim();
        genBtn.disabled = !admissionData.nickname;
        genBtn.classList.toggle("opacity-50", !admissionData.nickname);
        genBtn.classList.toggle("cursor-not-allowed", !admissionData.nickname);
      });
    }

    const generateBtn = stepElement.querySelector(
      'button[data-action="generate"]'
    );
    if (generateBtn) {
      generateBtn.addEventListener("click", () => {
        gtag("event", "admission_generate_certificate_click", {
          nickname_length: admissionData.nickname.length,
          user_id: getUserID(),
        });
        goToNextStep();
        setTimeout(generateCertificate, 100);
      });
    }

    const playlistUpload = stepElement.querySelector("#playlist-upload");
    if (playlistUpload) {
      playlistUpload.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          admissionData.playlistFile = file;
          stepElement.querySelector(
            "#playlist-label"
          ).textContent = `✅ ${file.name}`;
          const btn = stepElement.querySelector("#playlist-next-btn");
          btn.disabled = false;
          btn.classList.remove("opacity-50", "cursor-not-allowed");
        }
      });
    }

    const cardUpload = stepElement.querySelector("#card-upload");
    if (cardUpload) {
      cardUpload.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          admissionData.cardFile = file;
          stepElement.querySelector(
            "#card-label"
          ).textContent = `✅ ${file.name}`;
          const btn = stepElement.querySelector("#card-next-btn");
          btn.disabled = false;
          btn.classList.remove("opacity-50", "cursor-not-allowed");
        }
      });
    }

    const purchaseLink = stepElement.querySelector("#melon-purchase-link");
    if (purchaseLink) {
      purchaseLink.addEventListener("click", () => {
        gtag("event", "admission_click_purchase_link", {
          user_id: getUserID(),
        });
      });
    }

    const copyBtn = stepElement.querySelector("#copy-hashtag-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        gtag("event", "admission_copy_hashtag", { user_id: getUserID() });
        const hashtag = stepElement.querySelector("#hashtag").innerText;
        navigator.clipboard.writeText(hashtag).then(() => {
          copyBtn.textContent = "복사 완료!";
          setTimeout(() => {
            copyBtn.textContent = "복사";
          }, 2000);
        });
      });
    }

    const openChatLink = stepElement.querySelector("#event-open-chat-link");
    if (openChatLink) {
      openChatLink.addEventListener("click", () => {
        gtag("event", "admission_click_event_chat_link", {
          user_id: getUserID(),
        });
      });
    }
  }

  async function generateCertificate() {
    try {
      const { playlistFile, cardFile, nickname } = admissionData;
      if (!playlistFile || !cardFile || !nickname)
        throw new Error("이미지와 닉네임 정보가 올바르지 않습니다.");

      const template = await loadImageFromSrc(
        "images/certificate_template.png"
      );

      const canvas = document.getElementById("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = template.width;
      canvas.height = template.height;
      ctx.drawImage(template, 0, 0);

      const [playlistImg, cardImg] = await Promise.all([
        loadImage(playlistFile),
        loadImage(cardFile),
      ]);
      const [wmPlaylist, wmCard] = await Promise.all([
        createWatermarkedImage(playlistImg, nickname),
        createWatermarkedImage(cardImg, nickname),
      ]);

      const containerLeft = { x: 185, y: 269, width: 290, height: 520 };
      const containerRight = { x: 555, y: 269, width: 340, height: 255 };

      function fitWithinBox(imgW, imgH, maxW, maxH) {
        const scale = Math.min(maxW / imgW, maxH / imgH);
        return { w: Math.round(imgW * scale), h: Math.round(imgH * scale) };
      }

      const leftSize = fitWithinBox(
        wmPlaylist.width,
        wmPlaylist.height,
        containerLeft.width * 0.85,
        containerLeft.height * 0.85
      );
      const xLeft = containerLeft.x + (containerLeft.width - leftSize.w) / 2;
      const yLeft = (canvas.height - leftSize.h) / 2;

      const rightSize = fitWithinBox(
        wmCard.width,
        wmCard.height,
        containerRight.width,
        containerRight.height
      );
      const xRight =
        containerRight.x + (containerRight.width - rightSize.w) / 2;
      const yRight = yLeft;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(wmPlaylist, xLeft, yLeft, leftSize.w, leftSize.h);
      ctx.drawImage(wmCard, xRight, yRight, rightSize.w, rightSize.h);

      const now = new Date();
      const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const dateString = `${kst.getFullYear()}-${String(
        kst.getMonth() + 1
      ).padStart(2, "0")}-${String(kst.getDate()).padStart(2, "0")}`;
      ctx.font = "20px Pretendard";
      ctx.fillStyle = "#444";
      ctx.textAlign = "center";
      ctx.fillText(dateString, canvas.width / 2, canvas.height - 40);

      const finalURL = canvas.toDataURL("image/png");
      document.getElementById("loading-spinner").classList.add("hidden");
      const resultContent = document.getElementById("result-content");
      document.getElementById("result-image").src = finalURL;
      const downloadBtn = document.getElementById("download-btn");
      downloadBtn.href = finalURL;
      downloadBtn.download = `plli_admission_certificate_${dateString}.png`;
      downloadBtn.addEventListener("click", () => {
        gtag("event", "admission_download_certificate", {
          user_id: getUserID(),
        });
      });
      resultContent.classList.remove("hidden");
    } catch (err) {
      gtag("event", "admission_generate_error", {
        error_message: err.message,
        user_id: getUserID(),
      });
      console.error("입학증 생성 실패:", err);
      alert(
        `오류가 발생하여 입학증을 만들 수 없습니다: ${err.message}\n\n페이지를 새로고침하고 다시 시도해주세요.`
      );
      window.location.reload();
    }
  }

  function loadImage(fileOrBlob) {
    return new Promise((resolve, reject) => {
      if (!fileOrBlob) return reject(new Error("File is null or undefined"));
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () =>
          reject(new Error("파일을 이미지로 불러오는 데 실패했습니다."));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("파일을 읽는 데 실패했습니다."));
      reader.readAsDataURL(fileOrBlob);
    });
  }

  function loadImageFromSrc(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error(`이미지 로드에 실패했습니다: ${src}`));
      img.src = src;
    });
  }

  async function createWatermarkedImage(originalImage, text) {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    tempCtx.drawImage(originalImage, 0, 0);

    const fontSize = Math.max(36, Math.floor(originalImage.width / 10));
    tempCtx.font = `bold ${fontSize}px Pretendard`;
    tempCtx.fillStyle = "rgba(255,255,255,0.25)";
    tempCtx.textAlign = "center";
    tempCtx.textBaseline = "middle";

    tempCtx.save();
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(-Math.PI / 6);

    const stepX = fontSize * 4;
    const stepY = fontSize * 4;
    for (let x = -tempCanvas.width; x < tempCanvas.width; x += stepX) {
      for (let y = -tempCanvas.height; y < tempCanvas.height; y += stepY) {
        tempCtx.fillText(text, x, y);
      }
    }
    tempCtx.restore();

    const blob = await new Promise((resolve) => tempCanvas.toBlob(resolve));
    return loadImage(blob);
  }

  // 초기 실행
  gtag("event", "admission_page_view", { user_id: getUserID() });
  if (!loadState()) {
    setVisibleSteps();
  } else {
    setVisibleSteps();
  }
  renderCurrentStep();
});
