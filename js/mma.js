// 1. 내 링크 설정 (항상 1순위)
const MY_ADMIN_LINK = "https://go.kakaobank.io/7263c2b";
const STORAGE_KEY = "mma_clicked_links";

let allLinks = [];
let availableLinks = [];

// GA 사용자 ID 가져오기
function getGAUserID() {
  return localStorage.getItem("plli_user_id") || "unknown";
}

// [중요] 팝업 차단 우회하여 링크 열기 함수
function robustOpen(url) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// 링크에 https://가 없으면 자동으로 붙여주는 함수 (클릭 시에만 사용)
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

  // [액션] 링크 클릭
  if (actionBtn) {
    actionBtn.addEventListener("click", () => {
      if (availableLinks.length === 0) return;

      const rawLink = availableLinks[0];

      // [안전장치] 기존에 잘못 들어간 링크가 있을 수 있으니 클릭 시에는 https 보정
      const targetLink = ensureHttps(rawLink);

      // GA 전송
      if (typeof gtag === "function") {
        gtag("event", "click_mma_link_action", {
          link_url: targetLink,
          user_id: getGAUserID(),
        });
      }

      robustOpen(targetLink);

      // 클릭 기록 저장
      const clickedLinks = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );
      if (!clickedLinks.includes(rawLink)) {
        clickedLinks.push(rawLink);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clickedLinks));
      }

      // 목록에서 제거 후 UI 갱신
      availableLinks.shift();
      updateUI();
    });
  }

  // [액션] 링크 등록 (여기가 핵심 수정 파트)
  if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
      const link = linkInput.value.trim(); // 앞뒤 공백 제거

      // 1. 빈 값 체크
      if (!link) return alert("링크를 입력해주세요.");

      // 2. 한글 포함 여부 체크 (이벤트 멘트 통째로 복사 방지)
      if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(link)) {
        return alert(
          "링크에 한글이나 불필요한 텍스트가 섞여 있습니다.\n링크 주소(URL)만 깔끔하게 복사해서 붙여넣어 주세요!"
        );
      }

      // 3. 공백 포함 여부 체크 (링크 중간에 띄어쓰기 방지)
      if (/\s/.test(link)) {
        return alert(
          "링크 중간에 공백이 있습니다.\n링크 주소만 정확하게 입력해주세요."
        );
      }

      // 4. 시작 주소 엄격 체크 (https:// 포함 필수)
      if (!link.startsWith("https://go.kakaobank.io/")) {
        return alert(
          "올바른 링크 형식이 아닙니다.\n'https://go.kakaobank.io/'로 시작하는 전체 주소를 입력해주세요."
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
