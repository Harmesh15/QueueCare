
let lockoutInterval = null;
let lockoutUntil = 0;

const loginMessage = document.getElementById("loginMessage");
const loginForm = document.getElementById("loginForm");
const submitButton = loginForm?.querySelector('button[type="submit"]');

function showLoginMessage(message) {
    if (loginMessage) {
        loginMessage.textContent = message;
    } else {
        alert(message);
    }
}

function startLockoutCountdown(seconds) {
    clearInterval(lockoutInterval);

    lockoutUntil = Date.now() + seconds * 1000;

    if (submitButton) {
        submitButton.disabled = true;
    }

    function updateCountdown() {
        const remainingSeconds = Math.max(
            0,
            Math.ceil((lockoutUntil - Date.now()) / 1000)
        );

        if (remainingSeconds <= 0) {
            clearInterval(lockoutInterval);
            lockoutInterval = null;
            lockoutUntil = 0;

            if (submitButton) {
                submitButton.disabled = false;
            }

            showLoginMessage(
                "You can try logging in again now."
            );
            return;
        }

        showLoginMessage(
            `Too many failed attempts. Try again in ${remainingSeconds} seconds.`
        );
    }

    updateCountdown();
    lockoutInterval = setInterval(updateCountdown, 1000);
}

async function loginUser() {
    if (lockoutUntil > Date.now()) {
        const remainingSeconds = Math.ceil(
            (lockoutUntil - Date.now()) / 1000
        );

        showLoginMessage(
            `Please wait ${remainingSeconds} seconds before trying again.`
        );
        return;
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        showLoginMessage("Please enter your email and password.");
        return;
    }

    try {
        const response = await axios.post(
            `${API_BASE}/auth/login`,
            { email, password }
        );

        const data = response.data;

        // Clear old lockout timer if one exists.
        clearInterval(lockoutInterval);
        lockoutInterval = null;
        lockoutUntil = 0;

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        showLoginMessage(data.message || "Login successful!");

        switch (data.user.role) {
            case "admin":
                window.location.href =
                    "/adminDashboard/admin-dashboard.html";
                break;

            case "doctor":
                window.location.href =
                    "../doctor/doctorsDashboard.html";
                break;

            case "patient":
                window.location.href =
                    "../patient/patient.html";
                break;

            default:
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                showLoginMessage(
                    "Unknown user role. Please contact the administrator."
                );
        }
    } catch (error) {
        console.error("Login error:", error);

        const data = error.response?.data;

        if (!data) {
            showLoginMessage(
                "Unable to connect to the server. Please try again."
            );
            return;
        }

        if (data.locked || error.response.status === 429) {
            startLockoutCountdown(
                Number(data.remainingSeconds) || 60
            );
            return;
        }

        if (error.response.status === 401) {
            const remaining = data.remainingAttempts;

            if (typeof remaining === "number") {
                showLoginMessage(
                    `Invalid email or password. ${remaining} ${
                        remaining === 1 ? "attempt" : "attempts"
                    } remaining.`
                );
            } else {
                showLoginMessage(
                    data.message || "Invalid email or password."
                );
            }

            return;
        }

        showLoginMessage(
            data.message || "Something went wrong. Please try again."
        );
    }
}

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await loginUser();
    });
}
