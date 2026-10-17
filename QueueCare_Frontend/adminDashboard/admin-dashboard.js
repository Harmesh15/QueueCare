
    const doctorForm = document.getElementById("doctorForm");
    const name = document.getElementById("clinicName").value.trim();
    const address = document.getElementById("clinicAddress").value.trim();
    const phone = document.getElementById("clinicPhone").value.trim();
    const openingTime = document.getElementById("clinicOpeningTime").value;
    const closingTime = document.getElementById("clinicClosingTime").value;

doctorForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Get form values
    const userId = document.getElementById("doctorUserId").value.trim();
    const clinicId = document.getElementById("doctorClinicId").value.trim();
    const specialization = document
        .getElementById("doctorSpecialization")
        .value.trim();

    const consultationDuration = Number(
        document.getElementById("consultationDuration").value
    );

    // Get admin JWT token
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as admin first.");
        return;
    }

    // Prepare request body
    const doctorData = {
        userId,
        clinicId,
        specialization,
        consultationDuration
    };

    try {
        const response = await fetch(`${API_BASE}/doctors`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(doctorData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to create doctor"
            );
        }

        console.log("Created doctor:", data.doctor);

        alert(data.message || "Doctor created successfully!");

        doctorForm.reset();

        // Later, we will refresh the doctors list here.

    } catch (error) {
        console.error("Create doctor error:", error);
        alert(error.message || "Something went wrong.");
    }
});





async function getAllDoctors() {
    const doctorsTable = document.getElementById("doctorsTable");

    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as admin first.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/doctors`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to fetch doctors"
            );
        }

        console.log("All doctors:", data.doctors);
        console.log("Total doctors:", data.count);

        doctorsTable.innerHTML = "";

        if (data.doctors.length === 0) {
            doctorsTable.innerHTML = `
                <tr>
                    <td colspan="5">No doctors found.</td>
                </tr>
            `;
            return;
        }

        data.doctors.forEach((doctor) => {
            const row = document.createElement("tr");

            const values = [
                doctor.userId?.name || "N/A",
                doctor.specialization || "N/A",
                doctor.userId?.email || "N/A",
                doctor.clinicId?.name || "N/A",
                doctor.clinicId?.address || "N/A"
            ];

            values.forEach((value) => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            doctorsTable.appendChild(row);
        });

    } catch (error) {
        console.error("Get all doctors error:", error);
        alert(error.message || "Something went wrong.");
    }
}








async function getDoctorById(doctorId) {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as admin first.");
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/doctors/${encodeURIComponent(doctorId)}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to fetch doctor"
            );
        }

        const doctor = data.doctor;

        console.log("Doctor details:", doctor);

        // Return the doctor object for use in an edit form
        return doctor;

    } catch (error) {
        console.error("Get doctor by ID error:", error);
        alert(error.message || "Something went wrong.");
        return null;
    }
}








async function updateDoctor(doctorId, doctorData) {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as admin first.");
        return null;
    }

    try {
        const response = await fetch(
            `${API_BASE}/doctors/${encodeURIComponent(doctorId)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(doctorData)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to update doctor"
            );
        }

        console.log("Updated doctor:", data.doctor);

        alert(data.message || "Doctor updated successfully!");

        // Refresh the table after a successful update
        await getAllDoctors();

        return data.doctor;

    } catch (error) {
        console.error("Update doctor error:", error);
        alert(error.message || "Something went wrong.");
        return null;
    }
}







