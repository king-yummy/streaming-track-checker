document.addEventListener("DOMContentLoaded", () => {
  const appGuidesContainer = document.getElementById("app-guides-container");
  const voteGuidesContainer = document.getElementById("vote-guides-container");
  const searchInput = document.getElementById("search-input");

  const startBtn = document.getElementById("startMacro");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      const extensionId = "elamnoganflfallmgnchjdmimanffjbd";
      chrome.runtime.sendMessage(
        extensionId,
        { action: "start" },
        (response) => {
          console.log("확장 프로그램 응답:", response);
        }
      );
    });
  }

  let allData = { appGuides: [], voteGuides: [] };

  fetch("guides.json")
    .then((response) => response.json())
    .then((data) => {
      allData = data;
      displayGuides(allData.appGuides, appGuidesContainer);
      displayGuides(allData.voteGuides, voteGuidesContainer);
    })
    .catch((error) => {
      console.error("Error fetching guide data:", error);
      appGuidesContainer.innerHTML =
        '<p class="text-red-500">가이드 정보를 불러오는 데 실패했습니다.</p>';
    });

  function createGuideElement(guide) {
    const element = document.createElement("div");
    element.className =
      "bg-white p-4 rounded-lg shadow-sm border border-gray-200";

    const summaryContent = `
            <span>${guide.title}</span>
            <span class="text-sm font-normal text-blue-500 bg-blue-50 px-2 py-1 rounded-full">${guide.app}</span>
        `;

    const detailsContent = `
            ${
              guide.period
                ? `<p class="text-sm mb-3"><strong>🗓️ 기간:</strong> ${guide.period}</p>`
                : ""
            }
            <div class="prose max-w-none prose-sm">${guide.guide}</div>
        `;

    element.innerHTML = `
            <details>
                <summary class="font-bold text-md cursor-pointer flex justify-between items-center">
                    ${summaryContent}
                </summary>
                <div class="mt-4 pt-4 border-t border-gray-200 text-gray-700">
                    ${detailsContent}
                </div>
            </details>
        `;

    // GA 이벤트 추가: 투표 가이드 펼쳐보기
    element.querySelector("details").addEventListener("toggle", (event) => {
      if (event.target.open) {
        gtag("event", "view_vote_guide", {
          guide_title: guide.title,
          guide_app: guide.app,
        });
      }
    });
    return element;
  }

  function displayGuides(guides, container) {
    container.innerHTML = "";
    if (guides.length === 0) {
      container.innerHTML =
        '<p class="text-gray-500 text-sm">표시할 가이드가 없습니다.</p>';
      return;
    }
    guides.forEach((guide) => {
      const guideElement = createGuideElement(guide);
      container.appendChild(guideElement);
    });
  }

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();

    // GA 이벤트 추가: 가이드 검색
    gtag("event", "search_vote_guide", {
      search_term: searchTerm,
    });

    const filterGuides = (guides) => {
      if (!searchTerm) return guides;
      return guides.filter((guide) => {
        const guideText = guide.guide.replace(/<[^>]*>/g, "").toLowerCase(); // HTML 태그 제거
        const searchInData = [
          guide.title.toLowerCase(),
          guide.app.toLowerCase(),
          ...(guide.tags || []).map((tag) => tag.toLowerCase()),
          guideText,
        ].join(" ");
        return searchInData.includes(searchTerm);
      });
    };

    displayGuides(filterGuides(allData.appGuides), appGuidesContainer);
    displayGuides(filterGuides(allData.voteGuides), voteGuidesContainer);
  });
});
