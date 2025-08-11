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

  // 로딩 상태 시작
  copyButton.disabled = true;
  copyButton.textContent = "확인 중...";
  feedbackDiv.textContent = "";

  try {
    const response = await fetch("/api/validate-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: username }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "알 수 없는 오류가 발생했습니다.");
    }

    await navigator.clipboard.writeText(result.password);

    feedbackDiv.textContent = "✔️ 비밀번호 복사 완료!";
    feedbackDiv.className = "text-xs pt-1 text-green-600";
  } catch (error) {
    feedbackDiv.textContent = `❌ ${error.message}`;
    feedbackDiv.className = "text-xs pt-1 text-red-500";
  } finally {
    // 작업 완료 후, 버튼 다시 활성화
    copyButton.disabled = false;
    copyButton.textContent = "🔑 복사";
  }
}
