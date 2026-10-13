
async function bookAppointment() {
    // Get values from the appointment form
    const doctorId = document.getElementById("doctorId").value.trim();
    const clinicId = document.getElementById("clinicId").value.trim();
    const appointmentDate = document.getElementById("appointmentDate").value;
    const appointmentTime = document.getElementById("appointmentTime").value;

    // Get logged-in patient's JWT token
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as a patient first.");
        return;
    }

    // Prepare request body using exact backend field names
    const appointmentData = {
        doctorId,
        clinicId,
        appointmentDate,
        appointmentTime
    };

    try {
        const response = await fetch("/api/appointments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(appointmentData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to book appointment"
            );
        }

        console.log("Booked appointment:", data.appointment);

        alert(
            `${data.message}\nYour token number is: ${data.appointment.tokenNumber}`
        );

        await getMyAppointments();

        // Reset the form if it exists
        const appointmentForm = document.getElementById("appointmentForm");

        if (appointmentForm) {
            appointmentForm.reset();
        }

    } catch (error) {
        console.error("Book appointment error:", error);
        alert(error.message || "Something went wrong.");
    }
}


// form k liye 
const appointmentForm = document.getElementById("appointmentForm");

appointmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await bookAppointment();
});





async function getMyAppointments() {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as a patient first.");
        return;
    }

    try {
        const response = await fetch("/api/appointments", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to fetch appointments"
            );
        }

        console.log("My appointments:", data.appointments);
        console.log("Total appointments:", data.count);

        const appointmentsTable =
            document.getElementById("appointmentsTable");

        appointmentsTable.innerHTML = "";

        if (data.appointments.length === 0) {


                            const actionCell = document.createElement("td");

                if (!["completed", "cancelled", "skipped"].includes(appointment.status)) {
                    const cancelButton = document.createElement("button");

                    cancelButton.textContent = "Cancel";
                    cancelButton.type = "button";

                    cancelButton.addEventListener("click", () => {
                        cancelAppointment(appointment.appointmentId);
                    });

                    actionCell.appendChild(cancelButton);
                } else {
                    actionCell.textContent = "—";
                }

                row.appendChild(actionCell);
                appointmentsTable.appendChild(row);


            appointmentsTable.innerHTML = `
                <tr>
                    <td colspan="7">You have no appointments yet.</td>
                </tr>
            `;
            return;
        }

        data.appointments.forEach((appointment) => {
            const row = document.createElement("tr");

            const values = [
                appointment.doctor?.name || "Name unavailable",
                appointment.doctor?.specialization || "N/A",
                appointment.clinic?.name || "N/A",
                appointment.clinic?.address || "N/A",
                appointment.date
                    ? new Date(appointment.date).toLocaleDateString("en-IN")
                    : "N/A",
                appointment.time || "N/A",
                appointment.tokenNumber ?? "N/A",
                appointment.status || "N/A"
            ];

            values.forEach((value) => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            appointmentsTable.appendChild(row);
        });

    } catch (error) {
        console.error("Get my appointments error:", error);
        alert(error.message || "Something went wrong.");
    }
}






async function cancelAppointment(appointmentId) {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as a patient first.");
        return;
    }

    // Confirm before cancellation
    const isConfirmed = confirm(
        "Are you sure you want to cancel this appointment?"
    );

    if (!isConfirmed) {
        return;
    }

    try {
        const response = await fetch(
            `/api/appointments/${encodeURIComponent(appointmentId)}`,
            {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to cancel appointment"
            );
        }

        alert(data.message || "Appointment cancelled successfully!");

        console.log("Cancelled appointment:", data.appointment);

        // Refresh appointment list
        await getMyAppointments();

    } catch (error) {
        console.error("Cancel appointment error:", error);
        alert(error.message || "Something went wrong.");
    }
}






