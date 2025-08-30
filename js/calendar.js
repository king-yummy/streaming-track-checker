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
  const addEndTimeBtn = document.getElementById("add-end-time-btn");
  const endTimeContainer = document.getElementById("end-time-container");
  const endDateInput = document.getElementById("modal-end-date");
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

  // [수정] 3개로 분리된 시간 드롭다운 요소
  const timeAmPmInput = document.getElementById("modal-event-ampm");
  const timeHourInput = document.getElementById("modal-event-hour");
  const timeMinuteInput = document.getElementById("modal-event-minute");
  const endTimeAmPmInput = document.getElementById("modal-end-ampm");
  const endTimeHourInput = document.getElementById("modal-end-hour");
  const endTimeMinuteInput = document.getElementById("modal-end-minute");

  let currentEditingEventId = null;

  // [추가] 시간 관련 드롭다운 메뉴를 채우는 함수
  function populateTimeDropdowns() {
    timeAmPmInput.innerHTML =
      '<option value="AM">오전</option><option value="PM">오후</option>';
    endTimeAmPmInput.innerHTML =
      '<option value="AM">오전</option><option value="PM">오후</option>';

    let hourOptions = "";
    for (let i = 1; i <= 12; i++) {
      const hour = String(i).padStart(2, "0");
      hourOptions += `<option value="${hour}">${hour}</option>`;
    }
    timeHourInput.innerHTML = hourOptions;
    endTimeHourInput.innerHTML = hourOptions;

    let minuteOptions = "";
    for (let i = 0; i < 60; i += 5) {
      const minute = String(i).padStart(2, "0");
      minuteOptions += `<option value="${minute}">${minute}</option>`;
    }
    timeMinuteInput.innerHTML = minuteOptions;
    endTimeMinuteInput.innerHTML = minuteOptions;
  }

  populateTimeDropdowns();

  // [추가] 12시간제(오전/오후) -> 24시간제 변환 함수
  function convert12to24(ampm, hourStr, minuteStr) {
    let hour = parseInt(hourStr, 10);
    if (ampm === "PM" && hour < 12) {
      hour += 12;
    }
    if (ampm === "AM" && hour === 12) {
      hour = 0; // 자정 (오전 12시)
    }
    return `${String(hour).padStart(2, "0")}:${minuteStr}`;
  }

  // [추가] 24시간제 -> 12시간제(오전/오후) 변환 함수
  function convert24to12(time24) {
    const [hour24, minute] = time24.split(":").map((n) => parseInt(n, 10));
    const ampm = hour24 >= 12 ? "PM" : "AM";
    let hour12 = hour24 % 12;
    if (hour12 === 0) {
      hour12 = 12; // 자정, 정오
    }
    const roundedMinute = Math.floor(minute / 5) * 5;
    return {
      ampm,
      hour: String(hour12).padStart(2, "0"),
      minute: String(roundedMinute).padStart(2, "0"),
    };
  }

  const openEditModal = (dateStr, event = null) => {
    currentEditingEventId = event ? event.id : null;
    endTimeContainer.classList.add("hidden");
    addEndTimeBtn.textContent = "+ 종료일시 추가";

    if (event) {
      // 수정
      editModalTitle.textContent = "일정 수정";
      titleInput.value = event.title;

      const [datePart, timePart] = event.startStr.slice(0, 16).split("T");
      const { ampm, hour, minute } = convert24to12(timePart);
      dateInput.value = datePart;
      timeAmPmInput.value = ampm;
      timeHourInput.value = hour;
      timeMinuteInput.value = minute;

      if (event.end) {
        endTimeContainer.classList.remove("hidden");
        addEndTimeBtn.textContent = "- 종료일시 제거";
        const [endDatePart, endTimePart] = event.endStr.slice(0, 16).split("T");
        const endConverted = convert24to12(endTimePart);
        endDateInput.value = endDatePart;
        endTimeAmPmInput.value = endConverted.ampm;
        endTimeHourInput.value = endConverted.hour;
        endTimeMinuteInput.value = endConverted.minute;
      } else {
        endDateInput.value = "";
      }
    } else {
      // 추가
      editModalTitle.textContent = "새 일정 추가";
      titleInput.value = "";
      dateInput.value = dateStr;
      timeAmPmInput.value = "AM";
      timeHourInput.value = "09";
      timeMinuteInput.value = "00";
      endDateInput.value = "";
      endTimeAmPmInput.value = "AM";
      endTimeHourInput.value = "10";
      endTimeMinuteInput.value = "00";
    }
    editModalOverlay.classList.remove("hidden");
    editModalPanel.classList.remove("hidden");
  };

  const closeEditModal = () => {
    editModalOverlay.classList.add("hidden");
    editModalPanel.classList.add("hidden");
  };

  const cleanUpPortalMenus = () => {
    document.querySelectorAll(".kebab-menu-options").forEach((menu) => {
      if (menu.parentElement === document.body) {
        menu.remove();
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
    dailyEventsList.innerHTML = "";

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

        kebabButton.addEventListener("click", (e) => {
          e.stopPropagation();

          const wasHidden = menuOptions.classList.contains("hidden");
          closeAllMenus();
          if (!wasHidden) return;

          if (!menuOptions.__movedToBody) {
            document.body.appendChild(menuOptions);
            menuOptions.__movedToBody = true;
          }

          menuOptions.classList.remove("hidden");
          menuOptions.style.position = "fixed";
          menuOptions.style.zIndex = 9999;
          menuOptions.style.marginTop = "0";
          menuOptions.style.marginBottom = "0";
          menuOptions.style.right = "auto";
          menuOptions.style.left = "0px";
          menuOptions.style.top = "0px";
          menuOptions.style.bottom = "auto";

          const b = kebabButton.getBoundingClientRect();
          const mw = menuOptions.offsetWidth || 120;
          const mh = menuOptions.offsetHeight || 74;

          let left = Math.max(8, b.right - mw);
          let top = b.bottom + 6;

          if (top + mh > window.innerHeight) {
            top = b.top - mh - 6;
          }
          if (left + mw > window.innerWidth) {
            left = window.innerWidth - mw - 8;
          }
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
    cleanUpPortalMenus();
    dailyEventsModalOverlay.classList.add("hidden");
    dailyEventsModalPanel.classList.add("hidden");
  };

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: "auto",
    locale: "ko",
    titleFormat: {
      year: "numeric",
      month: "short",
    },
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
    events: "/api/events",
    displayEventTime: false,
    dateClick: function (info) {
      openDailyEventsModal(info.date, getEventsOnDate(calendar, info.date));
    },
    eventClick: function (info) {
      info.jsEvent.preventDefault();
      const dayCell = info.el.closest(".fc-daygrid-day");
      const dateStr =
        dayCell?.getAttribute("data-date") || info.event.startStr.slice(0, 10);
      const date = new Date(dateStr);
      openDailyEventsModal(date, getEventsOnDate(calendar, date));
    },
    // ▼▼▼▼▼ 이 부분만 새로 추가해주세요! ▼▼▼▼▼
    viewDidMount: function () {
      attachTitleClickListener();
    },
    // ▲▲▲▲▲ 여기까지 추가 ▲▲▲▲▲
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
    if (!title || !dateInput.value) {
      return alert("내용과 시작일은 필수입니다.");
    }

    // [수정] 3개 드롭다운에서 24시간제 시간 문자열 생성
    const startTime24 = convert12to24(
      timeAmPmInput.value,
      timeHourInput.value,
      timeMinuteInput.value
    );
    const start = `${dateInput.value}T${startTime24}`;

    let end = null;
    if (!endTimeContainer.classList.contains("hidden") && endDateInput.value) {
      const endTime24 = convert12to24(
        endTimeAmPmInput.value,
        endTimeHourInput.value,
        endTimeMinuteInput.value
      );
      end = `${endDateInput.value}T${endTime24}`;
    }

    const eventData = { id: currentEditingEventId, title, start, end };

    if (currentEditingEventId) {
      await updateEvent(eventData);
    } else {
      await addEvent(eventData);
    }

    closeEditModal();
    calendar.refetchEvents();
  });

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

  async function addEvent(eventData) {
    const { title, start, end } = eventData;
    const [date, startTime] = start.split("T");
    const [endDate, endTime] = end ? end.split("T") : [null, null];
    await apiRequest("POST", { title, date, startTime, endDate, endTime });
  }

  async function updateEvent(eventData) {
    await apiRequest("PUT", eventData);
  }

  async function deleteEvent(eventId) {
    await apiRequest("DELETE", { id: eventId });
    closeDailyEventsModal();
    calendar.refetchEvents();
  }

  // --- 날짜 선택 팝업창 관련 코드 ---

  const datePickerModalOverlay = document.getElementById(
    "date-picker-modal-overlay"
  );
  const datePickerModalPanel = document.getElementById(
    "date-picker-modal-panel"
  );
  const closeDatePickerBtn = document.getElementById("close-date-picker-btn");
  const cancelDateBtn = document.getElementById("cancel-date-btn");
  const yearSelect = document.getElementById("year-select");
  const monthSelect = document.getElementById("month-select");
  const confirmDateBtn = document.getElementById("confirm-date-btn");

  /**
   * 캘린더 제목(예: 2025년 8월)에 클릭 이벤트를 연결하는 함수 (수정된 버전)
   */
  function attachTitleClickListener() {
    const titleEl = document.querySelector(".fc-toolbar-title");

    // 요소가 존재하고, 아직 클릭 이벤트가 등록되지 않았을 경우에만 실행
    if (titleEl && !titleEl.dataset.listenerAttached) {
      titleEl.style.cursor = "pointer"; // 마우스 커서를 손가락 모양으로 변경
      titleEl.addEventListener("click", openDatePicker);

      // 이벤트가 중복으로 등록되는 것을 방지하기 위해 표시를 남김
      titleEl.dataset.listenerAttached = "true";
    }
  }

  /**
   * 팝업창에 현재 캘린더의 연도와 월을 채워넣는 함수
   */
  function populateDatePicker() {
    const currentDate = calendar.view.currentStart;
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth()는 0부터 시작하므로 +1

    yearSelect.innerHTML = ""; // 기존 옵션 초기화
    // 현재 연도 기준 -5년부터 +5년까지 선택지를 만듭니다.
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      const option = new Option(i + "년", i);
      if (i === currentYear) option.selected = true; // 현재 연도를 기본으로 선택
      yearSelect.add(option);
    }

    monthSelect.innerHTML = ""; // 기존 옵션 초기화
    for (let i = 1; i <= 12; i++) {
      const option = new Option(i + "월", i);
      if (i === currentMonth) option.selected = true; // 현재 월을 기본으로 선택
      monthSelect.add(option);
    }
  }

  /**
   * 팝업창을 여는 함수
   */
  function openDatePicker() {
    populateDatePicker(); // 팝업창을 열 때마다 현재 날짜로 내용 업데이트
    datePickerModalOverlay.classList.remove("hidden");
    datePickerModalPanel.classList.remove("translate-y-full");
  }

  /**
   * 팝업창을 닫는 함수
   */
  function closeDatePicker() {
    datePickerModalOverlay.classList.add("hidden");
    datePickerModalPanel.classList.add("translate-y-full");
  }

  // 팝업창의 버튼들과 배경에 닫기 기능을 연결합니다.
  closeDatePickerBtn.addEventListener("click", closeDatePicker);
  cancelDateBtn.addEventListener("click", closeDatePicker);
  datePickerModalOverlay.addEventListener("click", closeDatePicker);

  // '확인' 버튼을 눌렀을 때의 동작
  confirmDateBtn.addEventListener("click", () => {
    const year = yearSelect.value;
    const month = monthSelect.value;
    const day = "01"; // 항상 해당 월의 1일로 이동

    // FullCalendar 라이브러리의 기능(gotoDate)을 사용해 캘린더를 해당 날짜로 이동시킵니다.
    calendar.gotoDate(`${year}-${String(month).padStart(2, "0")}-${day}`);
    closeDatePicker(); // 날짜 이동 후 팝업창 닫기
  });
});
