document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");

  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorBox.textContent = "";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      errorBox.textContent = "Enter username and password.";
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        errorBox.textContent = "Server error. Please try again.";
        return;
      }

      const data = await res.json();

      if (!data.ok) {
        errorBox.textContent = data.message || "Username or password is incorrect.";
        return;
      }

      const user = data.user;
      if (!user || !user.id) {
        errorBox.textContent = "Login succeeded but user id is missing.";
        return;
      }

      // Store current user so sidebar / dashboard can read it
      try {
        localStorage.setItem("currentUser", JSON.stringify(user));
      } catch (e) {
        console.warn("Could not store currentUser in localStorage:", e);
      }

      // Go to the home page (wip) !!!!!!!!!!!!!!!!!!!!!!!!!!!
      const redirectUrl = data.redirect || "/login.html";
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Login error:", error);
      errorBox.textContent = "Error while reaching the server.";
    }
  });
});

