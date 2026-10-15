
const API = "http://localhost:3000/api";

const overlay = document.getElementById("bookingOverlay");
const openBtn = document.getElementById("openBookingBtn");
const closeBtn = document.getElementById("closeBookingBtn");
const bookingForm = document.getElementById("bookingForm");

const clinicSelect = document.getElementById("clinicId");
const doctorSelect = document.getElementById("doctorId");
const dateInput = document.getElementById("appointmentDate");
const slotsContainer = document.getElementById("slotsContainer");
const slotsHint = document.getElementById("slotsHint");
const bookingMessage = document.getElementById("bookingMessage");
const bookBtn = document.getElementById("bookBtn");

let selectedSlot = "";
let availableSlots = [];
let loadingSlots = false;

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

function authConfig() {
    return {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
        }
    };
}

function showMessage(message, type = "") {
    bookingMessage.textContent = message;
    bookingMessage.className = `message ${type}`;
}

function resetSlots(message = "Available slots will appear here.") {
    selectedSlot = "";
    availableSlots = [];
    bookBtn.disabled = true;
    slotsHint.textContent = "Select doctor and date";
    slotsContainer.innerHTML = "";

    const p = document.createElement("p");
    p.className = "empty-slots";
    p.textContent = message;
    slotsContainer.appendChild(p);
}

function normalizeList(response, key) {
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.[key])) return response.data[key];
    return [];
}

// Modal open/close
openBtn.addEventListener("click", () => {
    overlay.classList.remove("hidden");
});

closeBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
});

overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
        overlay.classList.add("hidden");
    }
});

// Load clinics
async function loadClinics() {
    try {
        const response = await axios.get(
            `${API}/clinics`,
            authConfig()
        );

        const clinics = normalizeList(response, "clinics");

        clinicSelect.innerHTML =
            '<option value="">Select clinic</option>';

        clinics.forEach((clinic) => {
            const option = document.createElement("option");
            option.value = clinic._id;
            option.textContent = clinic.name;
            clinicSelect.appendChild(option);
        });

        if (!clinics.length) {
            clinicSelect.innerHTML =
                '<option value="">No clinics available</option>';
        }
    } catch (error) {
        console.error("Load clinics error:", error);
        clinicSelect.innerHTML =
            '<option value="">Unable to load clinics</option>';
        showMessage(
            error.response?.data?.message || "Failed to load clinics.",
            "error"
        );
    }
}

// When clinic changes, load its doctors
clinicSelect.addEventListener("change", async () => {
    const clinicId = clinicSelect.value;

    doctorSelect.innerHTML =
        '<option value="">Loading doctors...</option>';
    doctorSelect.disabled = true;
    dateInput.value = "";
    dateInput.disabled = true;
    resetSlots();
    showMessage("");

    if (!clinicId) {
        doctorSelect.innerHTML =
            '<option value="">Select a clinic first</option>';
        return;
    }

    try {
        // Assumes GET /api/doctors returns doctors, optionally filtered by clinicId.
        const response = await axios.get(
            `${API}/doctors`,
            authConfig()
        );

        const doctors = normalizeList(response, "doctors");

        const clinicDoctors = doctors.filter((doctor) => {
            const doctorClinicId =
                typeof doctor.clinicId === "object"
                    ? doctor.clinicId?._id
                    : doctor.clinicId;

            return doctorClinicId === clinicId &&
                   doctor.isAvailable !== false;
        });

        doctorSelect.innerHTML =
            '<option value="">Select doctor</option>';

        clinicDoctors.forEach((doctor) => {
            const option = document.createElement("option");
            option.value = doctor._id;

            const name = doctor.userId?.name || doctor.name || "Doctor";
            const specialization = doctor.specialization || "General";

            option.textContent = `${name} — ${specialization}`;
            doctorSelect.appendChild(option);
        });

        doctorSelect.disabled = false;

        if (!clinicDoctors.length) {
            doctorSelect.innerHTML =
                '<option value="">No doctors available at this clinic</option>';
            doctorSelect.disabled = true;
        }
    } catch (error) {
        console.error("Load doctors error:", error);
        doctorSelect.innerHTML =
            '<option value="">Unable to load doctors</option>';

        showMessage(
            error.response?.data?.message || "Failed to load doctors.",
            "error"
        );
    }
});

// Enable date after doctor selection
doctorSelect.addEventListener("change", () => {
    dateInput.value = "";
    dateInput.disabled = !doctorSelect.value;
    resetSlots();
    showMessage("");
});

