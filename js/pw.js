async function copyPasswordForUser() {
  const nameInput = document.getElementById("user-name");
  const feedbackDiv = document.getElementById("pw-feedback");
  const copyButton = document.getElementById("copy-btn");

  const username = nameInput.value.trim();
  if (!username) {
    feedbackDiv.textContent = "❌ 이름을 입력해주세요.";
    feedbackDiv.className = "text-xs pt-1 text-red-500";
    return;
  }

  // 로딩 상태 시작: 버튼 비활성화 및 메시지 초기화
  copyButton.disabled = true;
  copyButton.textContent = "확인 중...";
  feedbackDiv.textContent = "";

  try {
    // 1. 서버에 사용자 이름으로 비밀번호를 직접 요청합니다.
    const response = await fetch("/api/validate-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: username }),
    });

    // 서버로부터 받은 응답을 JSON 형태로 변환합니다.
    const result = await response.json();

    // 2. 서버 응답이 실패한 경우 (예: 403, 404, 500 오류)
    if (!response.ok) {
      // 서버가 보낸 에러 메시지를 그대로 사용자에게 보여줍니다.
      throw new Error(result.message || "알 수 없는 오류가 발생했습니다.");
    }

    // 3. 성공한 경우: 받은 비밀번호를 클립보드에 복사합니다.
    await navigator.clipboard.writeText(result.password);

    feedbackDiv.textContent = "✔️ 비밀번호 복사 완료!";
    feedbackDiv.className = "text-xs pt-1 text-green-600";

    // '멜론이 가이드' 버튼을 보여주고 이벤트 리스너를 추가합니다.
    melonGuideButton.classList.remove("hidden");
    melonGuideButton.onclick = () => {
      window.location.href = "melonee-guide.html"; // 파일명을 수정했습니다.
    };
  } catch (error) {
    // 4. 실패한 경우: 에러 메시지를 사용자에게 보여줍니다.
    feedbackDiv.textContent = `❌ ${error.message}`;
    feedbackDiv.className = "text-xs pt-1 text-red-500";
  } finally {
    // 5. 작업 완료 후, 버튼을 다시 활성화하고 원래 텍스트로 되돌립니다.
    copyButton.disabled = false;
    copyButton.textContent = "🔑 복사";
  }
}
