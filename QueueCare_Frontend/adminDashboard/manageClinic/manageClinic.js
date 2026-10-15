
const API_BASE = "http://localhost:3000/api";
const CLINICS_API = `${API_BASE}/clinics`;

const token = localStorage.getItem("token");
const ITEMS_PER_PAGE = 8;

let clinics = [];
let currentPage = 1;
let editingClinicId = null;

const addClinicForm = document.getElementById("addClinicForm");
const editClinicForm = document.getElementById("editClinicForm");
const clinicGrid = document.getElementById("clinicGrid");
const clinicMessage = document.getElementById("clinicMessage");
const emptyState = document.getElementById("emptyState");
const searchClinic = document.getElementById("searchClinic");
const editDialog = document.getElementById("editClinicDialog");

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
        throw new Error(data.message || "Something went wrong");
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

function showMessage(message, isError = false) {
    clinicMessage.textContent = message;
    clinicMessage.classList.remove("hidden", "error");

    if (isError) {
        clinicMessage.classList.add("error");
    }
}

function hideMessage() {
    clinicMessage.textContent = "";
    clinicMessage.classList.add("hidden");
}

function formatTime(time = "") {
    if (!time) return "Not specified";

    const [hour, minute] = time.split(":").map(Number);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
        return time;
    }

    const suffix = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;

    return `${formattedHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function getClinicId(clinic) {
    return clinic._id || clinic.id;
}

function getFilteredClinics() {
    const search = searchClinic.value.trim().toLowerCase();

    return clinics.filter(clinic => {
        const searchableText = [
            clinic.name,
            clinic.address,
            clinic.phone
        ].join(" ").toLowerCase();

        return searchableText.includes(search);
    });
}

// ---------------- TABS ----------------

function showSection(sectionId) {
    document.querySelectorAll(".content-section").forEach(section => {
        section.classList.toggle("hidden", section.id !== sectionId);
    });

    document.querySelectorAll(".tab").forEach(tab => {
        tab.classList.toggle(
            "active",
            tab.dataset.section === sectionId
        );
    });

    if (sectionId === "viewSection") {
        loadClinics();
    }
}

document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        showSection(tab.dataset.section);
    });
});

// ---------------- FETCH ALL CLINICS ----------------

async function loadClinics() {
    hideMessage();
    clinicGrid.innerHTML = "";
    emptyState.classList.add("hidden");

    try {
        const data = await apiRequest(CLINICS_API);

        // Backend response: { message, clinics }
        clinics = Array.isArray(data)
            ? data
            : Array.isArray(data.clinics)
                ? data.clinics
                : [];

        document.getElementById("totalClinics").textContent =
            clinics.length;

        renderClinics();
    } catch (error) {
        clinics = [];
        document.getElementById("totalClinics").textContent = "0";
        renderClinics();
        showMessage(error.message, true);
    }
}

// ---------------- RENDER CLINIC CARDS ----------------

function renderClinics() {
    const filteredClinics = getFilteredClinics();
    const totalPages = Math.max(
        1,
        Math.ceil(filteredClinics.length / ITEMS_PER_PAGE)
    );

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    const pageClinics = filteredClinics.slice(
        startIndex,
        startIndex + ITEMS_PER_PAGE
    );

    clinicGrid.innerHTML = pageClinics.map(clinic => {
        const id = getClinicId(clinic);

        return `
            <article class="clinic-card">
                <div class="clinic-card-top">
                    <div class="clinic-avatar">✚</div>
                    <div>
                        <h3>${escapeHTML(clinic.name)}</h3>
                        <span class="clinic-id">
                            Clinic ID: ${escapeHTML(String(id).slice(-8))}
                        </span>
                    </div>
                </div>

                <div class="clinic-details">
                    <div>
                        <span class="detail-label">Address</span>
                        <span class="detail-value">${escapeHTML(clinic.address)}</span>
                    </div>

                    <div>
                        <span class="detail-label">Phone</span>
                        <span class="detail-value">${escapeHTML(clinic.phone)}</span>
                    </div>

                    <div class="clinic-hours">
                        <strong>Clinic Timings</strong><br>
                        ${escapeHTML(formatTime(clinic.openingTime))}
                        –
                        ${escapeHTML(formatTime(clinic.closingTime))}
                    </div>
                </div>

                <div class="card-actions">
                    <button class="btn btn-edit"
                        data-action="edit"
                        data-id="${escapeHTML(id)}">
                        Edit
                    </button>

                    <button class="btn btn-delete"
                        data-action="delete"
                        data-id="${escapeHTML(id)}">
                        Delete
                    </button>
                </div>
            </article>
        `;
    }).join("");

    emptyState.classList.toggle(
        "hidden",
        filteredClinics.length !== 0
    );

    document.getElementById("pageInfo").textContent =
        `Page ${currentPage} of ${totalPages}`;

    document.getElementById("prevPage").disabled =
        currentPage <= 1;

    document.getElementById("nextPage").disabled =
        currentPage >= totalPages;
}

// ---------------- SEARCH ----------------

searchClinic.addEventListener("input", () => {
    currentPage = 1;
    renderClinics();
});

// ---------------- PAGINATION ----------------

document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderClinics();
    }
});

document.getElementById("nextPage").addEventListener("click", () => {
    const totalPages = Math.ceil(
        getFilteredClinics().length / ITEMS_PER_PAGE
    );

    if (currentPage < totalPages) {
        currentPage++;
        renderClinics();
    }
});

document.getElementById("refreshClinics").addEventListener("click", () => {
    loadClinics();
});

// ---------------- ADD CLINIC ----------------

addClinicForm.addEventListener("submit", async event => {
    event.preventDefault();
    hideMessage();

    const name = document.getElementById("clinicName").value.trim();
    const address = document.getElementById("clinicAddress").value.trim();
    const phone = document.getElementById("clinicPhone").value.trim();
    const openingTime = document.getElementById("openingTime").value;
    const closingTime = document.getElementById("closingTime").value;

    if (closingTime <= openingTime) {
        showMessage(
            "Closing time must be later than opening time.",
            true
        );
        return;
    }

    const button = document.getElementById("addClinicBtn");
    button.disabled = true;
    button.textContent = "Adding...";

    try {
        await apiRequest(CLINICS_API, {
            method: "POST",
            body: JSON.stringify({
                name,
                address,
                phone,
                openingTime,
                closingTime
            })
        });

        addClinicForm.reset();
        currentPage = 1;
        searchClinic.value = "";

        await loadClinics();
        showSection("viewSection");
        showMessage("Clinic added successfully!");
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        button.disabled = false;
        button.textContent = "Add Clinic";
    }
});

// ---------------- EDIT MODAL ----------------

function openEditModal(clinic) {
    editingClinicId = getClinicId(clinic);

    document.getElementById("editName").value = clinic.name || "";
    document.getElementById("editAddress").value = clinic.address || "";
    document.getElementById("editPhone").value = clinic.phone || "";
    document.getElementById("editOpeningTime").value =
        clinic.openingTime || "";
    document.getElementById("editClosingTime").value =
        clinic.closingTime || "";

    editDialog.showModal();
}

function closeEditModal() {
    editDialog.close();
    editingClinicId = null;
}

document.getElementById("closeEdit").addEventListener(
    "click",
    closeEditModal
);

document.getElementById("cancelEdit").addEventListener(
    "click",
    closeEditModal
);

// ---------------- UPDATE CLINIC ----------------

editClinicForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!editingClinicId) return;

    const name = document.getElementById("editName").value.trim();
    const address = document.getElementById("editAddress").value.trim();
    const phone = document.getElementById("editPhone").value.trim();
    const openingTime = document.getElementById("editOpeningTime").value;
    const closingTime = document.getElementById("editClosingTime").value;

    if (closingTime <= openingTime) {
        alert("Closing time must be later than opening time.");
        return;
    }

    const button = document.getElementById("saveClinicBtn");
    button.disabled = true;
    button.textContent = "Saving...";

    try {
        await apiRequest(`${CLINICS_API}/${editingClinicId}`, {
            method: "PUT",
            body: JSON.stringify({
                name,
                address,
                phone,
                openingTime,
                closingTime
            })
        });

        closeEditModal();
        await loadClinics();
        showMessage("Clinic updated successfully!");
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent = "Save Changes";
    }
});

// ---------------- DELETE CLINIC ----------------

clinicGrid.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const clinicId = button.dataset.id;
    const action = button.dataset.action;

    const clinic = clinics.find(
        item => String(getClinicId(item)) === String(clinicId)
    );

    if (!clinic) return;

    if (action === "edit") {
        openEditModal(clinic);
        return;
    }

    if (action === "delete") {
        const confirmed = confirm(
            `Are you sure you want to delete "${clinic.name}"?`
        );

        if (!confirmed) return;

        button.disabled = true;

        try {
            await apiRequest(`${CLINICS_API}/${clinicId}`, {
                method: "DELETE"
            });

            await loadClinics();
            showMessage("Clinic deleted successfully!");
        } catch (error) {
            showMessage(error.message, true);
            button.disabled = false;
        }
    }
});

// ---------------- INITIAL LOAD ----------------

loadClinics();
