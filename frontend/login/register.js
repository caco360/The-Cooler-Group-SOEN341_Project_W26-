const form = document.getElementById("signupForm");
const errorBox = document.getElementById("signupError");
const loadingPath = "/loading/loading.html";

form.addEventListener("submit", async (e) => {

  e.preventDefault(); // Stop normal form submit

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const repassword = document.getElementById("repassword").value.trim();

  errorBox.textContent = "";

  // Frontend validation
  if (!username || !password || !repassword) {
    errorBox.textContent = "All fields are required";
    return;
  }

  if (password !== repassword) {
    errorBox.textContent = "Passwords do not match";
    return;
  }

  // Send to backend
  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password,
        confirmPassword: repassword
      })
    });

    const data = await res.json();
    // Handles errors
    if (!data.ok) {
      errorBox.textContent = data.message;
      return;
    }
    // Post to login
    const loginRes = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    const loginData = await loginRes.json();
    // Handles case where auto-login failed
    if (!loginData.ok || !loginData.redirectTo) {
      errorBox.textContent = loginData.message || "Account created, but auto-login failed.";
      return;
    }

    const next = encodeURIComponent(loginData.redirectTo);
    const message = encodeURIComponent("Creating your account and opening your profile.");
    window.location.href = `${loadingPath}?next=${next}&message=${message}`;

  } catch (err) {
    console.error(err);
    errorBox.textContent = "Network error";
  }
});
