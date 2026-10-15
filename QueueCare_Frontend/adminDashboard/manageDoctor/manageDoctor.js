
const API_BASE = "http://localhost:3000/api";
const DOCTORS_API = `${API_BASE}/doctors`;
const CLINICS_API = `${API_BASE}/clinics`;

const token = localStorage.getItem("token");

const addForm = document.getElementById("addDoctorForm");
const doctorsGrid = document.getElementById("doctorsGrid");
const pageMessage = document.getElementById("pageMessage");
const searchInput = document.getElementById("searchDoctors");
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editDoctorForm");

let doctors = [];
let clinics = [];
let currentPage = 1;
const PAGE_SIZE = 8;

function apiHeaders(json = true) {
    const headers = {};

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (json) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

async function apiRequest(url, options = {}) {
    if (!token) {
        throw new Error("Please log in as an admin first.");
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            ...apiHeaders(),
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
}

function showMessage(element, message, type = "success") {
    element.textContent = message;
    element.className = `message ${type}`;
}

function clearMessage(element) {
    element.textContent = "";
    element.className = "message";
}

function getDoctorName(doctor) {
    return doctor.userId?.name ||
        doctor.name ||
        "Unnamed Doctor";
}

function getDoctorEmail(doctor) {
    return doctor.userId?.email ||
        doctor.email ||
        "Email unavailable";
}

function getClinicId(doctor) {
    return doctor.clinicId?._id ||
        doctor.clinicId ||
        "";
}

function getClinicName(doctor) {
    if (doctor.clinicId && typeof doctor.clinicId === "object") {
        return doctor.clinicId.name || "Clinic";
    }

    const clinic = clinics.find(
        item => item._id === String(doctor.clinicId)
    );

    return clinic?.name || "Clinic";
}

function getDoctorId(doctor) {
    return doctor._id;
}

async function loadClinics() {
    const data = await apiRequest(CLINICS_API, {
        method: "GET"
    });

    clinics = Array.isArray(data)
        ? data
        : data.clinics || data.data || [];

    fillClinicDropdown(document.getElementById("addClinic"));
    fillClinicDropdown(document.getElementById("editClinic"));
}

function fillClinicDropdown(select) {
    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select clinic";
    select.appendChild(placeholder);

    clinics.forEach(clinic => {
        const option = document.createElement("option");
        option.value = clinic._id;
        option.textContent = clinic.name || "Unnamed Clinic";
        select.appendChild(option);
    });
}

async function loadDoctors() {
    doctorsGrid.innerHTML = "<p>Loading doctors...</p>";

    try {
        const data = await apiRequest(DOCTORS_API, {
            method: "GET"
        });

        doctors = Array.isArray(data)
            ? data
            : data.doctors || data.data || [];

        // If the endpoint returns a wrapper with nested results,
        // adjust this normalization to match your controller response.
        document.getElementById("doctorCount").textContent =
            doctors.length;

        currentPage = 1;
        renderDoctors();
    } catch (error) {
        doctorsGrid.replaceChildren();
        showMessage(pageMessage, error.message, "error");
    }
}

function renderDoctors() {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = doctors.filter(doctor => {
        const searchable = [
            getDoctorName(doctor),
            getDoctorEmail(doctor),
            doctor.specialization || "",
            getClinicName(doctor)
        ].join(" ").toLowerCase();

        return searchable.includes(query);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageDoctors = filtered.slice(start, start + PAGE_SIZE);

    doctorsGrid.replaceChildren();
    document.getElementById("emptyState").hidden =
        filtered.length !== 0;

    pageDoctors.forEach(doctor => {
        const card = document.createElement("article");
        card.className = "doctor-card";

        const name = getDoctorName(doctor);
        const available = doctor.isAvailable !== false;

        const avatar = document.createElement("div");
        avatar.className = "doctor-avatar";
        avatar.textContent = name.charAt(0).toUpperCase();

        const heading = document.createElement("h3");
        heading.textContent = name;

        const specialization = document.createElement("p");
        specialization.className = "doctor-specialization";
        specialization.textContent =
            doctor.specialization || "Specialization not set";

        const status = document.createElement("span");
        status.className = `status ${available ? "available" : "unavailable"}`;
        status.textContent = available ? "Available" : "Unavailable";

        const email = document.createElement("p");
        email.className = "doctor-detail";
        email.textContent = getDoctorEmail(doctor);

        const clinic = document.createElement("p");
        clinic.className = "doctor-detail";
        clinic.textContent = `Clinic: ${getClinicName(doctor)}`;

        const duration = document.createElement("p");
        duration.className = "doctor-detail";
        duration.textContent =
            `Consultation: ${doctor.consultationDuration || "—"} minutes`;

        const actions = document.createElement("div");
        actions.className = "card-actions";

        const editButton = document.createElement("button");
        editButton.className = "secondary-btn";
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => openEditModal(doctor));

        const deleteButton = document.createElement("button");
        deleteButton.className = "danger-btn";
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteDoctor(doctor));

        actions.append(editButton, deleteButton);
        card.append(
            avatar,
            heading,
            specialization,
            status,
            email,
            clinic,
            duration,
            actions
        );

        doctorsGrid.appendChild(card);
    });

    document.getElementById("pageInfo").textContent =
        `Page ${currentPage} of ${totalPages}`;

    document.getElementById("previousPage").disabled =
        currentPage <= 1;

    document.getElementById("nextPage").disabled =
        currentPage >= totalPages;
}

addForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage(pageMessage);

    const formData = new FormData(addForm);

    const payload = {
        name: formData.get("name").trim(),
        email: formData.get("email").trim(),
        password: formData.get("password"),
        clinicId: formData.get("clinicId"),
        specialization: formData.get("specialization").trim(),
        consultationDuration: Number(
            formData.get("consultationDuration")
        )
    };

    const button = document.getElementById("addButton");
    button.disabled = true;
    button.textContent = "Creating...";

    try {
        const data = await apiRequest(DOCTORS_API, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        addForm.reset();
        document.getElementById("addClinic").value = "";

        showMessage(
            pageMessage,
            data.message || "Doctor created successfully."
        );

        await loadDoctors();
    } catch (error) {
        showMessage(pageMessage, error.message, "error");
    } finally {
        button.disabled = false;
        button.textContent = "Create Doctor";
    }
});

function openEditModal(doctor) {
    clearMessage(document.getElementById("editMessage"));

    document.getElementById("editDoctorId").value = getDoctorId(doctor);
    document.getElementById("editDoctorName").textContent =
        `${getDoctorName(doctor)} · ${getDoctorEmail(doctor)}`;

    document.getElementById("editClinic").value = getClinicId(doctor);
    document.getElementById("editSpecialization").value =
        doctor.specialization || "";

    document.getElementById("editDuration").value =
        String(doctor.consultationDuration || 15);

    document.getElementById("editAvailability").value =
        String(doctor.isAvailable !== false);

    // Working hours need to be loaded from DoctorAvailability API.
    // document.getElementById("editStartTime").value = "";
    // document.getElementById("editEndTime").value = "";

    editModal.showModal();
}

document.getElementById("closeModal").addEventListener("click", () => {
    editModal.close();
});

document.getElementById("cancelEdit").addEventListener("click", () => {
    editModal.close();
});

editForm.addEventListener("submit", async event => {
    event.preventDefault();

    const message = document.getElementById("editMessage");
    clearMessage(message);

    const doctorId = document.getElementById("editDoctorId").value;

    const payload = {
        clinicId: document.getElementById("editClinic").value,
        specialization:
            document.getElementById("editSpecialization").value.trim(),
        consultationDuration: Number(
            document.getElementById("editDuration").value
        ),
        isAvailable:
            document.getElementById("editAvailability").value === "true"
    };

    const saveButton = document.getElementById("saveEdit");
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const data = await apiRequest(
            `${DOCTORS_API}/${encodeURIComponent(doctorId)}`,
            {
                method: "PUT",
                body: JSON.stringify(payload)
            }
        );

        // Working hours are intentionally not sent here until we
        // confirm the existing DoctorAvailability endpoint.
        showMessage(
            pageMessage,
            data.message || "Doctor profile updated successfully."
        );

        editModal.close();
        await loadDoctors();
    } catch (error) {
        showMessage(message, error.message, "error");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Changes";
    }
});

