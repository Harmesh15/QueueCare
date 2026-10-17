const appointmentsContainer =
    document.getElementById("appointmentsContainer");

const appointmentsMessage =
    document.getElementById("appointmentsMessage");

const callNextBtn = document.getElementById("callNextBtn");
const refreshBtn = document.getElementById("refreshBtn");
const dateFilter = document.getElementById("dateFilter");
const statusFilter = document.getElementById("statusFilter");

const token = localStorage.getItem("token");

let allAppointments = [];
let socket = null;
let isCallingNext = false;

if (!token) {
    window.location.href = "../login/login.html";
}

function authConfig() {
    return {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
        }
    };
}

function showMessage(message, type = "") {
    appointmentsMessage.textContent = message;
    appointmentsMessage.className = `message ${type}`;
}

function getAppointmentDate(appointment) {
    const value =
        appointment.appointmentDate ||
        appointment.date;

    if (!value) return "";

    // Date-only strings ko timezone conversion ke bina handle karo.
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        return String(value);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    const getPart = (type) =>
        parts.find(part => part.type === type)?.value || "";

    return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

function formatDate(dateValue) {
    if (!dateValue) return "N/A";

    const dateString = getAppointmentDate({
        appointmentDate: dateValue
    });

    if (!dateString) return "N/A";

    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatTime(time) {
    if (!time) return "N/A";

    if (!/^\d{2}:\d{2}$/.test(String(time))) {
        return time;
    }

    const [hours, minutes] = time.split(":").map(Number);

    return new Date(2000, 0, 1, hours, minutes)
        .toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
}

function getPatient(appointment) {
    return appointment.patientId || appointment.patient || {};
}

function getPatientName(appointment) {
    const patient = getPatient(appointment);

    if (typeof patient === "string") return "Patient";

    return patient.name || patient.fullName || "Patient";
}

function getPatientEmail(appointment) {
    const patient = getPatient(appointment);

    if (typeof patient === "string") return "";

    return patient.email || "";
}

function getClinic(appointment) {
    return appointment.clinicId || appointment.clinic || {};
}

function getClinicName(appointment) {
    const clinic = getClinic(appointment);

    if (typeof clinic === "string") return "Clinic";

    return clinic.name || "Clinic";
}

function updateStats(appointments) {
    document.getElementById("totalCount").textContent =
        appointments.length;

    document.getElementById("waitingCount").textContent =
        appointments.filter(a =>
            ["booked", "waiting"].includes(
                String(a.status || "").toLowerCase()
            )
        ).length;

    document.getElementById("calledCount").textContent =
        appointments.filter(a =>
            String(a.status || "").toLowerCase() === "called"
        ).length;

    document.getElementById("completedCount").textContent =
        appointments.filter(a =>
            String(a.status || "").toLowerCase() === "completed"
        ).length;
}

function renderAppointments() {
    const selectedDate = dateFilter.value;
    const selectedStatus = statusFilter.value;

    const filteredAppointments = allAppointments.filter(appointment => {
        const status = String(appointment.status || "").toLowerCase();

        const matchesStatus =
            selectedStatus === "all" || status === selectedStatus;

        const matchesDate =
            !selectedDate ||
            getAppointmentDate(appointment) === selectedDate;

        return matchesStatus && matchesDate;
    });

    appointmentsContainer.innerHTML = "";

    if (!filteredAppointments.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent =
            allAppointments.length === 0
                ? "No appointments found for your doctor profile."
                : "No appointments match your selected filters.";

        appointmentsContainer.appendChild(empty);
        return;
    }

    filteredAppointments.forEach(appointment => {
        const card = document.createElement("article");
        card.className = "appointment-card";

        const status = String(
            appointment.status || "booked"
        ).toLowerCase();

        const patientName = getPatientName(appointment);
        const patientEmail = getPatientEmail(appointment);
        const clinicName = getClinicName(appointment);
        const clinic = getClinic(appointment);

        const clinicAddress =
            typeof clinic === "object"
                ? (clinic.address || "")
                : "";

        // Patient details and status
        const top = document.createElement("div");
        top.className = "appointment-card-top";

        const patientInfo = document.createElement("div");
        patientInfo.className = "patient-info";

        const avatar = document.createElement("div");
        avatar.className = "patient-avatar";
        avatar.textContent = patientName.charAt(0).toUpperCase();

        const nameWrapper = document.createElement("div");

        const name = document.createElement("h3");
        name.className = "patient-name";
        name.textContent = patientName;

        const email = document.createElement("p");
        email.className = "patient-email";
        email.textContent = patientEmail;

        nameWrapper.append(name, email);
        patientInfo.append(avatar, nameWrapper);

        const badge = document.createElement("span");
        badge.className = `status-badge status-${status}`;
        badge.textContent = status;

        top.append(patientInfo, badge);

        // Date, time, token
        const meta = document.createElement("div");
        meta.className = "appointment-meta";

        function addMeta(label, value) {
            const item = document.createElement("div");
            item.className = "meta-item";

            const labelElement = document.createElement("span");
            labelElement.className = "meta-label";
            labelElement.textContent = label;

            const valueElement = document.createElement("strong");
            valueElement.className = "meta-value";
            valueElement.textContent = value;

            item.append(labelElement, valueElement);
            meta.appendChild(item);
        }

        addMeta("Appointment Date", formatDate(
            appointment.appointmentDate || appointment.date
        ));

        addMeta("Appointment Time", formatTime(
            appointment.appointmentTime || appointment.time
        ));

        addMeta("Token Number", appointment.tokenNumber ?? "N/A");

        addMeta("Appointment ID", String(
            appointment._id || appointment.appointmentId || "N/A"
        ).slice(-8));

        const clinicInfo = document.createElement("p");
        clinicInfo.className = "clinic-info";

        const clinicStrong = document.createElement("strong");
        clinicStrong.textContent = clinicName;

        clinicInfo.appendChild(clinicStrong);

        if (clinicAddress) {
            clinicInfo.append(
                document.createTextNode(` · ${clinicAddress}`)
            );
        }

        // Action buttons
        const actions = document.createElement("div");
        actions.className = "appointment-actions";

        const appointmentId =
            appointment._id || appointment.appointmentId;

        // Complete only after the patient has been called.
        if (status === "called") {
            const completeBtn = document.createElement("button");
            completeBtn.className = "complete-btn";
            completeBtn.textContent = "✓ Mark Completed";

            completeBtn.addEventListener("click", () => {
                updateAppointmentStatus(appointmentId, "completed");
            });

            actions.appendChild(completeBtn);
        }

        // Only active appointments can be cancelled.
        if (["booked", "waiting", "called"].includes(status)) {
            const cancelBtn = document.createElement("button");
            cancelBtn.className = "cancel-btn";
            cancelBtn.textContent = "Cancel Appointment";

            cancelBtn.addEventListener("click", () => {
                updateAppointmentStatus(appointmentId, "cancelled");
            });

            actions.appendChild(cancelBtn);
        }

        card.append(top, meta, clinicInfo);

        if (actions.children.length) {
            card.appendChild(actions);
        }

        appointmentsContainer.appendChild(card);
    });
}

// Fetch appointments belonging to the logged-in doctor.
async function loadAppointments() {
    showMessage("Loading appointments...");

    try {
        const response = await axios.get(
            `${API_BASE}/appointments/doctor/my-appointments`,
            authConfig()
        );

        const data = response.data;

        allAppointments = Array.isArray(data)
            ? data
            : (data.appointments || []);

        updateStats(allAppointments);
        renderAppointments();
        showMessage("");
    } catch (error) {
        console.error("Fetch appointments error:", error);

        showMessage(
            error.response?.data?.message ||
            "Unable to load appointments. Check the doctor appointments API.",
            "error"
        );
    }
}

// Complete/cancel through a doctor-authorized backend route.
async function updateAppointmentStatus(id, status) {
    if (!id) {
        showMessage("Appointment ID is missing.", "error");
        return;
    }

    const actionText =
        status === "completed" ? "mark this appointment completed" :
        "cancel this appointment";

    if (!confirm(`Are you sure you want to ${actionText}?`)) {
        return;
    }

    try {
        const response = await axios.patch(
            `${API_BASE}/appointments/${id}/status`,
            { status },
            authConfig()
        );

        showMessage(
            response.data.message || "Appointment status updated.",
            "success"
        );

        await loadAppointments();
    } catch (error) {
        console.error("Update appointment status error:", error);

        showMessage(
            error.response?.data?.message ||
            "Could not update appointment status. Check your backend route.",
            "error"
        );
    }
}





// Call the next patient in the logged-in doctor's queue.
callNextBtn.addEventListener("click", async () => {
    if (isCallingNext) return;

    isCallingNext = true;
    callNextBtn.disabled = true;
    callNextBtn.textContent = "Calling patient...";

    try {
        const response = await axios.patch(
            `${API_BASE}/appointments/call-next`,
            {},
            authConfig()
        );

        showMessage(
            response.data.message || "Next patient called successfully.",
            "success"
        );

        await loadAppointments();
    } catch (error) {
        console.error("Call next patient error:", error);

        showMessage(
            error.response?.data?.message ||
            "Unable to call the next patient.",
            "error"
        );
    } finally {
        isCallingNext = false;
        callNextBtn.disabled = false;
        callNextBtn.innerHTML = "<span>▶</span> Call Next Patient";
    }
});

refreshBtn.addEventListener("click", loadAppointments);

dateFilter.addEventListener("change", renderAppointments);
statusFilter.addEventListener("change", renderAppointments);



// Socket.IO live queue updates
function connectQueueSocket() {
    if (typeof io == "undefined") {
        console.warn("Socket.IO client library is not loaded.");
        return;
    }

    socket = io({
        auth: {
            token: localStorage.getItem("token")
        }
    });

    socket.on("connect", () => {
        console.log("Connected to QueueCare live updates.");
    });

    socket.on("queueUpdated", (data) => {
        console.log("Queue updated:", data);

        // Refresh the complete list so token/status changes appear.
        loadAppointments();
    });

    socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
    });
}

document.getElementById("logoutBtn").addEventListener("click", () => {
    if (socket) socket.disconnect();

    localStorage.removeItem("token");
    window.location.href = "../login/login.html";
});

loadAppointments();
connectQueueSocket();
