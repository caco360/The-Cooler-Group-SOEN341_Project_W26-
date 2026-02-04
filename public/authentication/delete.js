document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("deleteForm");
  const errorEl = document.getElementById("deleteError");

  const modal = document.getElementById("confirmModal");
  const confirmBtn = document.getElementById("confirmDeleteBtn");
  const cancelBtn = document.getElementById("cancelDeleteBtn");

  let pendingUsername = "";
  let pendingPassword = "";

  function openModal() {
    modal.style.display = "flex";
  }

  function closeModal() {
    modal.style.display = "none";
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      errorEl.textContent = "Please enter username and password.";
      return;
    }


    pendingUsername = username;
    pendingPassword = password;
    openModal();
  });

  cancelBtn.addEventListener("click", () => {
    closeModal();
  });

  confirmBtn.addEventListener("click", async () => {
    errorEl.textContent = "";

    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: pendingUsername,
          password: pendingPassword,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        errorEl.textContent = data.message || "Could not delete account.";
        closeModal();
        return;
      }

      closeModal();
      alert("Your account has been deleted successfully.");
      localStorage.removeItem("currentUser");
      window.location.href = "/register.html";
    } catch (err) {
      console.error(err);
      errorEl.textContent = "Server error. Try again.";
      closeModal();
    }
  });
});