async function deleteDoctor(doctor) {
    const name = getDoctorName(doctor);

    const confirmed = confirm(
        `Are you sure you want to delete ${name}'s doctor profile?`
    );

    if (!confirmed) return;

    try {
        const data = await apiRequest(
            `${DOCTORS_API}/${encodeURIComponent(getDoctorId(doctor))}`,
            { method: "DELETE" }
        );

        showMessage(
            pageMessage,
            data.message || "Doctor profile deleted successfully."
        );

        await loadDoctors();
    } catch (error) {
        showMessage(pageMessage, error.message, "error");
    }
}

document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(item => {
            item.classList.remove("active");
        });

        tab.classList.add("active");

        document.getElementById("addSection").hidden =
            tab.dataset.section !== "addSection";

        document.getElementById("viewSection").hidden =
            tab.dataset.section !== "viewSection";

        if (tab.dataset.section === "viewSection") {
            loadDoctors();
        }
    });
});

searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderDoctors();
});

document.getElementById("refreshDoctors").addEventListener("click", () => {
    loadDoctors();
});

document.getElementById("previousPage").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderDoctors();
    }
});

document.getElementById("nextPage").addEventListener("click", () => {
    currentPage++;
    renderDoctors();
});

// Load clinics for the Add and Edit forms.
(async function initializePage() {
    try {
        await loadClinics();
    } catch (error) {
        showMessage(
            pageMessage,
            `Unable to load clinics: ${error.message}`,
            "error"
        );
    }
})();