// Prevent selecting a past date
const today = new Date();
const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
].join("-");

dateInput.min = localToday;

// Fetch available slots for selected doctor/date
dateInput.addEventListener("change", loadAvailableSlots);

async function loadAvailableSlots() {
    resetSlots("Loading available slots...");
    showMessage("");

    const doctorId = doctorSelect.value;
    const clinicId = clinicSelect.value;
    const date = dateInput.value;

    if (!doctorId || !clinicId || !date) {
        resetSlots("Select a doctor and date first.");
        return;
    }

    if (date < localToday) {
        resetSlots("Please select today or a future date.");
        showMessage("Past dates cannot be booked.", "error");
        return;
    }

    loadingSlots = true;
    slotsHint.textContent = "Loading...";
    bookBtn.disabled = true;

    try {
        // Assumes query parameters: doctorId, clinicId, date.
        const response = await axios.get(
            `${API}/appointments/available-slots`,
            {
                ...authConfig(),
                params: { doctorId, clinicId, date }
            }
        );

        const data = response.data;
        let slots = data.availableSlots || data.slots || data.data || [];

        if (!Array.isArray(slots)) {
            slots = [];
        }

        // Support either ["10:00", "10:15"] or [{time:"10:00", available:true}]
        availableSlots = slots.filter((slot) => {
            if (typeof slot === "string") return true;
            return slot.available !== false && slot.isAvailable !== false;
        });

        renderSlots();
    } catch (error) {
        console.error("Available slots error:", error);
        resetSlots(
            error.response?.data?.message ||
            "Unable to fetch available slots."
        );
        slotsHint.textContent = "Fetch failed";
    } finally {
        loadingSlots = false;
    }
}

function renderSlots() {
    slotsContainer.innerHTML = "";
    selectedSlot = "";
    bookBtn.disabled = true;

    if (!availableSlots.length) {
        resetSlots("No available slots for this date. Try another date.");
        slotsHint.textContent = "No slots";
        return;
    }

    slotsHint.textContent = `${availableSlots.length} slots available`;

    availableSlots.forEach((slot) => {
        const time = typeof slot === "string"
            ? slot
            : (slot.time || slot.appointmentTime || slot.startTime);

        if (!time) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "slot-btn";
        button.textContent = formatTime(time);

        button.addEventListener("click", () => {
            document.querySelectorAll(".slot-btn").forEach((btn) => {
                btn.classList.remove("selected");
            });

            button.classList.add("selected");
            selectedSlot = time;
            bookBtn.disabled = false;
            showMessage("");
        });

        slotsContainer.appendChild(button);
    });

    if (!slotsContainer.children.length) {
        resetSlots("The server returned slots in an unsupported format.");
    }
}

function formatTime(time) {
    if (!/^\d{2}:\d{2}$/.test(time)) return time;

    const [hours, minutes] = time.split(":").map(Number);
    const d = new Date(2000, 0, 1, hours, minutes);

    return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

// Book selected appointment
bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const clinicId = clinicSelect.value;
    const doctorId = doctorSelect.value;
    const appointmentDate = dateInput.value;
    const appointmentTime = selectedSlot;

    if (!clinicId || !doctorId || !appointmentDate || !appointmentTime) {
        showMessage(
            "Please select a clinic, doctor, date and time slot.",
            "error"
        );
        return;
    }

    if (loadingSlots) return;

    bookBtn.disabled = true;
    bookBtn.textContent = "Booking...";

    try {
        const response = await axios.post(
            `${API}/appointments`,
            {
                clinicId,
                doctorId,
                appointmentDate,
                appointmentTime
            },
            authConfig()
        );

        showMessage(
            response.data.message || "Appointment booked successfully!",
            "success"
        );

        // Refresh slots so a newly booked slot is no longer selectable.
        await loadAvailableSlots();

        // Close the modal after a short pause so the success message is visible.
        setTimeout(() => {
            alert("Your appointment booked");
            overlay.classList.add("hidden");
            window.location.href = "../appointments/appointment.html";
        }, 1200);
    } catch (error) {
        console.error("Book appointment error:", error);

        showMessage(
            error.response?.data?.message ||
            "Appointment booking failed. Please try again.",
            "error"
        );

        bookBtn.disabled = !selectedSlot;
    } finally {
        bookBtn.textContent = "Confirm Appointment";
    }
});

// Open booking modal immediately when this page loads
overlay.classList.remove("hidden");
loadClinics();
