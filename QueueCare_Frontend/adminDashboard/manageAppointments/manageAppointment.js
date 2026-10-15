const API = "http://localhost:3000/api/appointments";
const deletePath = "http://localhost:3000/api/appointments/delete";
// const deletePath = "http://localhost:3000/api/appointments";
const path = "http://localhost:3000/api/appointments/adminRoute";
const token = localStorage.getItem("token");

let appointments = [];
let filteredAppointments = [];
let currentPage = 1;

const limit = 8;

// HTML elements
const container = document.getElementById("appointmentsGrid");
const emptyState = document.getElementById("emptyState");
const message = document.getElementById("appointmentMessage");

const matchingCount = document.getElementById("matchingCount");
const currentFilterLabel = document.getElementById("currentFilterLabel");
const resultsSubtitle = document.getElementById("resultsSubtitle");
const pageInfo = document.getElementById("pageInfo");

const filterDate = document.getElementById("filterDate");
const filterStatus = document.getElementById("filterStatus");

const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");

// Common request headers
// function getHeaders() {
//     return {
//         headers: {
//             Authorization: `Bearer ${token}`
//         }
//     };
// }

// Safe text for HTML
function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
}

// Convert date to India timezone: YYYY-MM-DD
function getIndiaDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    const year = parts.find(part => part.type === "year").value;
    const month = parts.find(part => part.type === "month").value;
    const day = parts.find(part => part.type === "day").value;

    return `${year}-${month}-${day}`;
}

// Show message
function showMessage(text, type = "") {
    message.textContent = text;
    message.className = `message ${type}`.trim();
}

// Get appointments
async function getAppointments() {
    try {
        container.innerHTML = "<p>Loading appointments...</p>";
        emptyState.classList.add("hidden");
        message.classList.add("hidden");


        const res = await axios.get(path, 
                        {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
        );
         
      
        appointments = res.data.appointments || [];

        applyFilters();

    } catch (err) {
        console.log(err.response?.data || err.message);

        container.innerHTML = "";
        emptyState.classList.add("hidden");

        showMessage(
            err.response?.data?.message || "Failed to load appointments.",
            "error"
        );
    }
}



// Filter appointments by date and status
function applyFilters() {
    const date = filterDate.value;
    const status = filterStatus.value;

    filteredAppointments = appointments.filter(apt => {
        const appointmentDate = apt.date || apt.appointmentDate;

        const dateMatches =
            !date || getIndiaDate(appointmentDate) === date;

        const statusMatches =
            status === "all" ||
            String(apt.status || "").toLowerCase() === status;

        return dateMatches && statusMatches;
    });

    currentPage = 1;

    matchingCount.textContent = filteredAppointments.length;

    const dateLabel = date || "All Dates";
    const statusLabel = status === "all" ? "All Statuses" : status;

    currentFilterLabel.textContent =
        `${dateLabel} | ${statusLabel}`;

    resultsSubtitle.textContent =
        `${filteredAppointments.length} appointment(s) found`;

    showAppointments();
}

// Display appointment cards
function showAppointments() {
    const totalPages = Math.max(
        1,
        Math.ceil(filteredAppointments.length / limit)
    );

    if (filteredAppointments.length === 0) {
        container.innerHTML = "";
        emptyState.classList.remove("hidden");

        pageInfo.textContent = "Page 1 of 1";
        prevPage.disabled = true;
        nextPage.disabled = true;

        return;
    }

    emptyState.classList.add("hidden");

    const start = (currentPage - 1) * limit;
    const pageAppointments = filteredAppointments.slice(start, start + limit);

    container.innerHTML = pageAppointments.map(apt => {
        const id = apt.appointmentId || apt._id || apt.id;
        const date = apt.date || apt.appointmentDate;
        const time = apt.time || apt.appointmentTime || "N/A";

        const doctor = apt.doctor || {};
        const clinic = apt.clinic || {};
        const status = String(apt.status || "booked").toLowerCase();

        return `
            <div class="appointment-card">
                <div class="appointment-card-header">
                    <span>Token #${escapeHTML(apt.tokenNumber ?? "N/A")}</span>
                    <span class="status-badge status-${escapeHTML(status)}">
                        ${escapeHTML(status)}
                    </span>
                </div>

                <h3>${escapeHTML(doctor.name || "Doctor not available")}</h3>

                <p>
                    <strong>Specialization:</strong>
                    ${escapeHTML(doctor.specialization || "N/A")}
                </p>

                <p>
                    <strong>Clinic:</strong>
                    ${escapeHTML(clinic.name || "N/A")}
                </p>

                <p>
                    <strong>Address:</strong>
                    ${escapeHTML(clinic.address || "N/A")}
                </p>

                <p>
                    <strong>Date:</strong>
                    ${escapeHTML(getIndiaDate(date) || "N/A")}
                </p>

                <p>
                    <strong>Time:</strong>
                    ${escapeHTML(time)}
                </p>

                <button
                    type="button"
                    class="delete-appointment-btn"
                    data-id="${escapeHTML(id || "")}"
                    ${id ? "" : "disabled"}
                >
                    Delete Appointment
                </button>
            </div>
        `;
    }).join("");

    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages;
}

// Previous page
prevPage.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        showAppointments();
    }
});

// Next page
nextPage.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredAppointments.length / limit);

    if (currentPage < totalPages) {
        currentPage++;
        showAppointments();
    }
});

// Delete appointment
async function deleteAppointment(id) {

    if (!id) {
        alert("Appointment ID not found.");
        return;
    }

    if (!confirm("Are you sure you want to delete this appointment?")) {
        return;
    }

    try {
        const res = await axios.delete(`${deletePath}/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        alert(res.data.message || "Appointment deleted successfully.");

        // Fetch updated appointments and refresh the UI
        await getAppointments();

    } catch (err) {
        console.log(err.response?.data || err.message);

        alert(
            err.response?.data?.message ||
            "Failed to delete appointment."
        );
    }
}





// Handle Delete button clicks
container.addEventListener("click", event => {
    const button = event.target.closest(".delete-appointment-btn");

    if (!button) return;

    deleteAppointment(button.dataset.id);
});

// Apply filters
document.getElementById("applyFilters").addEventListener("click", () => {
    applyFilters();
});

// Clear filters
document.getElementById("clearFilters").addEventListener("click", () => {
    filterDate.value = "";
    filterStatus.value = "all";

    applyFilters();
});

// Refresh appointments
document.getElementById("refreshAppointments").addEventListener("click", () => {
    getAppointments();
});

// Initial load
getAppointments();