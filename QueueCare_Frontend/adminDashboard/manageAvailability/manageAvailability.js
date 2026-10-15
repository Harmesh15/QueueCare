
const API_BASE = "http://localhost:3000/api";
const DOCTORS_API = `${API_BASE}/doctors`;
const AVAILABILITY_API = `${API_BASE}/availability`;

const token = localStorage.getItem("token");

const weekDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
];

const doctorSelect = document.getElementById("doctorSelect");
const scheduleContainer = document.getElementById("scheduleContainer");
const doctorInfo = document.getElementById("doctorInfo");
const messageBox = document.getElementById("availabilityMessage");
const saveButton = document.getElementById("saveAvailability");

let doctors = [];
let savedSchedule = [];
let currentDoctorId = "";
let loadingSchedule = false;

// ---------------- API HELPER ----------------

async function apiRequest(url, options = {}) {
    const headers = {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

// ---------------- HELPERS ----------------

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function getDoctorId(doctor) {
    return doctor._id || doctor.id;
}

function getDoctorName(doctor) {
    return doctor.userId?.name || doctor.name || "Doctor";
}

function getSpecialization(doctor) {
    return doctor.specialization || "Specialization not specified";
}

function showMessage(message, isError = false) {
    messageBox.textContent = message;
    messageBox.classList.remove("hidden", "error");

    if (isError) {
        messageBox.classList.add("error");
    }
}

function hideMessage() {
    messageBox.textContent = "";
    messageBox.classList.add("hidden");
}

// ---------------- GENERATE WEEKLY ROWS ----------------

function renderEmptySchedule() {
    scheduleContainer.innerHTML = weekDays.map(day => `
        <div class="schedule-row is-unavailable" data-day="${day}">
            <div class="day-name">
                ${day}
                <span class="day-label">Weekly schedule</span>
            </div>

            <label class="availability-toggle">
                <input
                    type="checkbox"
                    class="day-availability"
                    data-day="${day}"
                    disabled
                >
                <span class="toggle-track"></span>
                <span class="availability-text">Unavailable</span>
            </label>

            <input type="time" class="start-time" value="09:00" disabled>
            <input type="time" class="end-time" value="17:00" disabled>
        </div>
    `).join("");
}

function renderSchedule(schedule = []) {
    const scheduleByDay = new Map(
        schedule.map(item => [item.dayOfWeek, item])
    );

    scheduleContainer.innerHTML = weekDays.map(day => {
        const item = scheduleByDay.get(day);
        const isAvailable = item?.isAvailable === true;

        return `
            <div class="schedule-row ${isAvailable ? "" : "is-unavailable"}"
                data-day="${day}">

                <div class="day-name">
                    ${day}
                    <span class="day-label">Weekly schedule</span>
                </div>

                <label class="availability-toggle">
                    <input
                        type="checkbox"
                        class="day-availability"
                        data-day="${day}"
                        ${isAvailable ? "checked" : ""}
                    >
                    <span class="toggle-track"></span>
                    <span class="availability-text">
                        ${isAvailable ? "Available" : "Unavailable"}
                    </span>
                </label>

                <input
                    type="time"
                    class="start-time"
                    value="${escapeHTML(item?.startTime || "09:00")}"
                    ${isAvailable ? "" : "disabled"}
                    aria-label="${day} start time"
                >

                <input
                    type="time"
                    class="end-time"
                    value="${escapeHTML(item?.endTime || "17:00")}"
                    ${isAvailable ? "" : "disabled"}
                    aria-label="${day} end time"
                >
            </div>
        `;
    }).join("");
}

// ---------------- TOGGLE AVAILABILITY ----------------

scheduleContainer.addEventListener("change", event => {
    if (!event.target.classList.contains("day-availability")) {
        return;
    }

    const checkbox = event.target;
    const row = checkbox.closest(".schedule-row");
    const startInput = row.querySelector(".start-time");
    const endInput = row.querySelector(".end-time");
    const statusText = row.querySelector(".availability-text");

    startInput.disabled = !checkbox.checked;
    endInput.disabled = !checkbox.checked;

    row.classList.toggle("is-unavailable", !checkbox.checked);

    statusText.textContent = checkbox.checked
        ? "Available"
        : "Unavailable";

    hideMessage();
});

// ---------------- LOAD DOCTORS ----------------

async function loadDoctors() {
    doctorSelect.disabled = true;
    doctorSelect.innerHTML = `<option value="">Loading doctors...</option>`;
    saveButton.disabled = true;

    try {
        const data = await apiRequest(DOCTORS_API);

        doctors = Array.isArray(data)
            ? data
            : Array.isArray(data.doctors)
                ? data.doctors
                : [];

        doctorSelect.innerHTML = `
            <option value="">-- Select a Doctor --</option>
            ${doctors.map(doctor => `
                <option value="${escapeHTML(getDoctorId(doctor))}">
                    ${escapeHTML(getDoctorName(doctor))}
                    — ${escapeHTML(getSpecialization(doctor))}
                </option>
            `).join("")}
        `;

        if (doctors.length === 0) {
            doctorSelect.innerHTML =
                `<option value="">No doctors found</option>`;
        }
    } catch (error) {
        doctorSelect.innerHTML =
            `<option value="">Unable to load doctors</option>`;
        showMessage(error.message, true);
    } finally {
        doctorSelect.disabled = false;
    }
}

// ---------------- LOAD SELECTED DOCTOR SCHEDULE ----------------

async function loadWeeklyAvailability(doctorId) {
    currentDoctorId = doctorId;
    hideMessage();

    const doctor = doctors.find(
        item => String(getDoctorId(item)) === String(doctorId)
    );

    if (!doctorId || !doctor) {
        doctorInfo.classList.add("hidden");
        renderEmptySchedule();
        saveButton.disabled = true;
        return;
    }

    document.getElementById("selectedDoctorName").textContent =
        getDoctorName(doctor);

    document.getElementById("selectedDoctorSpecialization").textContent =
        getSpecialization(doctor);

    doctorInfo.classList.remove("hidden");
    loadingSchedule = true;
    saveButton.disabled = true;

    renderEmptySchedule();

    try {
        const data = await apiRequest(
            `${AVAILABILITY_API}/weekly/${doctorId}`
        );

        savedSchedule = Array.isArray(data.schedule)
            ? data.schedule.map(item => ({ ...item }))
            : [];

        if (currentDoctorId !== doctorId) return;

        renderSchedule(savedSchedule);
    } catch (error) {
        if (currentDoctorId !== doctorId) return;

        savedSchedule = [];
        renderSchedule([]);

        showMessage(
            `Could not load the saved schedule: ${error.message}. ` +
            `You can configure all seven days and save a new schedule.`,
            true
        );
    } finally {
        if (currentDoctorId === doctorId) {
            loadingSchedule = false;
            saveButton.disabled = false;
        }
    }
}

doctorSelect.addEventListener("change", () => {
    loadWeeklyAvailability(doctorSelect.value);
});

// ---------------- COLLECT SCHEDULE ----------------

function collectSchedule() {
    const schedule = [];

    for (const day of weekDays) {
        const row = scheduleContainer.querySelector(
            `.schedule-row[data-day="${day}"]`
        );

        const checkbox = row.querySelector(".day-availability");
        const startTime = row.querySelector(".start-time").value;
        const endTime = row.querySelector(".end-time").value;

        if (checkbox.checked) {
            if (!startTime || !endTime) {
                throw new Error(
                    `Please enter start and end times for ${day}.`
                );
            }

            if (startTime >= endTime) {
                throw new Error(
                    `End time must be later than start time on ${day}.`
                );
            }
        }

        schedule.push({
            dayOfWeek: day,
            isAvailable: checkbox.checked,
            ...(checkbox.checked ? { startTime, endTime } : {})
        });
    }

    return schedule;
}

// ---------------- SAVE WEEKLY AVAILABILITY ----------------

saveButton.addEventListener("click", async () => {
    if (!currentDoctorId || loadingSchedule) {
        showMessage("Please select a doctor first.", true);
        return;
    }

    hideMessage();

    let schedule;

    try {
        schedule = collectSchedule();
    } catch (error) {
        showMessage(error.message, true);
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const data = await apiRequest(
            `${AVAILABILITY_API}/weekly`,
            {
                method: "PUT",
                body: JSON.stringify({
                    doctorId: currentDoctorId,
                    schedule
                })
            }
        );

        savedSchedule = Array.isArray(data.schedule)
            ? data.schedule.map(item => ({ ...item }))
            : schedule.map(item => ({ ...item }));

        renderSchedule(savedSchedule);
        showMessage("Weekly availability saved successfully!");
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Availability";
    }
});

// ---------------- RESET UNSAVED CHANGES ----------------

document.getElementById("resetSchedule").addEventListener("click", () => {
    if (!currentDoctorId) {
        renderEmptySchedule();
        hideMessage();
        return;
    }

    renderSchedule(savedSchedule);
    hideMessage();
});

// ---------------- INITIALIZE ----------------

renderEmptySchedule();
loadDoctors();
