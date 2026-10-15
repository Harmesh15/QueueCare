const appointmentsContainer = document.getElementById(
    "appointmentsContainer"
);

const appointmentsCount = document.getElementById(
    "appointmentsCount"
);

const appointmentsMessage = document.getElementById(
    "appointmentsMessage"
);



// Fetch Patient Appointments
async function getMyAppointments() {
    appointmentsMessage.textContent = "Loading appointments...";

    try {
        const token = localStorage.getItem("token");

        const response = await axios.get(
            "http://localhost:3000/api/appointments/my-appointments",
            {
                headers: token
                    ? { Authorization: `Bearer ${token}` }
                    : {}
            }
        );

        renderAppointments(response.data);

    } catch (error) {
        console.error("Error fetching appointments:", error);

        appointmentsContainer.innerHTML = "";
        appointmentsCount.textContent = "0 Appointments";

        appointmentsMessage.textContent =
            error.response?.data?.message ||
            "Unable to load appointments. Please try again.";
    }
}


// Render Dynamic Appointment Cards
function renderAppointments(response) {
    const appointments = response.appointments || [];

    appointmentsContainer.innerHTML = "";

    appointmentsCount.textContent =
        `${appointments.length} Appointment${appointments.length === 1 ? "" : "s"}`;

    if (appointments.length === 0) {
        appointmentsMessage.textContent = "You have no appointments yet.";
        return;
    }

    appointmentsMessage.textContent = "";

    appointments.forEach((appointment) => {
        const doctor = appointment.doctor || {};
        const clinic = appointment.clinic || {};

        const doctorName = doctor.name || "Doctor";
        const specialization = doctor.specialization || "N/A";
        const duration = doctor.consultationDuration;

        const clinicName = clinic.name || "N/A";
        const clinicAddress = clinic.address || "N/A";

        const status = String(appointment.status || "booked")
            .toLowerCase();

        // Format appointment date in Indian timezone.
        // The API date may be stored as UTC equivalent of India midnight.
        const appointmentDate = appointment.date
            ? new Date(appointment.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "Asia/Kolkata"
            })
            : "N/A";

        // Format time such as 10:00 to 10:00 AM
        let appointmentTime = appointment.time || "N/A";

        if (/^\d{2}:\d{2}$/.test(appointmentTime)) {
            const [hours, minutes] = appointmentTime
                .split(":")
                .map(Number);

            const timeDate = new Date(2000, 0, 1, hours, minutes);

            appointmentTime = timeDate.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });
        }

        // Create card
        const card = document.createElement("article");
        card.className = "appointment-card";

        // Doctor profile
        const cardTop = document.createElement("div");
        cardTop.className = "appointment-card-top";

        const doctorProfile = document.createElement("div");
        doctorProfile.className = "appointment-doctor";

        const avatar = document.createElement("div");
        avatar.className = "appointment-avatar";
        avatar.textContent = doctorName.charAt(0).toUpperCase();

        const doctorInfo = document.createElement("div");
        doctorInfo.className = "appointment-doctor-info";

        const name = document.createElement("h3");
        name.textContent = `Dr. ${doctorName}`;

        const specialty = document.createElement("p");
        specialty.className = "appointment-specialization";
        specialty.textContent = specialization;

        doctorInfo.append(name, specialty);
        doctorProfile.append(avatar, doctorInfo);

        // Status badge
        const statusBadge = document.createElement("span");
        statusBadge.className = `appointment-status ${status}`;
        statusBadge.textContent = status;

        cardTop.append(doctorProfile, statusBadge);

        // Date and Time
        const schedule = document.createElement("div");
        schedule.className = "appointment-schedule";

        function createScheduleItem(labelText, valueText) {
            const wrapper = document.createElement("div");

            const label = document.createElement("span");
            label.className = "appointment-schedule-label";
            label.textContent = labelText;

            const value = document.createElement("strong");
            value.className = "appointment-schedule-value";
            value.textContent = valueText;

            wrapper.append(label, value);

            return wrapper;
        }

        schedule.append(
            createScheduleItem("Appointment Date", appointmentDate),
            createScheduleItem("Appointment Time", appointmentTime)
        );

        // Clinic and consultation details
        const details = document.createElement("div");
        details.className = "appointment-details";

        function createDetail(labelText, valueText) {
            const wrapper = document.createElement("div");
            wrapper.className = "appointment-detail";

            const label = document.createElement("label");
            label.textContent = labelText;

            const value = document.createElement("p");
            value.textContent = valueText;

            wrapper.append(label, value);

            return wrapper;
        }

        details.append(
            createDetail("Clinic Name", clinicName),
            createDetail("Clinic Address", clinicAddress)
        );

        if (duration !== undefined && duration !== null) {
            details.append(
                createDetail(
                    "Consultation Duration",
                    `${duration} minutes`
                )
            );
        }

        // Token Number
        const token = document.createElement("div");
        token.className = "appointment-token";

        const tokenLabel = document.createElement("span");
        tokenLabel.textContent = "Queue Token";

        const tokenValue = document.createElement("strong");
        tokenValue.textContent =
            appointment.tokenNumber != null
                ? `#${appointment.tokenNumber}`
                : "N/A";

        token.append(tokenLabel, tokenValue);

        // Complete card
        // card.append(cardTop, schedule, details, token);
        // appointmentsContainer.appendChild(card);




            // Appointment Action Buttons
            const actions = document.createElement("div");
            actions.className = "appointment-actions";

            // Cancel button: only for active appointments
            if (["booked", "waiting"].includes(status)) {
                const cancelButton = document.createElement("button");

                cancelButton.className = "cancel-appointment-btn";
                cancelButton.textContent = "Cancel Appointment";

                cancelButton.addEventListener("click", () => {
                    cancelAppointment(appointment.appointmentId);
                });

                actions.appendChild(cancelButton);
            }

            // Delete button: shown for every appointment
            // const deleteButton = document.createElement("button");

            // deleteButton.className = "delete-appointment-btn";
            // deleteButton.textContent = "Delete";

            // deleteButton.addEventListener("click", () => {
            //     deleteAppointment(appointment.appointmentId);
            // });

            // actions.appendChild(deleteButton);

            // Append complete card
            card.append(cardTop, schedule, details, token, actions);

            appointmentsContainer.appendChild(card);
    });
}


