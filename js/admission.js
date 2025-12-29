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
      <h2 class="text-2xl font-bold mb-4 leading-tight">플뿌우 스밍 시작할 준비 됐나요?</h2>
      <p class="text-gray-600 leading-relaxed text-center mb-10 px-4">
        
        가이드 따라서 올바른 스밍법을 익히고<br />
        뿌우 버전 스밍 입학증 받아보세요~
      </p>
    </div>
    <div class="space-y-3">
      <!-- 기존 순서를 따르는 버튼 -->
      <button data-action="next"
              class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition">
        저학년 플리! 가이드와 함께 입학증 만들어요
      </button>
      <!-- STEP 1로 바로 이동하는 버튼 -->
      <button data-action="skip"
              class="w-full bg-[#FFE4EC] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#ffd3e0] transition">
        고학년 플리! 입학증만 빠르게 받을 수 있어요
      </button>
    </div>
  `,
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
        <div><button data-action="next" class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition">완료했어요</button></div>`,
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
          <img src="images/purchase.png" alt="이용권 구매 안내" class="w-full rounded-md my-4 border mx-auto">
        </div>
        <div><button data-action="next" class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition">구매했어요</button></div>`,
    },
    {
      name: "settings_intro",
      render: () => `
    <div class="text-center px-6 pt-8">
      <h2 class="text-2xl font-bold mb-6 leading-tight">
        멜론 설정 시작하기 🎧
      </h2>

      <div class="text-gray-700 leading-relaxed max-w-md mx-auto space-y-6">
        <p>
          지금부터 진행되는 단계는 음총팀이 제시한<br />
          스밍 가이드를 기반으로 제작되었어요.
        </p>
        <p>
          다음 내용을 반드시 따라야 누락 없이 <br />
          성적이 정확하게 반영됩니다.
        </p>
      </div>

      <div class="mt-10">
        <button
          data-action="next"
          class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition"
        >
          설정 시작하기
        </button>
      </div>
    </div>
  `,
    },
    {
      name: "settings_1",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">멜론 필수 설정 (1/${
            userDevice === "android" ? 5 : 4
          })</h2>
          <p class="text-gray-600 mb-6">먼저, 설정 화면으로 들어가주세요.</p>
          <img src="images/settings_1.png" alt="설정 화면 가이드" class="w-full rounded-md my-4 border mx-auto">
        </div>
        <div><button data-action="next" class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition">다음</button></div>`,
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
            <img src="images/settings_quality_1.png" alt="곡 음질 가이드 1" class="w-full rounded-md border mx-auto">
            <img src="images/settings_quality_2.png" alt="곡 음질 가이드 2" class="w-full rounded-md border mx-auto">
          </div>
        </div>
        <div class="mt-8"><button data-action="next" class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition">다음</button></div>`,
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
            <img src="images/settings_playlist_1.png" alt="재생목록 설정 가이드 1" class="w-full rounded-md border mx-auto">
            <img src="images/settings_playlist_2.png" alt="재생목록 설정 가이드 2" class="w-full rounded-md border mx-auto">
          </div>
        </div>
        <div class="mt-8"><button data-action="next" class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition">다음</button></div>`,
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
            <img src="images/settings_cache_1.png" alt="캐시 설정 가이드 1" class="w-full rounded-md border mx-auto">
            <img src="images/settings_cache_2.png" alt="캐시 설정 가이드 2" class="w-full rounded-md border mx-auto">
          </div>
        </div>
        <div class="mt-8"><button data-action="next" class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition">${
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
            <img src="images/settings_advanced_1.png" alt="고급 설정 1" class="w-full rounded-md border">
            <img src="images/settings_advanced_2.png" alt="고급 설정 2" class="w-full rounded-md border">
            <img src="images/settings_advanced_3.png" alt="고급 설정 3" class="w-full rounded-md border">
            <img src="images/settings_advanced_4.png" alt="고급 설정 4" class="w-full rounded-md border">
          </div>
        </div>
        <div class="mt-8"><button data-action="next" class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition">설정 완료!</button></div>`,
    },
    {
      name: "playlist_add",
      render: () => `
    <div class="text-center">
      <h2 class="text-2xl font-bold mb-4">스밍리스트 원클릭 담기</h2>
      <p class="text-gray-600 mb-6">
        아래 링크 4개를 순서대로 모두 클릭하면<br />
        플레이리스트가 자동으로 완성됩니다.
      </p>

      <div class="grid grid-cols-2 gap-3 mb-6">
        <a href="https://tinyurl.com/j58atsw7" target="_blank" class="p-3 bg-gray-100 text-center rounded hover:bg-gray-200">1번 링크</a>
        <a href="https://tinyurl.com/4r7x5sx2" target="_blank" class="p-3 bg-gray-100 text-center rounded hover:bg-gray-200">2번 링크</a>
        <a href="https://tinyurl.com/xearfrdz" target="_blank" class="p-3 bg-gray-100 text-center rounded hover:bg-gray-200">3번 링크</a>
        <a href="https://tinyurl.com/wru5an4m" target="_blank" class="p-3 bg-gray-100 text-center rounded hover:bg-gray-200">4번 링크</a>
      </div>

      <!-- 설명 박스 -->
      <div class="text-left bg-pink-50 border border-pink-100 rounded-xl p-4 space-y-3">
        <p class="text-sm font-semibold text-pink-700">
          왜 원클릭으로 똑같이 담으라고 하나요?
        </p>
        <p class="text-sm text-gray-700 leading-relaxed">
          같은 목록을 <strong>정각에 맞춰 같은 타이밍</strong>에 여러 명이 돌리면
          그 시점에 재생수가 한꺼번에 모여서 집계에 더 유리해요.
        </p>
        <ul class="text-sm text-gray-700 space-y-1">
          <li>• 곡이 같아야 하고</li>
          <li>• 순서가 같아야 하고</li>
          <li>• 가능한 비슷한 시간에 재생돼야 해요</li>
        </ul>
        <p class="text-xs text-gray-500">
          직접 섞어서 돌리면 이 효과가 줄어들 수 있어요.
        </p>
      </div>
    </div>

    <div class="mt-8">
      <button
        data-action="next"
        class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition"
      >
        다 담았어요
      </button>
    </div>
  `,
    },

    {
      name: "final_check",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">마지막 확인!</h2>
          <p class="text-gray-600 mb-6">스밍 시작 전, 꼭 확인해주세요!</p>
          <div class="space-y-4">
            <img src="images/check_repeat.png" alt="재생 설정 확인" class="w-full rounded-md border mx-auto">
            <img src="images/check_volume.png" alt="음량 설정 확인" class="w-full rounded-md border mx-auto">
          </div>
        </div>
        <div class="mt-8"><button data-action="next" class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition">모두 확인했어요</button></div>`,
    },
    {
      name: "cert_start",
      render: () => `
    <div class="text-center">
      <h2 class="text-2xl font-bold mb-4">수고하셨습니다!</h2>
      <p class="text-gray-600 mb-8">이제 스밍 입학증을 만들어 드릴게요.</p>
    </div>
    <div>
      <button
        data-action="next"
        class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition"
      >
        입학증 만들러 가기
      </button>
    </div>
  `,
    },
    // ▼▼▼ 다시 추가된 'STEP 1. 재생목록 캡쳐' ▼▼▼
    {
      name: "cert_upload_playlist",
      render: () => `
        <div class="text-center flex-grow">
          <h2 class="text-2xl font-bold mb-4">STEP 1. 재생목록 캡쳐</h2>
          <p class="text-gray-600 mb-6">아래 가이드처럼 재생목록 전체가 보이게<br>캡쳐해서 업로드 해주세요.</p>
          <img src="images/guide_playlist.png" alt="재생목록 캡쳐 가이드" class="w-full rounded-md border mx-auto mb-6">
          <input type="file" id="playlist-upload" accept="image/*" class="hidden"/>
          <label for="playlist-upload" id="playlist-label" class="cursor-pointer block w-full border-2 border-dashed border-gray-300 text-gray-500 font-bold py-8 px-4 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">여기를 눌러 이미지 선택</label>
        </div>
        <div class="mt-8"><button data-action="next" id="playlist-next-btn" class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition"
>다음</button></div>`,
    },
    // ▲▲▲ 추가 완료 ▲▲▲
    {
      name: "cert_upload_card",
      render: () => `
        <div class="text-center flex-grow">
          <h2 class="text-2xl font-bold mb-4">STEP 2. 멜론카드 저장</h2>
          <p class="text-gray-600 mb-6">아래 가이드처럼 멜론카드 화면을<br>저장해서 업로드 해주세요.</p>
          <div class="space-y-4 mb-6">
            <img src="images/guide_card_1.png" alt="멜론카드 저장 가이드 1" class="w-full rounded-md border mx-auto">
            <img src="images/guide_card_2.png" alt="멜론카드 저장 가이드 2" class="w-full rounded-md border mx-auto">
            <img src="images/guide_card_3.png" alt="멜론카드 저장 가이드 3" class="w-full rounded-md border mx-auto">
          </div>
          <input type="file" id="card-upload" accept="image/*" class="hidden"/>
          <label for="card-upload" id="card-label" class="cursor-pointer block w-full border-2 border-dashed border-gray-300 text-gray-500 font-bold py-8 px-4 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition">여기를 눌러 이미지 선택</label>
        </div>
        <div class="mt-8"><button
  data-action="next"
  id="card-next-btn"
  class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg transition opacity-50 cursor-not-allowed"
  disabled
>
  다음
</button>
</div>`,
    },
    {
      name: "cert_nickname",
      render: () => `
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">STEP 3. 닉네임 입력</h2>
          <p class="text-gray-600 mb-8">입학증에 워터마크로 사용할<br>플리 닉네임을 입력해주세요.</p>
          <input type="text" id="nickname-input" placeholder="여기에 닉네임 입력" class="w-full text-center text-lg p-3 border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none transition"/>
        </div>
        <div class="mt-8"><button data-action="generate" id="generate-btn" class="w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-[#f3a7c1] transition"
>입학증 생성하기</button></div>`,
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

        <!-- 저장 버튼 -->
        <a
          id="download-btn"
          class="mt-4 inline-block w-full bg-[#FEBFCE] text-gray-800 font-bold py-3 px-5 rounded-xl hover:bg-[#f3a7c1] transition"
        >
          입학증 저장하기
        </a>

        <!-- 공유 + 가이드 한 덩어리 -->
        <div class="mt-5 bg-white/70 backdrop-blur-sm border border-pink-100 rounded-2xl p-4 flex flex-col gap-3">
          <!-- 상단 공유 버튼 2개 -->
          <div class="flex gap-3">
            <button
              id="share-x-btn"
              class="flex-1 flex items-center justify-center gap-2 bg-black text-white font-semibold py-3 rounded-xl hover:opacity-90 transition"
            >
              <span class="text-sm">X에 올리기</span>
            </button>

            <button
              id="copy-share-text-btn"
              class="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-200 transition"
            >
              <span class="text-sm">복사 후 공유</span>
            </button>
          </div>

          <!-- 하단 가이드 버튼 -->
          <a
            id="guide-link"
            href="https://www.plavestream.com/ko/guide/newPlli-music-guide"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-2 w-full bg-[#FFE4EC] text-gray-800 font-medium py-3 px-5 rounded-xl hover:bg-[#ffd3e0] transition"
            style="letter-spacing:-0.01em;"
          >
            음총팀 뉴플리 음원 가이드 보러가기
          </a>
        </div>

        <section
          id="ad-container-result"
          class="my-4 p-4 bg-white rounded-2xl shadow"
        >
          <h3 class="text-sm font-bold text-gray-400 mb-2 px-2">
            ✨ PLLI를 위한 추천 (서버비에 한 스푼..)
          </h3>
          <div style="text-align: center">
            <ins
              class="adsbygoogle"
              style="display: block"
              data-ad-client="ca-pub-9063401338616510"
              data-ad-slot="3718792037"
              data-ad-format="auto"
              data-full-width-responsive="true"
            ></ins>
          </div>
        </section>
      </div>
    </div>
  `,
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
    screen.className = "step-screen w-full flex flex-col gap-6 step-hidden";
    screen.innerHTML = step.render();
    container.appendChild(screen);
    setTimeout(() => screen.classList.remove("step-hidden"), 10);

    container.scrollTop = 0;
    window.scrollTo(0, 0);

    // ✅ 여기서 이미지 80%로 줄이기
    screen.querySelectorAll('img[src^="images/"]').forEach((img) => {
      img.style.maxWidth = "80%";
      img.style.marginLeft = "auto";
      img.style.marginRight = "auto";
    });

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

    // 새로운 'skip' 버튼 처리: 'STEP 1. 재생목록 캡쳐' 단계로 건너뜁니다.
    const skipBtn = stepElement.querySelector('button[data-action="skip"]');
    if (skipBtn) {
      skipBtn.addEventListener("click", () => {
        // 모든 표시 가능한 단계 중에서 재생목록 업로드 단계의 인덱스를 찾음
        const targetIndex = visibleSteps.findIndex(
          (s) => s.name === "cert_upload_playlist"
        );
        if (targetIndex >= 0) {
          currentVisibleStepIndex = targetIndex;
          gtag("event", "admission_skip_to_cert", { user_id: getUserID() });
          renderCurrentStep();
        }
      });
    }

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

    // 결과 화면 공유 버튼들
    const shareXBtn = stepElement.querySelector("#share-x-btn");
    if (shareXBtn) {
      const pageUrl = "plli-checker.app"; // 실제 주소로
      const shareText =
        `#메리플리스마스_스밍시작\n` +
        `크리스마스 버전 세팅 완료☃️\n\n` +
        `나도 만들기 👉 ${pageUrl}\n` +
        `신곡 슴리 인증하고 공유해주세요🎄❄️`;

      shareXBtn.addEventListener("click", () => {
        // GA 이벤트
        gtag("event", "admission_click_share_x", {
          user_id: getUserID(),
        });

        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            shareText
          )}`,
          "_blank"
        );
      });
    }

    const copyShareBtn = stepElement.querySelector("#copy-share-text-btn");
    if (copyShareBtn) {
      const pageUrl = "https://plli-checker.app";
      const shareText =
        `플뿌우로 입학 완료💙💜💗❤️🖤\n\n` +
        `나도 만들기 👉 ${pageUrl}\n` +
        `새로운 슴리 췤!! 스밍 라쓰고!!\n\n` +
        `#플뿌우로_입학했뿌우`;

      copyShareBtn.addEventListener("click", () => {
        // GA 이벤트
        gtag("event", "admission_click_share_copy", {
          user_id: getUserID(),
        });

        navigator.clipboard.writeText(shareText).then(() => {
          copyShareBtn.textContent = "복사했어요!";
          setTimeout(() => {
            copyShareBtn.textContent = "문구 복사";
          }, 2000);
        });
      });
    }

    const guideLink = stepElement.querySelector("#guide-link");
    if (guideLink) {
      guideLink.addEventListener("click", () => {
        // GA 이벤트
        gtag("event", "admission_click_guide_link", {
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

      // 1) 새 템플릿 불러오기
      const template = await loadImageFromSrc("images/templete_bbuu.png");

      const canvas = document.getElementById("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = template.width; // 1500 예상
      canvas.height = template.height; // 1000 예상
      ctx.drawImage(template, 0, 0);

      // 2) 업로드 이미지들 불러오기 + 워터마크 입히기
      const [playlistImg, cardImg] = await Promise.all([
        loadImage(playlistFile),
        loadImage(cardFile),
      ]);
      const [wmPlaylist, wmCard] = await Promise.all([
        createWatermarkedImage(playlistImg, nickname),
        createWatermarkedImage(cardImg, nickname),
      ]);

      // 3) 멜론 카드 이미지 배치 (x=770, y=100, 300x300 고정)
      const cardBox = { x: 770, y: 100, size: 300 };
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(wmCard, cardBox.x, cardBox.y, cardBox.size, cardBox.size);

      // 4) 재생목록 캡처 배치 (x=1120, y=100, width=300, height 비율유지)
      const playlistBox = { x: 1120, y: 100, width: 300 };
      const playlistScale = playlistBox.width / wmPlaylist.width;
      const playlistHeight = wmPlaylist.height * playlistScale;
      ctx.drawImage(
        wmPlaylist,
        playlistBox.x,
        playlistBox.y,
        playlistBox.width,
        playlistHeight
      );

      // 5) 닉네임(이름) 그리기 - 중심 (500, 265), 8자 넘어가면 두 줄
      drawCenteredName(ctx, nickname, 500, 265);

      // 6) 날짜 찍기 - 중심 (400, 450)
      const now = new Date();
      const dateString = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      ctx.font =
        'bold 20px "Noto Sans CJK KR", "Noto Sans CJK", "Pretendard", sans-serif';
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "top"; // ← 이 줄 추가! y를 글자 위쪽으로 보게 함
      ctx.fillText(dateString, 400, 450);

      // 7) 화면에 보여주기
      document.getElementById("loading-spinner").classList.add("hidden");
      const resultContent = document.getElementById("result-content");
      const finalURL = canvas.toDataURL("image/png");
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
      (adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      gtag("event", "admission_generate_error", {
        error_message: err.message,
        user_id: getUserID(),
      });
      alert(
        `오류가 발생하여 입학증을 만들 수 없습니다: ${err.message}\n\n페이지를 새로고침하고 다시 시도해주세요.`
      );
      window.location.reload();
    }
  }

  // 닉네임 그리는 헬퍼
  function drawCenteredName(ctx, text, centerX, centerY) {
    const fontFamily =
      '"Noto Sans CJK KR", "Noto Sans CJK", "Pretendard", sans-serif';
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    if (text.length <= 8) {
      ctx.font = `bold 40px ${fontFamily}`;
      ctx.fillText(text, centerX, centerY);
    } else {
      // 8자 넘으면 두 줄
      const firstLine = text.slice(0, 8);
      const secondLine = text.slice(8);
      ctx.font = `bold 38px ${fontFamily}`;
      const lineHeight = 44;

      ctx.fillText(firstLine, centerX, centerY); // 1줄
      ctx.fillText(secondLine, centerX, centerY + lineHeight); // 2줄
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

    // 폰트는 아까처럼 절반으로 줄인 버전 기준
    const fontSize = Math.max(18, Math.floor(originalImage.width / 20));
    tempCtx.font = `bold ${fontSize}px Pretendard`;
    tempCtx.fillStyle = "rgba(255, 255, 255, 0.22)"; // 더 연하게
    tempCtx.textAlign = "left";
    tempCtx.textBaseline = "middle";

    tempCtx.save();
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(-Math.PI / 6);

    const singleTextWidth = tempCtx.measureText(text).width;
    const repeatCount = Math.ceil(
      (tempCanvas.width + tempCanvas.height) / singleTextWidth
    );
    const lineOfText = text.repeat(repeatCount * 2);

    // 간격 넓힘
    const stepY = fontSize * 2.2;

    for (
      let i = 0, y = -tempCanvas.height;
      y < tempCanvas.height;
      i++, y += stepY
    ) {
      // 한 줄씩 건너뛰기 → 더 성글게
      // if (i % 2 !== 0) continue;
      const x = -tempCanvas.width - (y % (singleTextWidth * 2));
      tempCtx.fillText(lineOfText, x, y);
    }

    tempCtx.restore();

    const blob = await new Promise((resolve) => tempCanvas.toBlob(resolve));
    return loadImage(blob);
  }

  // 초기 실행

  gtag("config", "G-GYGLSJRN79", {
    user_id: getUserID(),
  });

  gtag("event", "admission_page_view", { user_id: getUserID() });
  if (!loadState()) {
    setVisibleSteps();
  } else {
    setVisibleSteps();
  }
  renderCurrentStep();
});
