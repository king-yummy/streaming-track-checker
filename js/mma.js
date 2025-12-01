// 1. 내 링크 설정 (항상 1순위)
const MY_ADMIN_LINK = "https://go.kakaobank.io/7263c2b";

// [중요] 키 이름을 바꿔서 사용자들의 '이미 클릭함' 기록을 초기화합니다.
// 그래야 내 링크가 다시 모든 사람에게 '안 누른 링크'로 뜹니다.
const STORAGE_KEY = "mma_clicked_links_v2";

let allLinks = [];
let availableLinks = [];

// ... (getGAUserID, robustOpen, ensureHttps 함수는 기존 그대로 유지) ...
function getGAUserID() {
  return localStorage.getItem("plli_user_id") || "unknown";
}
function robustOpen(url) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function ensureHttps(url) {
  if (!url) return "";
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    return "https://" + cleanUrl;
  }
  return cleanUrl;
}

document.addEventListener("DOMContentLoaded", () => {
  const mmaModalOverlay = document.getElementById("mma-modal-overlay");
  const mmaModalPanel = document.getElementById("mma-modal-panel");
  const openBtn = document.getElementById("open-mma-btn");
  const closeBtn = document.getElementById("close-mma-btn");

  const linkInput = document.getElementById("mma-link-input");
  // [추가] 퀴즈 관련 요소
  const quizQuestionEl = document.getElementById("mma-quiz-question");
  const quizAnswerInput = document.getElementById("mma-quiz-answer");

  const registerBtn = document.getElementById("mma-register-btn");
  const actionBtn = document.getElementById("mma-action-btn");
  const statusText = document.getElementById("mma-status-text");
  const totalCountText = document.getElementById("mma-total-count");

  // ... (모달 열기/닫기 로직 기존 유지) ...
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      if (typeof gtag === "function")
        gtag("event", "click_mma_modal_open", { user_id: getGAUserID() });
      mmaModalOverlay.classList.remove("hidden");
      mmaModalPanel.classList.remove("hidden");
      loadLinks();
    });
  }
  const closeModal = () => {
    mmaModalOverlay.classList.add("hidden");
    mmaModalPanel.classList.add("hidden");
  };
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (mmaModalOverlay) mmaModalOverlay.addEventListener("click", closeModal);

  // 데이터 로드
  async function loadLinks() {
    if (actionBtn) {
      actionBtn.disabled = true;
      actionBtn.textContent = "링크 불러오는 중...";
    }

    try {
      const res = await fetch("/api/mma-links");
      const data = await res.json();
      const serverLinks = data.links || [];

      // [추가] 서버에서 받은 질문 표시
      if (data.question && quizQuestionEl) {
        quizQuestionEl.textContent = "Q. " + data.question;
      }

      // 내 링크 + 서버 링크 합치기 (DB가 초기화되어도 내 링크는 여기서 살아남음)
      const uniqueSet = new Set([MY_ADMIN_LINK, ...serverLinks]);
      allLinks = Array.from(uniqueSet);

      // 이미 클릭한 목록 확인 (키가 v2로 바뀌어서 모두 빈 배열로 시작 -> 초기화 효과)
      const clickedLinks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      // 안 누른 것만 남기기
      availableLinks = allLinks.filter((link) => !clickedLinks.includes(link));

      // [우선순위] 내 링크가 안 눌린 상태라면 무조건 맨 앞
      if (availableLinks.includes(MY_ADMIN_LINK)) {
        const others = availableLinks.filter((l) => l !== MY_ADMIN_LINK);
        others.sort(() => Math.random() - 0.5);
        availableLinks = [MY_ADMIN_LINK, ...others];
      } else {
        availableLinks.sort(() => Math.random() - 0.5);
      }

      updateUI();
    } catch (err) {
      console.error(err);
      if (statusText) statusText.textContent = "오류가 발생했습니다.";
    }
  }

  // ... (updateUI 함수 기존 유지) ...
  function updateUI() {
    const total = allLinks.length;
    const remaining = availableLinks.length;
    if (totalCountText)
      totalCountText.textContent = `현재 등록된 링크: ${total}개`;

    if (remaining > 0) {
      statusText.innerHTML = `남은 링크: <span class="text-blue-600 font-bold">${remaining}</span>개`;
      actionBtn.textContent = "🚀 MMA 티켓 품앗이 라쓰고!";
      actionBtn.classList.remove(
        "bg-gray-100",
        "text-gray-400",
        "cursor-not-allowed"
      );
      actionBtn.classList.add("bg-blue-500", "text-white", "hover:bg-blue-600");
      actionBtn.disabled = false;
    } else {
      statusText.innerHTML = "모든 품앗이 완료! 🎉";
      actionBtn.textContent = "새로운 링크 잠기돌~";
      actionBtn.classList.remove(
        "bg-blue-500",
        "text-white",
        "hover:bg-blue-600"
      );
      actionBtn.classList.add(
        "bg-gray-100",
        "text-gray-400",
        "cursor-not-allowed"
      );
      actionBtn.disabled = true;
    }
  }

  // ... (actionBtn 클릭 이벤트 기존 유지) ...
  if (actionBtn) {
    actionBtn.addEventListener("click", () => {
      if (availableLinks.length === 0) return;
      const rawLink = availableLinks[0];
      const targetLink = ensureHttps(rawLink);

      if (typeof gtag === "function") {
        gtag("event", "click_mma_link_action", {
          link_url: targetLink,
          user_id: getGAUserID(),
        });
      }
      robustOpen(targetLink);

      const clickedLinks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );
      if (!clickedLinks.includes(rawLink)) {
        clickedLinks.push(rawLink);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clickedLinks));
      }
      availableLinks.shift();
      updateUI();
    });
  }

  // [수정] 링크 등록 버튼 클릭 (정답 전송 로직 추가)
  if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
      const link = linkInput.value.trim();
      const answer = quizAnswerInput ? quizAnswerInput.value.trim() : "";

      if (!answer) return alert("퀴즈 정답을 입력해주세요!");
      if (!link) return alert("링크를 입력해주세요.");

      // 유효성 검사
      if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(link))
        return alert("링크에 한글이 포함되어 있습니다.");
      if (/\s/.test(link)) return alert("링크에 공백이 있습니다.");
      if (!link.startsWith("https://go.kakaobank.io/"))
        return alert("올바른 이벤트 링크 형식이 아닙니다.");

      registerBtn.disabled = true;
      registerBtn.textContent = "등록 중...";

      try {
        const res = await fetch("/api/mma-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ link, answer }), // 링크와 정답 함께 전송
        });

        const result = await res.json();

        if (res.ok) {
          alert("정답입니다! 링크가 등록되었습니다 👏");
          if (typeof gtag === "function") {
            gtag("event", "register_mma_link_success", {
              user_id: getGAUserID(),
            });
          }
          linkInput.value = "";
          if (quizAnswerInput) quizAnswerInput.value = "";
          loadLinks();
        } else {
          alert(result.error || "등록 실패");
        }
      } catch (e) {
        alert("오류가 발생했습니다.");
      } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = "등록";
      }
    });
  }
});
