const params = new URLSearchParams(window.location.search);
const next = params.get("next") || "/profile/profile.html";
const message = params.get("message");
const loadingMessage = document.getElementById("loadingMessage");

if (loadingMessage && message) {
  loadingMessage.textContent = message;
}

window.setTimeout(() => {
  window.location.href = next;
}, 900);
