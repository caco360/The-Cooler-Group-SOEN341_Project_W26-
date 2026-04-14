const params = new URLSearchParams(window.location.search);
const next = params.get("next") || "/profile/profile.html";
const title = params.get("title");
const copy = params.get("copy");

const transitionTitle = document.getElementById("transitionTitle");
const transitionCopy = document.getElementById("transitionCopy");

if (transitionTitle && title) {
  transitionTitle.textContent = title;
}
// reducing latency by preloading the next page
if (transitionCopy && copy) {
  transitionCopy.textContent = copy;
}

window.setTimeout(() => {
  window.location.href = next;
}, 700);
