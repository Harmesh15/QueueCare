const doctorsContainer = document.getElementById("doctorsContainer");
const doctorsCount = document.getElementById("doctorsCount");
const doctorsMessage = document.getElementById("doctorsMessage");

async function getAllDoctors() {
    try {
        const response = await axios.get(
            "http://localhost:3000/api/doctors"
        );

        console.log(response.data);

        renderDoctors(response.data);

    } catch (error) {
        console.error("Error fetching doctors:", error);
    }
}

getAllDoctors();


let allDoctors = [];
let editingDoctorId = null;

function renderDoctors(response) {
    const doctors = response.doctors || [];
    allDoctors = doctors;


    // Update count
    doctorsCount.textContent = `${doctors.length} Doctors`;

    // Clear existing cards
    doctorsContainer.innerHTML = "";

    if (doctors.length === 0) {
        doctorsMessage.textContent = "No doctors found.";
        return;
    }

    doctorsMessage.textContent = "";

    doctors.forEach((doctor) => {
        const doctorName = doctor.userId?.name || "Unknown Doctor";
        const specialization = doctor.specialization || "N/A";
        const duration = doctor.consultationDuration ?? "N/A";

        const clinicName = doctor.clinicId?.name || "N/A";
        const clinicAddress = doctor.clinicId?.address || "N/A";

        const isAvailable = doctor.isAvailable === true;

        const card = document.createElement("div");
        card.className = "doctor-card";

        // Doctor Profile
        const profile = document.createElement("div");
        profile.className = "doctor-profile";

        const avatar = document.createElement("div");
        avatar.className = "doctor-avatar";
        avatar.textContent = doctorName.charAt(0).toUpperCase();

        const profileInfo = document.createElement("div");
        profileInfo.className = "doctor-profile-info";

        const name = document.createElement("h3");
        name.className = "doctor-name";
        name.textContent = `Dr. ${doctorName}`;

        const specialty = document.createElement("p");
        specialty.className = "doctor-specialization";
        specialty.textContent = specialization;

        profileInfo.append(name, specialty);
        profile.append(avatar, profileInfo);

        // Availability Status
        const status = document.createElement("span");
        status.className = `doctor-status ${
            isAvailable ? "available" : "unavailable"
        }`;

        status.textContent = isAvailable
            ? "Available"
            : "Unavailable";

        // Doctor Details
        const details = document.createElement("div");
        details.className = "doctor-details";

        function createDetail(labelText, valueText) {
            const wrapper = document.createElement("div");
            wrapper.className = "doctor-detail";

            const label = document.createElement("label");
            label.textContent = labelText;

            const value = document.createElement("p");
            value.textContent = valueText;

            wrapper.append(label, value);

            return wrapper;
        }

        details.append(
            createDetail("Clinic Name", clinicName),
            createDetail("Clinic Address", clinicAddress),
            createDetail("Consultation Duration", `${duration} minutes`)
        );

        // Action Buttons
        const actions = document.createElement("div");
        actions.className = "doctor-actions";

        const editButton = document.createElement("button");
        editButton.className = "edit-doctor-btn";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editDoctor(doctor._id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-doctor-btn";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteDoctor(doctor._id);
        });

        actions.append(editButton, deleteButton);

        // Complete Card
        card.append(profile, status, details, actions);

        doctorsContainer.appendChild(card);
    });
}



// Demo Delete Function
async function deleteDoctor(doctorId) {
    const confirmDelete = confirm(
        "Are you sure you want to delete this doctor?"
    );

    if (!confirmDelete) {
        return;
    }

    try {
        const response = await axios.delete(
            `http://localhost:3000/api/doctors/${doctorId}`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            }
        );

        alert(response.data.message || "Doctor deleted successfully!");

        // Refresh doctors list
        await getAllDoctors();

    } catch (error) {
        console.error("Delete doctor error:", error);

        alert(
            error.response?.data?.message ||
            "Failed to delete doctor. Please try again."
        );
    }
}


// edit 

async function editDoctor(doctorId) {
    const doctor = allDoctors.find(
        (item) => item._id === doctorId
    );

    if (!doctor) {
        alert("Doctor not found");
        return;
    }

    editingDoctorId = doctorId;

    // Fill existing doctor details
    document.getElementById("editSpecialization").value =
        doctor.specialization || "";

    document.getElementById("editConsultationDuration").value =
        doctor.consultationDuration ?? 15;

    document.getElementById("editIsAvailable").value =
        String(doctor.isAvailable);

    const modal = document.getElementById("editDoctorModal");
    const message = document.getElementById("editDoctorMessage");

    message.textContent = "";
    message.className = "edit-doctor-message";

    // Open modal
    modal.classList.add("show");

    // Load clinics and select current clinic
    await loadClinics(doctor.clinicId?._id);
}




/// load clininc dropdown

async function loadClinics(selectedClinicId) {
    const clinicSelect = document.getElementById("editClinicId");

    clinicSelect.innerHTML =
        '<option value="">Loading clinics...</option>';

    try {
        // Replace with your actual getAllClinics endpoint
        const response = await axios.get(
            "http://localhost:3000/api/clinics"
        );

        // Supports { clinics: [...] } or a direct array
        const clinics = Array.isArray(response.data)
            ? response.data
            : response.data.clinics || [];

        clinicSelect.innerHTML =
            '<option value="">Select Clinic</option>';

        clinics.forEach((clinic) => {
            const option = document.createElement("option");

            option.value = clinic._id;
            option.textContent = clinic.name;

            clinicSelect.appendChild(option);
        });

        clinicSelect.value = selectedClinicId || "";

        if (!clinicSelect.value && selectedClinicId) {
            throw new Error(
                "Current clinic was not found in the clinic list"
            );
        }

    } catch (error) {
        console.error("Error loading clinics:", error);

        clinicSelect.innerHTML =
            '<option value="">Unable to load clinics</option>';

        document.getElementById("editDoctorMessage").textContent =
            "Clinics could not be loaded. Check the clinic API URL.";
    }
}



// Close Edit Form
function closeEditDoctorForm() {
    document.getElementById("editDoctorModal")
        .classList.remove("show");

    editingDoctorId = null;
}



document.getElementById("editDoctorForm")
    .addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!editingDoctorId) {
            return;
        }

        const clinicId =
            document.getElementById("editClinicId").value;

        const specialization =
            document.getElementById("editSpecialization")
                .value.trim();

        const consultationDuration = Number(
            document.getElementById("editConsultationDuration").value
        );

        const isAvailable =
            document.getElementById("editIsAvailable").value === "true";

        const message =
            document.getElementById("editDoctorMessage");

        const saveButton =
            document.getElementById("saveDoctorBtn");

        if (!clinicId || !specialization || consultationDuration < 1) {
            message.textContent = "Please enter valid details.";
            message.className = "edit-doctor-message error";
            return;
        }

        // Data to send to backend
        const updatedData = {
            clinicId,
            specialization,
            consultationDuration,
            isAvailable
        };

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        message.textContent = "";

        try {
            // Replace URL/method if your backend uses a different route
            const response = await axios.put(
                `http://localhost:3000/api/doctors/${editingDoctorId}`,
                updatedData
            );

            message.textContent =
                response.data.message || "Doctor updated successfully.";

            message.className = "edit-doctor-message success";

            // Refresh cards after successful update
            await getAllDoctors();

            setTimeout(() => {
                closeEditDoctorForm();
            }, 700);

        } catch (error) {
            console.error("Update doctor error:", error);

            message.textContent =
                error.response?.data?.message ||
                "Failed to update doctor.";

            message.className = "edit-doctor-message error";

        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Changes";
        }
    });