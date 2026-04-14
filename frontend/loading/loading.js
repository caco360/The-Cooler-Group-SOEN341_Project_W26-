const params = new URLSearchParams(window.location.search);
const next = params.get("next") || "/profile/profile.html";
const message = params.get("message");
const loadingMessage = document.getElementById("loadingMessage");

if (loadingMessage && message) {
  loadingMessage.textContent = message;
}
//optimizing user experience by giving a longer loading time to ensure the next page is fully loaded before redirecting
window.setTimeout(() => {
  window.location.href = next;
}, 900);
