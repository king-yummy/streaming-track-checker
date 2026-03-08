document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("voting-app-guides-container");
  const searchInput = document.getElementById("search-input");

  let allGuides = [];

  fetch("updated_voting_app_guides.json")
    .then((res) => res.json())
    .then((data) => {
      allGuides = data.votingAppGuides || [];

      allGuides.sort((a, b) => a.app.localeCompare(b.app, "ko"));

      renderGuides(allGuides);
    })
    .catch((err) => {
      console.error(err);
      container.innerHTML =
        '<p class="text-red-500">가이드 정보를 불러오는 데 실패했습니다.</p>';
    });

  function renderGuides(guides) {
    container.innerHTML = "";

    if (!guides.length) {
      container.innerHTML =
        '<p class="text-gray-500 text-sm">표시할 가이드가 없습니다.</p>';
      return;
    }

    guides.forEach((guide) => {
      const card = document.createElement("div");

      card.className =
        "bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition";

      card.innerHTML = `
        <details>
          <summary class="font-semibold text-md cursor-pointer flex justify-between items-center">
  <span>${guide.app}</span>

  <svg class="arrow w-4 h-4 text-gray-500 transition-transform"
       xmlns="http://www.w3.org/2000/svg"
       fill="none"
       viewBox="0 0 24 24"
       stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M19 9l-7 7-7-7" />
  </svg>
</summary>

          <div class="mt-4 pt-4 border-t border-gray-200 space-y-4 tips"></div>
        </details>
      `;

      const tipsContainer = card.querySelector(".tips");

      (guide.tips || []).forEach((tip) => {
        const tipElement = document.createElement("div");

        tipElement.className =
          "bg-gray-50 border border-gray-200 rounded-lg p-3";

        tipElement.innerHTML = `
          <img 
            src="${tip.image}" 
            alt=""
            class="max-w-xs w-full mx-auto rounded-md border mb-3"
          >
          <p class="text-sm text-gray-700 whitespace-pre-line">
            ${(tip.text || "").replace(/\*\*/g, "")}
          </p>
        `;

        tipsContainer.appendChild(tipElement);
      });

      // GA 이벤트 추가: 투표 가이드 펼쳐보기
      const details = card.querySelector("details");
      details.addEventListener("toggle", (event) => {
        if (event.target.open && typeof gtag === "function") {
          gtag("event", "view_vote_guide", {
            guide_title: guide.app,
            guide_app: guide.app,
          });
        }
      });

      container.appendChild(card);
    });
  }

  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();

    if (typeof gtag === "function") {
      gtag("event", "search_vote_guide", {
        search_term: term,
      });
    }

    const filtered = allGuides.filter((guide) => {
      const tipText = (guide.tips || [])
        .map((t) => t.text || "")
        .join(" ")
        .toLowerCase();

      return (
        (guide.app || "").toLowerCase().includes(term) || tipText.includes(term)
      );
    });

    renderGuides(filtered);
  });
});
