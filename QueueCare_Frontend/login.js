
async function loginUser() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Login failed");
        }

        // Save authentication details
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        alert(data.message || "Login successful!");

        console.log("Logged-in user:", data.user);

        // Redirect according to user role
        switch (data.user.role) {
            case "admin":
                window.location.href =
                    "/adminDashboard/admin-dashboard.html";
                break;

            case "doctor":
                window.location.href =
                    "/doctorDashboard/doctor-dashboard.html";
                break;

            case "patient":
                window.location.href =
                    "/patient/index.html";
                break;

            default:
                alert("Unknown user role. Please contact the administrator.");
                localStorage.removeItem("token");
                localStorage.removeItem("user");
        }

    } catch (error) {
        console.error("Login error:", error);
        alert(error.message || "Something went wrong.");
    }
}



const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await loginUser();
    });
}