async function getAvailableSlots() {
    const doctorId = document.getElementById("doctorId").value.trim();
    const selectedDate = document.getElementById("appointmentDate").value;
    const token = localStorage.getItem("token");

    const slotsContainer = document.getElementById("availableSlots");
    const appointmentTime = document.getElementById("appointmentTime");

    if (!token) {
        alert("Please login as a patient first.");
        return;
    }

    if (!doctorId || !selectedDate) {
        slotsContainer.innerHTML = "";
        appointmentTime.innerHTML =
            '<option value="">Select a date and doctor first</option>';
        return;
    }

    // Reset previous slots while fetching
    slotsContainer.textContent = "Loading available slots...";
    appointmentTime.innerHTML =
        '<option value="">Loading slots...</option>';

    try {
        const queryParams = new URLSearchParams({
            doctorId: doctorId,
            date: selectedDate
        });

        const response = await fetch(
            `/api/appointments/available-slots?${queryParams.toString()}`,
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
                data.message || "Failed to fetch available slots"
            );
        }

        console.log("Available slots response:", data);

        slotsContainer.innerHTML = "";
        appointmentTime.innerHTML =
            '<option value="">Select appointment time</option>';

        if (!data.availableSlots || data.availableSlots.length === 0) {
            slotsContainer.textContent =
                data.message || "No available slots for this date.";
            return;
        }

        // Show doctor and clinic details, if these elements exist
        const doctorInfo = document.getElementById("doctorInfo");
        if (doctorInfo && data.doctor) {
            doctorInfo.textContent =
                `${data.doctor.name} - ${data.doctor.specialization}`;
        }

        const clinicInfo = document.getElementById("clinicInfo");
        if (clinicInfo && data.clinic) {
            clinicInfo.textContent =
                `${data.clinic.name} - ${data.clinic.address}`;
        }

        const durationInfo = document.getElementById("consultationDuration");
        if (durationInfo) {
            durationInfo.textContent =
                `${data.consultationDuration} minutes`;
        }

        // Display each slot as a selectable option
        data.availableSlots.forEach((slot) => {
            const option = document.createElement("option");
            option.value = slot;
            option.textContent = slot;
            appointmentTime.appendChild(option);

            // Also show a clickable slot button
            const slotButton = document.createElement("button");
            slotButton.type = "button";
            slotButton.textContent = slot;

            slotButton.addEventListener("click", () => {
                appointmentTime.value = slot;

                // Highlight the selected slot
                slotsContainer
                    .querySelectorAll("button")
                    .forEach(button => {
                        button.style.backgroundColor = "";
                        button.style.color = "";
                    });

                slotButton.style.backgroundColor = "#6d5ae6";
                slotButton.style.color = "#ffffff";
            });

            slotsContainer.appendChild(slotButton);
        });

    } catch (error) {
        console.error("Get available slots error:", error);

        slotsContainer.textContent =
            error.message || "Something went wrong.";

        appointmentTime.innerHTML =
            '<option value="">Unable to load slots</option>';
    }
}



// Inse patient ko alag se button click karke slots search karne ki zarurat nahi padegi. , check then uncomment it
// const doctorSelect = document.getElementById("doctorId");
// const dateInput = document.getElementById("appointmentDate");

// doctorSelect.addEventListener("change", getAvailableSlots);
// dateInput.addEventListener("change", getAvailableSlots);




async function callNextPatient() {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login as a doctor first.");
        return;
    }

    const callNextButton = document.getElementById("callNextButton");
    const currentPatient = document.getElementById("currentPatient");

    if (callNextButton) {
        callNextButton.disabled = true;
        callNextButton.textContent = "Calling...";
    }

    try {
        const response = await fetch("/api/queue/call-next", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to call next patient"
            );
        }

        console.log("Next patient response:", data);

        const appointment = data.appointment;

        if (currentPatient && appointment) {
            currentPatient.innerHTML = "";

            const heading = document.createElement("h3");
            heading.textContent = "Current Patient";

            const tokenNumber = document.createElement("p");
            tokenNumber.textContent =
                `Token Number: ${appointment.tokenNumber ?? "N/A"}`;

            const status = document.createElement("p");
            status.textContent =
                `Status: ${appointment.status ?? "N/A"}`;

            currentPatient.append(heading, tokenNumber, status);
        }

        alert(data.message || "Next patient called successfully!");

    } catch (error) {
        console.error("Call next patient error:", error);
        alert(error.message || "Something went wrong.");
    } finally {
        if (callNextButton) {
            callNextButton.disabled = false;
            callNextButton.textContent = "Call Next Patient";
        }
    }
}



document.getElementById("callNextButton").addEventListener("click", callNextPatient);


getMyAppointments(); // load appointment as page Load