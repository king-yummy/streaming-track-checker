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
      // 수정
      const start = new Date(event.start);
      editModalTitle.textContent = "일정 수정";
      titleInput.value = event.title;
      dateInput.value = start.toISOString().slice(0, 10);
      timeInput.value = start.toTimeString().slice(0, 5);
      if (event.end) {
        const end = new Date(event.end);
        endTimeContainer.classList.remove("hidden");
        addEndTimeBtn.textContent = "- 종료일시 제거";
        endDateInput.value = end.toISOString().slice(0, 10);
        endTimeInput.value = end.toTimeString().slice(0, 5);
      }
    } else {
      // 추가
      editModalTitle.textContent = "새 일정 추가";
      dateInput.value = dateStr;
      timeInput.value = "09:00";
      titleInput.value = "";
      endDateInput.value = "";
      endTimeInput.value = "";
    }
    editModalOverlay.classList.remove("hidden");
    editModalPanel.classList.remove("hidden");
  };

  const closeEditModal = () => {
    editModalOverlay.classList.add("hidden");
    editModalPanel.classList.add("hidden");
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
        item.innerHTML = `<div><p class="font-semibold">${event.title}</p><p class="text-sm text-gray-600">${startTime}</p></div><div class="kebab-menu relative"><button class="p-2 rounded-full hover:bg-gray-200">•••</button><div class="kebab-menu-options hidden absolute right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-10 w-24"><button class="edit-btn">수정</button><button class="delete-btn">삭제</button></div></div>`;
        dailyEventsList.appendChild(item);

        const kebabButton = item.querySelector(".kebab-menu > button");
        const menuOptions = item.querySelector(".kebab-menu-options");

        kebabButton.addEventListener("click", (e) => {
          e.stopPropagation();
          menuOptions.classList.toggle("hidden");
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

  const closeDailyEventsModal = () => {
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
    dateClick: function (info) {
      const eventsOnDate = calendar
        .getEvents()
        .filter(
          (event) =>
            new Date(event.start).toISOString().slice(0, 10) === info.dateStr
        );
      openDailyEventsModal(info.date, eventsOnDate);
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
    const eventData = {
      id: currentEditingEventId,
      title: titleInput.value.trim(),
      date: dateInput.value,
      startTime: timeInput.value,
      endDate: null,
      endTime: null,
    };
    if (!endTimeContainer.classList.contains("hidden")) {
      eventData.endDate = endDateInput.value;
      eventData.endTime = endTimeInput.value;
    }
    if (!eventData.title || !eventData.date || !eventData.startTime) {
      return alert("내용, 시작일, 시간은 필수입니다.");
    }

    // [수정] 지금은 추가와 수정 API가 분리되어 있지 않으므로, 추가만 구현
    // if (currentEditingEventId) { await updateEvent(eventData); } else { await addEvent(eventData); }
    await addEvent(eventData); // 일단 추가만

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

  async function addEvent(eventData) {
    await apiRequest("POST", eventData);
  }

  async function deleteEvent(eventId) {
    await apiRequest("DELETE", { id: eventId });
    closeDailyEventsModal();
    calendar.refetchEvents();
  }
});
