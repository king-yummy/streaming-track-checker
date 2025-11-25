// 1. 내 링크 설정 (항상 1순위로 뜰 링크)
const MY_ADMIN_LINK = "https://go.kakaobank.io/7263c2b";
const STORAGE_KEY = "mma_clicked_links";

let allLinks = [];
let availableLinks = [];

// GA 사용자 ID 가져오기 함수 (기존 utils 활용하거나 직접 구현)
function getGAUserID() {
  return localStorage.getItem("plli_user_id") || "unknown";
}

document.addEventListener("DOMContentLoaded", () => {
  const mmaModalOverlay = document.getElementById("mma-modal-overlay");
  const mmaModalPanel = document.getElementById("mma-modal-panel");
  const openBtn = document.getElementById("open-mma-btn");
  const closeBtn = document.getElementById("close-mma-btn");
  const linkInput = document.getElementById("mma-link-input");
  const registerBtn = document.getElementById("mma-register-btn");
  const actionBtn = document.getElementById("mma-action-btn");
  const statusText = document.getElementById("mma-status-text");
  const totalCountText = document.getElementById("mma-total-count");

  // --- 모달 열기/닫기 ---
  if (openBtn) {
    openBtn.addEventListener("click", () => {
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

  // --- 데이터 로드 ---
  async function loadLinks() {
    actionBtn.disabled = true;
    actionBtn.textContent = "링크 불러오는 중...";

    try {
      const res = await fetch("/api/mma-links");
      const data = await res.json();
      const serverLinks = data.links || [];

      // 내 링크 + 서버 링크 합치기 (중복 제거)
      const uniqueSet = new Set([MY_ADMIN_LINK, ...serverLinks]);
      allLinks = Array.from(uniqueSet);

      // 이미 클릭한 목록 확인
      const clickedLinks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      // 안 누른 것만 남기기
      availableLinks = allLinks.filter((link) => !clickedLinks.includes(link));

      // [우선순위 로직] 내 링크가 아직 있다면 무조건 맨 앞에, 나머지는 랜덤 섞기
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
      statusText.textContent = "오류가 발생했습니다.";
      actionBtn.textContent = "새로고침 필요";
    }
  }

  // --- UI 업데이트 ---
  function updateUI() {
    const total = allLinks.length;
    const remaining = availableLinks.length;

    totalCountText.textContent = `현재 등록된 링크: ${total}개`;

    if (remaining > 0) {
      statusText.innerHTML = `남은 품앗이: <span class="text-blue-600 font-bold">${remaining}</span>개`;
      actionBtn.textContent = "🚀 링크 타고 응원하기 (클릭)";
      actionBtn.classList.remove(
        "bg-gray-200",
        "text-gray-500",
        "cursor-not-allowed"
      );
      actionBtn.classList.add(
        "bg-[#FEE500]",
        "text-black",
        "hover:bg-yellow-400"
      );
      actionBtn.disabled = false;
    } else {
      statusText.innerHTML = "모든 품앗이 완료! 🎉";
      actionBtn.textContent = "오늘의 미션 완료 (더 이상 없어요)";
      actionBtn.classList.remove(
        "bg-[#FEE500]",
        "text-black",
        "hover:bg-yellow-400"
      );
      actionBtn.classList.add(
        "bg-gray-200",
        "text-gray-500",
        "cursor-not-allowed"
      );
      actionBtn.disabled = true;
    }
  }

  // --- [이벤트 1] 링크 클릭 (품앗이 실행) ---
  actionBtn.addEventListener("click", () => {
    if (availableLinks.length === 0) return;

    const targetLink = availableLinks[0]; // 0번 인덱스 링크 가져오기

    // [GA 전송] 링크 클릭 통계
    if (typeof gtag === "function") {
      gtag("event", "click_mma_link_action", {
        link_url: targetLink,
        user_id: getGAUserID(),
      });
    }

    // 새 창으로 열기
    window.open(targetLink, "_blank");

    // 클릭 처리 (로컬스토리지 저장)
    const clickedLinks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!clickedLinks.includes(targetLink)) {
      clickedLinks.push(targetLink);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clickedLinks));
    }

    // 배열에서 제거 후 UI 갱신 (다음 링크 준비)
    availableLinks.shift();
    updateUI();
  });

  // --- [이벤트 2] 내 링크 등록 ---
  registerBtn.addEventListener("click", async () => {
    const link = linkInput.value.trim();

    // [필터링] 프론트엔드에서 1차 검사
    if (!link) return alert("링크를 입력해주세요.");
    if (!link.includes("go.kakaobank.io")) {
      return alert(
        "올바른 카카오뱅크 이벤트 링크가 아닙니다.\n(go.kakaobank.io 포함 필수)"
      );
    }

    registerBtn.disabled = true;
    registerBtn.textContent = "등록 중...";

    try {
      const res = await fetch("/api/mma-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link }),
      });

      const result = await res.json();

      if (res.ok) {
        alert("내 링크가 등록되었습니다! 다른 플리들이 눌러줄 거예요 😉");

        // [GA 전송] 등록 성공 통계
        if (typeof gtag === "function") {
          gtag("event", "register_mma_link_success", {
            user_id: getGAUserID(),
          });
        }

        linkInput.value = "";
        loadLinks(); // 목록 갱신
      } else {
        // 백엔드 에러 메시지 표시 (예: 올바르지 않은 링크입니다)
        alert(result.error || "등록 실패");
      }
    } catch (e) {
      console.error(e);
      alert("오류가 발생했습니다.");
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = "등록";
    }
  });
});
