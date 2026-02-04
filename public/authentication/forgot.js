document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgotForm");
  const errorEl = document.getElementById("forgotError");
  const successEl = document.getElementById("forgotSuccess");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    errorEl.textContent = "";
    successEl.textContent = "";

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Basic validations
    if (!username || !email || !newPassword || !confirmPassword) {
      errorEl.textContent = "Please fill in all fields.";
      return;
    }

    if (newPassword.length < 6) {
      errorEl.textContent = "New password should be at least 6 characters.";
      return;
    }

    if (newPassword !== confirmPassword) {
      errorEl.textContent = "New password and confirmation do not match.";
      return;
    }

    try {
      const res = await fetch("/api/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, newPassword }),
      });

      if (!res.ok) {
        errorEl.textContent = "Server error. Please try again.";
        return;
      }

      const data = await res.json();

      if (!data.ok) {
        errorEl.textContent = data.message || "Could not reset password.";
        return;
      }

       alert("Password reset successfully. You can now log in with your new password.");
      const redirectUrl = data.redirect || "/login.html";
      window.location.href = redirectUrl;
      
    } catch (err) {
      console.error("Forgot password error:", err);
      errorEl.textContent = "Network error. Please try again.";
    }
  });
});
