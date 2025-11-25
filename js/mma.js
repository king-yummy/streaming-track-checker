// 1. 내 링크 설정 (항상 1순위)
const MY_ADMIN_LINK = "https://go.kakaobank.io/7263c2b";
const STORAGE_KEY = "mma_clicked_links";

let allLinks = [];
let availableLinks = [];

// GA 사용자 ID 가져오기
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

  // 모달 열기
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      // GA 전송
      if (typeof gtag === "function") {
        gtag("event", "click_mma_modal_open", { user_id: getGAUserID() });
      }
      mmaModalOverlay.classList.remove("hidden");
      mmaModalPanel.classList.remove("hidden");
      loadLinks();
    });
  }

  // 모달 닫기
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

      // 내 링크 + 서버 링크 합치기
      const uniqueSet = new Set([MY_ADMIN_LINK, ...serverLinks]);
      allLinks = Array.from(uniqueSet);

      // 이미 클릭한 목록 확인
      const clickedLinks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      // 안 누른 것만 남기기
      availableLinks = allLinks.filter((link) => !clickedLinks.includes(link));

      // [우선순위 로직] 내 링크가 아직 있다면 무조건 맨 앞에, 나머지는 랜덤
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

  // UI 업데이트
  function updateUI() {
    const total = allLinks.length;
    const remaining = availableLinks.length;

    if (totalCountText)
      totalCountText.textContent = `현재 등록된 링크: ${total}개`;

    if (remaining > 0) {
      statusText.innerHTML = `남은 링크: <span class="text-blue-600 font-bold">${remaining}</span>개`;
      actionBtn.textContent = "MMA 티켓 품앗이 라쓰고!";
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
      actionBtn.textContent = "새로운 링크 잠기돌~";
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

  // [액션] 링크 클릭
  if (actionBtn) {
    actionBtn.addEventListener("click", () => {
      if (availableLinks.length === 0) return;

      const targetLink = availableLinks[0];

      // GA 전송
      if (typeof gtag === "function") {
        gtag("event", "click_mma_link_action", {
          link_url: targetLink,
          user_id: getGAUserID(),
        });
      }

      window.open(targetLink, "_blank");

      // 클릭 기록 저장
      const clickedLinks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );
      if (!clickedLinks.includes(targetLink)) {
        clickedLinks.push(targetLink);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clickedLinks));
      }

      // 목록에서 제거 후 UI 갱신
      availableLinks.shift();
      updateUI();
    });
  }

  // [액션] 링크 등록
  if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
      const link = linkInput.value.trim();

      if (!link) return alert("링크를 입력해주세요.");
      if (!link.includes("go.kakaobank.io")) {
        return alert("올바른 카카오뱅크 이벤트 링크가 아닙니다.");
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
          alert("등록 완료! 다른 플리들이 눌러줄 거예요 😉");

          if (typeof gtag === "function") {
            gtag("event", "register_mma_link_success", {
              user_id: getGAUserID(),
            });
          }

          linkInput.value = "";
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
