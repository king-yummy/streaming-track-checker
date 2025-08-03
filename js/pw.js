async function copyRandomPassword() {
  const res = await fetch("../pw.json");
  const data = await res.json();

  const today = new Date().toISOString().slice(0, 10);
  const list = data[today];
  const btn = document.getElementById("copyPwBtn");
  const feedback = document.getElementById("pw-feedback");

  if (!list) {
    feedback.innerText = "오늘 비밀번호가 아직 등록되지 않았어요.";
    feedback.classList.remove("text-green-600");
    feedback.classList.add("text-red-500");
    return;
  }

  const randomPw = list[Math.floor(Math.random() * list.length)];
  await navigator.clipboard.writeText(randomPw);

  // 버튼 스타일 및 텍스트 변경
  btn.classList.remove("bg-blue-500", "text-white");
  btn.classList.add("bg-white", "border", "border-black", "text-black");
  btn.innerText = "✅ 복사 완료!";

  // 피드백 메시지 표시
  feedback.innerText = "비밀번호가 복사되었습니다.";
  feedback.classList.remove("text-red-500");
  feedback.classList.add("text-gray-700");

  // 3초 후 초기화
  setTimeout(() => {
    btn.classList.remove("bg-white", "border", "border-black", "text-black");
    btn.classList.add("bg-blue-500", "text-white");
    btn.innerText = "🔑 비밀번호 복사하기";
    feedback.innerText = "";
  }, 3000);
}