async function deleteDoctor(doctorId) {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as admin first.");
        return;
    }

    // Ask for confirmation before deleting
    const confirmDelete = confirm(
        "Are you sure you want to delete this doctor profile?"
    );

    if (!confirmDelete) {
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/doctors/${encodeURIComponent(doctorId)}`,
            {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to delete doctor"
            );
        }

        alert(data.message || "Doctor deleted successfully!");

        // Refresh the doctors table
        await getAllDoctors();

    } catch (error) {
        console.error("Delete doctor error:", error);
        alert(error.message || "Something went wrong.");
    }
}





// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// Availability




async function setWeeklyAvailability() {
    const token = localStorage.getItem("token");
    const doctorId = document.getElementById("availabilityDoctorId").value.trim();

    if (!token) {
        alert("Please login as an admin first.");
        return;
    }

    if (!doctorId) {
        alert("Please select a doctor.");
        return;
    }

    const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
    ];

    const schedule = [];

    for (const day of days) {
        const prefix = day.toLowerCase();

        const isAvailable = document.getElementById(
            `${prefix}Available`
        ).checked;

        const startTime = document.getElementById(
            `${prefix}Start`
        ).value;

        const endTime = document.getElementById(
            `${prefix}End`
        ).value;

        if (isAvailable && (!startTime || !endTime)) {
            alert(`Please select start and end times for ${day}.`);
            return;
        }

        schedule.push({
            dayOfWeek: day,
            isAvailable,
            startTime: isAvailable ? startTime : "00:00",
            endTime: isAvailable ? endTime : "00:00"
        });
    }

    try {
        const response = await fetch(`${API_BASE}/availability/weekly`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                doctorId,
                schedule
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to save weekly availability"
            );
        }

        alert(data.message || "Weekly availability saved successfully!");

        console.log("Updated weekly schedule:", data.schedule);

        // Display the latest saved schedule
        await getWeeklyAvailability();

    } catch (error) {
        console.error("Set weekly availability error:", error);
        alert(error.message || "Something went wrong.");
    }
}





async function getWeeklyAvailability() {
    const token = localStorage.getItem("token");
    const doctorId = document.getElementById("availabilityDoctorId").value.trim();
    const tableBody = document.getElementById("weeklyScheduleTable");

    if (!token) {
        alert("Please login as an admin first.");
        return;
    }

    if (!doctorId) {
        alert("Please select a doctor.");
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/availability/weekly/${encodeURIComponent(doctorId)}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to fetch weekly availability"
            );
        }

        console.log("Weekly availability:", data.schedule);

        tableBody.innerHTML = "";

        if (!data.schedule || data.schedule.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4">No weekly schedule found.</td>
                </tr>
            `;
            return;
        }

        const dayOrder = [
            "Monday", "Tuesday", "Wednesday", "Thursday",
            "Friday", "Saturday", "Sunday"
        ];

        const sortedSchedule = [...data.schedule].sort(
            (a, b) => dayOrder.indexOf(a.dayOfWeek) -
                      dayOrder.indexOf(b.dayOfWeek)
        );

        sortedSchedule.forEach((day) => {
            const row = document.createElement("tr");

            const values = [
                day.dayOfWeek,
                day.isAvailable ? "Available" : "Unavailable",
                day.isAvailable ? day.startTime : "—",
                day.isAvailable ? day.endTime : "—"
            ];

            values.forEach((value) => {
                const cell = document.createElement("td");
                cell.textContent = value ?? "—";
                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Get weekly availability error:", error);
        alert(error.message || "Something went wrong.");
    }
}



const saveAvailabilityButton = document.getElementById(
    "saveAvailabilityButton"
);

if (saveAvailabilityButton) {
    saveAvailabilityButton.addEventListener(
        "click",
        setWeeklyAvailability
    );
}

const loadAvailabilityButton = document.getElementById(
    "loadAvailabilityButton"
);

if (loadAvailabilityButton) {
    loadAvailabilityButton.addEventListener(
        "click",
        getWeeklyAvailability
    );
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// Clinic






async function createClinic() {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as an admin first.");
        return;
    }

    if (!name || !address || !phone || !openingTime || !closingTime) {
        alert("Please fill in all clinic fields.");
        return;
    }

    if (openingTime >= closingTime) {
        alert("Closing time must be later than opening time.");
        return;
    }

    const clinicData = {
        name,
        address,
        phone,
        openingTime,
        closingTime
    };

    try {
        const response = await fetch(`${API_BASE}/clinics`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(clinicData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to create clinic");
        }

        alert(data.message || "Clinic created successfully!");

        console.log("Created clinic:", data.clinic);

        const clinicForm = document.getElementById("clinicForm");

        if (clinicForm) {
            clinicForm.reset();
        }

        // Refresh clinic list if this function already exists
        if (typeof getAllClinics === "function") {
            await getAllClinics();
        }

    } catch (error) {
        console.error("Create clinic error:", error);
        alert(error.message || "Something went wrong.");
    }
}



const clinicForm = document.getElementById("clinicForm");

if (clinicForm) {
    clinicForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await createClinic();
    });
}







async function getAllClinics() {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as an admin first.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/clinics`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to fetch clinics"
            );
        }

        console.log("Clinics:", data.clinics);

        const clinicsTable = document.getElementById("clinicsTable");

        if (!clinicsTable) {
            console.error("clinicsTable element not found.");
            return;
        }

        clinicsTable.innerHTML = "";

        if (!data.clinics || data.clinics.length === 0) {
            clinicsTable.innerHTML = `
                <tr>
                    <td colspan="5">No clinics found.</td>
                </tr>
            `;
            return;
        }

        data.clinics.forEach((clinic) => {
            const row = document.createElement("tr");

            const values = [
                clinic.name || "N/A",
                clinic.address || "N/A",
                clinic.phone || "N/A",
                clinic.openingTime || "N/A",
                clinic.closingTime || "N/A"
            ];

            values.forEach((value) => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            clinicsTable.appendChild(row);
        });

    } catch (error) {
        console.error("Get all clinics error:", error);
        alert(error.message || "Something went wrong.");
    }
}



// Agar admin dashboard khulte hi clinics dikhani hain, toh ye add karo:
document.addEventListener("DOMContentLoaded", () => {
    getAllClinics();
});






async function getClinicById(clinicId) {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as an admin first.");
        return null;
    }

    if (!clinicId) {
        alert("Please provide a clinic ID.");
        return null;
    }

    try {
        const response = await fetch(
            `${API_BASE}/clinics/${encodeURIComponent(clinicId)}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to fetch clinic"
            );
        }

        console.log("Clinic details:", data.clinic);

        return data.clinic;

    } catch (error) {
        console.error("Get clinic by ID error:", error);
        alert(error.message || "Something went wrong.");
        return null;
    }
}




