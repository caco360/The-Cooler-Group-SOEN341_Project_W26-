const form = document.getElementById("signupForm");
const errorBox = document.getElementById("signupError");

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

  // Password policy: at least 8 characters, one uppercase, one number
  const pwdPolicy = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!pwdPolicy.test(password)) {
    errorBox.textContent = "Password must be at least 8 characters long and include at least one uppercase letter and one number.";
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

    if (!data.ok) {
      errorBox.textContent = data.message;
      return;
    }

    // Success → go to login
    window.location.href = "/login/login.html";

  } catch (err) {
    console.error(err);
    errorBox.textContent = "Network error";
  }
});