// Cancel Appointment
async function cancelAppointment(id) {
    const confirmed = confirm(
        "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    try {
        const token = localStorage.getItem("token");

        // Replace with your actual cancel endpoint and HTTP method
        const response = await axios.patch(
            `http://localhost:3000/api/appointments/${id}/cancel`,
            {},
            {
                headers: token
                    ? { Authorization: `Bearer ${token}` }
                    : {}
            }
        );

        alert(
            response.data.message ||
            "Appointment cancelled successfully!"
        );

        await getMyAppointments();

    } catch (error) {
        console.error("Cancel appointment error:", error);

        alert(
            error.response?.data?.message ||
            "Failed to cancel appointment."
        );
    }
}


// Delete Appointment
async function deleteAppointment(appointmentId) {
    const confirmed = confirm(
        "Are you sure you want to permanently delete this appointment?"
    );

    if (!confirmed) return;

    try {
        const token = localStorage.getItem("token");

        // Replace with your actual delete endpoint
        const response = await axios.delete(
            `http://localhost:3000/api/appointments/${appointmentId}`,
            {
                headers: token
                    ? { Authorization: `Bearer ${token}` }
                    : {}
            }
        );

        alert(
            response.data.message ||
            "Appointment deleted successfully!"
        );

        await getMyAppointments();

    } catch (error) {
        console.error("Delete appointment error:", error);

        alert(
            error.response?.data?.message ||
            "Failed to delete appointment."
        );
    }
}


// Load appointments when the page opens
getMyAppointments();