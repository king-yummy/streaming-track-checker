// vote_guide.js
// 투표 가이드 페이지에서 CSV 기반 데이터를 검색하고 표시하기 위한 스크립트입니다.

// votes.json 파일을 불러와서 검색을 수행합니다.
fetch('votes.json')
  .then((response) => response.json())
  .then((data) => {
    const searchInput = document.getElementById('search');
    const resultsContainer = document.getElementById('results');

    function render(filter = '') {
      const keyword = filter.trim().toLowerCase();
      resultsContainer.innerHTML = '';
      data.forEach((item) => {
        const groupTitle = (item.GroupTitle || '').toLowerCase();
        const title = (item.Title || '').toLowerCase();
        // 키워드가 없거나 그룹명이나 제목에 포함될 경우만 표시
        if (
          !keyword ||
          groupTitle.includes(keyword) ||
          title.includes(keyword)
        ) {
          const div = document.createElement('div');
          div.className = 'vote-item';
          // 그룹 이름과 항목 제목
          let header = '';
          if (item.GroupTitle) header += `<strong>${item.GroupTitle}</strong>`;
          if (item.Title) header += ` - ${item.Title}`;
          div.innerHTML = `
            <h3>${header}</h3>
            ${item.StartDate ? `<p>시작: ${item.StartDate}</p>` : ''}
            ${item.EndDate ? `<p>마감: ${item.EndDate}</p>` : ''}
            ${item.AppLink ? `<p><a href="${item.AppLink}" target="_blank">앱 링크 이동</a></p>` : ''}
            ${item.RewardText1 ? `<p>보상: ${item.RewardText1}</p>` : ''}
          `;
          resultsContainer.appendChild(div);
        }
      });
    }
    // 초기 렌더링
    render();
    // 검색 이벤트
    searchInput.addEventListener('input', () => render(searchInput.value));
  })
  .catch((error) => {
    console.error('votes.json 로딩 실패:', error);
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '<p>데이터를 로딩하는 데 실패했습니다.</p>';
  });