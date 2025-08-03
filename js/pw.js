async function copyPasswordForUser() {
  const input = document.getElementById("user-name");
  const feedback = document.getElementById("pw-feedback");
  const button = document.getElementById("copy-btn");

  const username = input.value.trim();
  if (!username) {
    feedback.textContent = "❌ 이름을 입력해주세요.";
    feedback.className = "text-xs pt-1 text-red-500";
    return;
  }

  // 인증 유저 목록 가져오기
  const userRes = await fetch("./user.json");
  const users = await userRes.json();
  const isValid = users.includes(username);

  if (!isValid) {
    feedback.textContent = "🚫 인증되지 않은 사용자입니다.";
    feedback.className = "text-xs pt-1 text-red-500";
    return;
  }

  // 비밀번호 가져오기
  const pwRes = await fetch("./pw.json");
  const pwData = await pwRes.json();
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const hour = now.getHours().toString().padStart(2, "0");
  const minute = now.getMinutes();
  const slot = minute < 30 ? `${hour}:00` : `${hour}:30`;
  const todayPw = pwData[date]?.[slot];

  if (!todayPw) {
    feedback.textContent = "❌ 오늘의 비밀번호가 아직 없습니다.";
    feedback.className = "text-xs pt-1 text-red-500";
    return;
  }

  await navigator.clipboard.writeText(todayPw);

  // 인증 성공 시 로그 서버로 전송
  fetch("/api/log-auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  });

  // 버튼 스타일 & 성공 피드백
  feedback.textContent = `✔️ 비밀번호 복사 완료!`;
  feedback.className = "text-xs pt-1 text-green-600";
  button.classList.remove("bg-blue-500");
  button.classList.add("bg-white", "border", "border-gray-800", "text-black");
}