const clinic = await getClinicById("YOUR_CLINIC_ID"); 

if (clinic) {
    console.log(clinic.name);
    console.log(clinic.address);
    console.log(clinic.phone);
    console.log(clinic.openingTime);
    console.log(clinic.closingTime);
}


async function updateClinic(clinicId, clinicData) {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as admin first.");
        return;
    }

    if (!clinicId) {
        alert("Clinic ID is required.");
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/clinics/${encodeURIComponent(clinicId)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(clinicData)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to update clinic");
        }

        alert(data.message || "Clinic updated successfully");

        console.log("Updated clinic:", data.clinic);

        if (typeof getAllClinics === "function") {
            await getAllClinics();
        }

        return data.clinic;

    } catch (error) {
        console.error("Update clinic error:", error);
        alert(error.message || "Something went wrong");
        return null;
    }
}





async function deleteClinic(clinicId) {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as admin first.");
        return;
    }

    if (!clinicId) {
        alert("Clinic ID is required.");
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete this clinic?"
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
            `${API_BASE}/clinics/${encodeURIComponent(clinicId)}`,
            {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to delete clinic");
        }

        alert(data.message || "Clinic deleted successfully");

        if (typeof getAllClinics === "function") {
            await getAllClinics();
        }

    } catch (error) {
        console.error("Delete clinic error:", error);
        alert(error.message || "Something went wrong");
    }
}



// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>