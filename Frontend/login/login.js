document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");

  if (!form || !errorBox) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Clear message
    errorBox.textContent = "";
    errorBox.style.color = "red";

    // Get values
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      errorBox.textContent = "Enter username and password.";
      return;
    }

    // Password policy: at least 8 characters, one uppercase, one number
    const pwdPolicy = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!pwdPolicy.test(password)) {
      errorBox.textContent = "Password must be at least 8 characters long and include at least one uppercase letter and one number.";
      return;
    }

    try {
      // Same endpoint as working version
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await response.json();

      // If login failed
      if (!data.ok) {
        errorBox.textContent = data.message || "Login failed.";
        return;
      }

      // Success → redirect (same as first version)
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
      } else {
        errorBox.textContent = "Login succeeded but no redirect provided.";
      }

    } catch (error) {
      console.error("Login error:", error);
      errorBox.textContent = "Network error. Try again.";
    }
  });
});