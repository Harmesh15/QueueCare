
async function registerUser() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value.trim();

    if (!name || !email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    const userData = {
        name,
        email,
        password
    };

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Registration failed"
            );
        }

        alert(data.message || "Registration successful!");

        console.log("Registered user:", data.user);

        // Redirect to login page after successful registration
        window.location.href = "/login.html";

    } catch (error) {
        console.error("Register error:", error);
        alert(error.message || "Something went wrong.");
    }
}



const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await registerUser();
    });
}