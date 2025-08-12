// js/calendar.js

document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");

  // 모달 요소들...
  const editModalOverlay = document.getElementById("edit-modal-overlay");
  const editModalPanel = document.getElementById("edit-modal-panel");
  const editModalTitle = document.querySelector(
    "#edit-modal-panel #edit-modal-title"
  );
  const closeEditModalBtn = document.getElementById("close-edit-modal-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const saveEventBtn = document.getElementById("save-event-btn");
  const titleInput = document.getElementById("modal-event-title");
  const dateInput = document.getElementById("modal-event-date");
  const timeInput = document.getElementById("modal-event-time");
  const addEndTimeBtn = document.getElementById("add-end-time-btn");
  const endTimeContainer = document.getElementById("end-time-container");
  const endDateInput = document.getElementById("modal-end-date");
  const endTimeInput = document.getElementById("modal-end-time");
  const dailyEventsModalOverlay = document.getElementById(
    "daily-events-modal-overlay"
  );
  const dailyEventsModalPanel = document.getElementById(
    "daily-events-modal-panel"
  );
  const dailyEventsModalTitle = document.getElementById(
    "daily-events-modal-title"
  );
  const dailyEventsList = document.getElementById("daily-events-list");
  const closeDailyEventsModalBtn = document.getElementById(
    "close-daily-events-modal-btn"
  );

  let currentEditingEventId = null;

  const openEditModal = (dateStr, event = null) => {
    currentEditingEventId = event ? event.id : null;
    endTimeContainer.classList.add("hidden");
    addEndTimeBtn.textContent = "+ 종료일시 추가";

    if (event) {
      editModalTitle.textContent = "일정 수정";

      // FullCalendar 이벤트 객체의 문자열을 활용 (타임존 변환 X)
      const startStr = event.startStr; // "YYYY-MM-DDTHH:mm:ss" 형태
      titleInput.value = event.title;
      dateInput.value = startStr.slice(0, 10);
      timeInput.value = startStr.slice(11, 16);

      if (event.end) {
        const endStr = event.endStr;
        endTimeContainer.classList.remove("hidden");
        addEndTimeBtn.textContent = "- 종료일시 제거";
        endDateInput.value = endStr.slice(0, 10);
        endTimeInput.value = endStr.slice(11, 16);
      } else {
        endTimeContainer.classList.add("hidden");
        addEndTimeBtn.textContent = "+ 종료일시 추가";
        endDateInput.value = "";
        endTimeInput.value = "10:00";
      }
    } else {
      // 추가
      editModalTitle.textContent = "새 일정 추가";
      dateInput.value = dateStr;
      timeInput.value = "09:00";
      titleInput.value = "";
      endDateInput.value = "";
      endTimeInput.value = "10:00";
    }
    editModalOverlay.classList.remove("hidden");
    editModalPanel.classList.remove("hidden");
  };

  const closeEditModal = () => {
    editModalOverlay.classList.add("hidden");
    editModalPanel.classList.add("hidden");
  };

  // body로 포털시킨 메뉴 정리
  const cleanUpPortalMenus = () => {
    document.querySelectorAll(".kebab-menu-options").forEach((menu) => {
      if (menu.parentElement === document.body) {
        menu.remove(); // 모달 재오픈 시 중복 잔재 제거
      } else {
        menu.classList.add("hidden");
      }
    });
  };

  const openDailyEventsModal = (date, events) => {
    const dateOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    };
    dailyEventsModalTitle.textContent = date.toLocaleDateString(
      "ko-KR",
      dateOptions
    );
    dailyEventsList.innerHTML = ""; // 기존 내용 초기화

    const closeAllMenus = () => {
      document
        .querySelectorAll(".kebab-menu-options")
        .forEach((menu) => menu.classList.add("hidden"));
    };
    dailyEventsModalPanel.addEventListener("click", closeAllMenus);
    dailyEventsModalOverlay.addEventListener("click", closeAllMenus);

    if (events.length === 0) {
      dailyEventsList.innerHTML =
        '<p class="text-gray-500 text-center py-4">등록된 일정이 없습니다.</p>';
    } else {
      events.forEach((event) => {
        const item = document.createElement("div");
        item.className =
          "event-item flex justify-between items-center p-3 bg-gray-50 rounded-lg";
        const startTime = new Date(event.start).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        item.innerHTML = `
          <div>
            <p class="font-semibold">${event.title}</p>
            <p class="text-sm text-gray-600">${startTime}</p>
          </div>
          <div class="kebab-menu relative">
            <button class="p-2 rounded-full hover:bg-gray-200">•••</button>
            <div class="kebab-menu-options hidden absolute right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-10 w-24">
              <button class="edit-btn w-full text-left px-4 py-2 hover:bg-gray-100">수정</button>
              <button class="delete-btn w-full text-left px-4 py-2 hover:bg-gray-100">삭제</button>
            </div>
          </div>
        `;
        dailyEventsList.appendChild(item);

        const kebabButton = item.querySelector(".kebab-menu > button");
        const menuOptions = item.querySelector(".kebab-menu-options");

        // 메뉴 버튼 클릭 시: body로 포털 + fixed 배치
        kebabButton.addEventListener("click", (e) => {
          e.stopPropagation(); // 이벤트 버블링 방지

          const wasHidden = menuOptions.classList.contains("hidden");

          // 다른 메뉴 먼저 닫기
          closeAllMenus();
          if (!wasHidden) return;

          // 처음 열 때 body로 이동(포털)
          if (!menuOptions.__movedToBody) {
            document.body.appendChild(menuOptions);
            menuOptions.__movedToBody = true;
          }

          // 보이기 전에 위치 계산을 위해 우선 노출
          menuOptions.classList.remove("hidden");

          // 고정 배치 + 충분한 z-index + 여백 초기화
          menuOptions.style.position = "fixed";
          menuOptions.style.zIndex = 9999;
          menuOptions.style.marginTop = "0";
          menuOptions.style.marginBottom = "0";
          // 기존 absolute 배치 속성 무효화를 위해 초기화
          menuOptions.style.right = "auto";
          menuOptions.style.left = "0px";
          menuOptions.style.top = "0px";
          menuOptions.style.bottom = "auto";

          // 버튼 위치
          const b = kebabButton.getBoundingClientRect();

          // 메뉴 실제 크기
          const mw = menuOptions.offsetWidth || 120;
          const mh = menuOptions.offsetHeight || 74;

          // 기본 위치: 버튼 아래쪽, 오른쪽 정렬
          let left = Math.max(8, b.right - mw);
          let top = b.bottom + 6;

          // 화면 하단 넘치면 위로 뒤집기
          if (top + mh > window.innerHeight) {
            top = b.top - mh - 6;
          }
          // 화면 오른쪽 넘치면 보정
          if (left + mw > window.innerWidth) {
            left = window.innerWidth - mw - 8;
          }
          // 화면 왼쪽 넘치면 보정
          if (left < 8) left = 8;

          menuOptions.style.left = `${left}px`;
          menuOptions.style.top = `${top}px`;
        });

        item.querySelector(".delete-btn").addEventListener("click", () => {
          if (confirm("정말로 이 일정을 삭제하시겠습니까?")) {
            deleteEvent(event.id);
          }
        });

        item.querySelector(".edit-btn").addEventListener("click", () => {
          closeDailyEventsModal();
          openEditModal(null, event);
        });
      });
    }
    dailyEventsModalOverlay.classList.remove("hidden");
    dailyEventsModalPanel.classList.remove("hidden");
  };

  function getEventsOnDate(calendar, clickedDate) {
    return calendar.getEvents().filter((event) => {
      const start = event.start;
      const end = event.end ? new Date(event.end.getTime() - 1) : start;

      const clickedDay = new Date(clickedDate).setHours(0, 0, 0, 0);
      const startDay = new Date(start).setHours(0, 0, 0, 0);
      const endDay = new Date(end).setHours(0, 0, 0, 0);

      return clickedDay >= startDay && clickedDay <= endDay;
    });
  }

  const closeDailyEventsModal = () => {
    // 모달 닫힐 때 떠 있는 메뉴 정리
    cleanUpPortalMenus();
    dailyEventsModalOverlay.classList.add("hidden");
    dailyEventsModalPanel.classList.add("hidden");
  };

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: "auto",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "addEventButton",
    },
    customButtons: {
      addEventButton: {
        text: "+",
        click: () => openEditModal(new Date().toISOString().slice(0, 10)),
      },
    },
    events: "/api/events", // [수정] 새 API 주소
    displayEventTime: false,
    // 날짜 셀 클릭: 기존 로직을 헬퍼로 단순화
    dateClick: function (info) {
      openDailyEventsModal(info.date, getEventsOnDate(calendar, info.date));
    },

    // ★ 이벤트(제목/점) 클릭: 해당 '셀의 날짜'로 모달 열기
    eventClick: function (info) {
      info.jsEvent.preventDefault(); // url 이동 방지 등
      // 클릭된 이벤트가 놓인 day 셀에서 날짜를 추출 (멀티데이 이벤트 대응)
      const dayCell = info.el.closest(".fc-daygrid-day");
      const dateStr =
        dayCell?.getAttribute("data-date") || info.event.startStr.slice(0, 10);
      const date = new Date(dateStr);

      openDailyEventsModal(date, getEventsOnDate(calendar, date));
    },
  });

  calendar.render();

  closeEditModalBtn.addEventListener("click", closeEditModal);
  cancelEditBtn.addEventListener("click", closeEditModal);
  editModalOverlay.addEventListener("click", closeEditModal);
  closeDailyEventsModalBtn.addEventListener("click", closeDailyEventsModal);
  dailyEventsModalOverlay.addEventListener("click", closeDailyEventsModal);

  addEndTimeBtn.addEventListener("click", () => {
    const isHidden = endTimeContainer.classList.toggle("hidden");
    addEndTimeBtn.textContent = isHidden
      ? "+ 종료일시 추가"
      : "- 종료일시 제거";
  });

  saveEventBtn.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    const start = `${dateInput.value}T${timeInput.value}`;
    let end = null;
    if (
      !endTimeContainer.classList.contains("hidden") &&
      endDateInput.value &&
      endTimeInput.value
    ) {
      end = `${endDateInput.value}T${endTimeInput.value}`;
    }

    if (!title || !dateInput.value || !timeInput.value) {
      return alert("내용, 시작일, 시간은 필수입니다.");
    }

    const eventData = { id: currentEditingEventId, title, start, end };

    if (currentEditingEventId) {
      // ID가 있으면 수정
      await updateEvent(eventData);
    } else {
      // ID가 없으면 추가
      await addEvent(eventData);
    }

    closeEditModal();
    calendar.refetchEvents();
  });

  // --- API 통신 함수 ---
  async function apiRequest(method, body) {
    try {
      const response = await fetch("/api/events", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || `API ${method} 요청 실패`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error with ${method} request:`, error);
      alert(`오류: ${error.message}`);
    }
  }

  // 일정 추가 함수
  async function addEvent(eventData) {
    const { title, start, end } = eventData;
    const [date, startTime] = start.split("T");
    const [endDate, endTime] = end ? end.split("T") : [null, null];

    await apiRequest("POST", { title, date, startTime, endDate, endTime });
  }

  // 일정 수정 함수
  async function updateEvent(eventData) {
    await apiRequest("PUT", eventData);
  }

  // 일정 삭제 함수
  async function deleteEvent(eventId) {
    await apiRequest("DELETE", { id: eventId });
    closeDailyEventsModal();
    calendar.refetchEvents();
  }
});
