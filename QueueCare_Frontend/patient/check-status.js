const API_BASE = "http://localhost:3000/api/appointments";

// Apne existing Express routes ke according verify karna.
const MY_APPOINTMENTS_URL = `${API_BASE}/my-appointments`;

const QUEUE_STATUS_URL = (appointmentId) =>
    `${API_BASE}/my-queue-status/${appointmentId}`;

const token = localStorage.getItem("token");

const message = document.getElementById("message");
const appointmentList = document.getElementById("appointment-list");
const queueDetails = document.getElementById("queue-details");

const tokenNumberElement = document.getElementById("token-number");
const statusElement = document.getElementById("appointment-status");
const servingTokenElement = document.getElementById("serving-token");
const patientsAheadElement = document.getElementById("patients-ahead");
const doctorInfoElement = document.getElementById("doctor-info");
const clinicInfoElement = document.getElementById("clinic-info");

let activeAppointmentId = null;
let socket = null;

// Authentication check
if (!token) {
    message.textContent = "Please login to check your appointment status.";
    appointmentList.innerHTML = "";

    // Apne actual login page ka path use karna.
    // window.location.href = "login.html";
} else {
    initializePage();
}

// Initialize page
async function initializePage() {
    if (typeof io === "undefined") {
        message.textContent =
            "Socket.IO load nahi hua. Backend server check karo.";
        return;
    }

    connectSocket();
    await loadMyAppointments();
}

// Connect Socket.IO with JWT
function connectSocket() {
    socket = io("http://localhost:3000", {
        auth: {
            token: token
        }
    });

    socket.on("connect", () => {
        console.log("Patient socket connected:", socket.id);

        if (activeAppointmentId) {
            joinPatientQueue(activeAppointmentId);
        }
    });

    socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
    });

    // Doctor queue update karega to ye event receive hoga.
    socket.on("queueUpdated", async (data) => {
        console.log("Live queue update received:", data);

        // Selected appointment ka fresh status fetch karo.
        if (activeAppointmentId) {
            await loadQueueStatus(activeAppointmentId);
        }
    });
}

// Fetch patient's appointments
async function loadMyAppointments() {
    try {
        message.textContent = "Loading your appointments...";

        const response = await fetch(MY_APPOINTMENTS_URL, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to fetch appointments");
        }

        const appointments = data.appointments || [];

        appointmentList.innerHTML = "";

        if (appointments.length === 0) {
            message.textContent = "You have no appointments yet.";
            return;
        }

        message.textContent = "Select an appointment to track its queue.";

        appointments.forEach((appointment) => {
            const card = document.createElement("div");
            card.className = "appointment-card";

            const doctorName =
                appointment.doctor?.name || "Doctor information unavailable";

            const specialization =
                appointment.doctor?.specialization || "Not specified";

            const clinicName =
                appointment.clinic?.name || "Clinic information unavailable";

            const clinicAddress =
                appointment.clinic?.address || "Address unavailable";

            const date = appointment.date
                ? new Date(appointment.date).toLocaleDateString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                })
                : "Not available";

            const time = appointment.time || "Not available";

            card.innerHTML = `
                <h3>${escapeHTML(doctorName)}</h3>
                <p><strong>Specialization:</strong> ${escapeHTML(specialization)}</p>
                <p><strong>Clinic:</strong> ${escapeHTML(clinicName)}</p>
                <p><strong>Address:</strong> ${escapeHTML(clinicAddress)}</p>
                <p><strong>Date:</strong> ${escapeHTML(date)}</p>
                <p><strong>Time:</strong> ${escapeHTML(time)}</p>
                <p><strong>Token:</strong> ${escapeHTML(appointment.tokenNumber ?? "--")}</p>
                <p><strong>Status:</strong> ${escapeHTML(appointment.status || "Unknown")}</p>
                <button type="button">Track Queue</button>
            `;

            const button = card.querySelector("button");

            button.addEventListener("click", async () => {
                if (!appointment.appointmentId) {
                    message.textContent = "Appointment ID is missing.";
                    return;
                }

                activeAppointmentId = appointment.appointmentId;

                queueDetails.hidden = false;
                message.textContent = "Connecting to your queue...";

                if (socket.connected) {
                    joinPatientQueue(activeAppointmentId);
                }

                await loadQueueStatus(activeAppointmentId);
            });

            appointmentList.appendChild(card);
        });
    } catch (error) {
        console.error("Load appointments error:", error);
        message.textContent = error.message;
    }
}

// Join only the selected patient's appointment queue
function joinPatientQueue(appointmentId) {
    if (!socket || !socket.connected) {
        message.textContent =
            "Connecting to live queue. Please wait...";
        return;
    }

    socket.emit("joinPatientQueue", appointmentId, (result) => {
        if (!result) {
            message.textContent = "No response from the queue server.";
            return;
        }

        if (!result.success) {
            message.textContent = result.message || "Unable to join queue.";
            return;
        }

        console.log("Patient joined queue successfully.");

        // Get the latest status after joining.
        loadQueueStatus(appointmentId);
    });
}

// Fetch fresh queue status from existing backend controller
async function loadQueueStatus(appointmentId) {
    try {
        const response = await fetch(
            QUEUE_STATUS_URL(appointmentId),
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to fetch queue status");
        }

        // Avoid showing an old response if another appointment was selected.
        if (activeAppointmentId !== appointmentId) {
            return;
        }

        tokenNumberElement.textContent = data.tokenNumber ?? "--";
        statusElement.textContent = data.status ?? "Unknown";
        servingTokenElement.textContent =
            data.currentlyServingToken ?? "No patient currently being called";

        patientsAheadElement.textContent = data.patientsAhead ?? "--";

        doctorInfoElement.textContent =
            `Specialization: ${data.doctor?.specialization || "Not available"}`;

        clinicInfoElement.textContent =
            `Clinic: ${data.clinic?.name || "Not available"} | Address: ${
                data.clinic?.address || "Not available"
            }`;

        queueDetails.hidden = false;
        message.textContent = "Queue status updated successfully.";

    } catch (error) {
        console.error("Queue status error:", error);
        message.textContent = error.message;
    }
}

// Escape API-provided text before inserting it into HTML.
function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}