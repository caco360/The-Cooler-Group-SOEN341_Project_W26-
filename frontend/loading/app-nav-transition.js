document.addEventListener("DOMContentLoaded", () => {
  const transitionPath = "/loading/app-transition.html";
  const navLinks = document.querySelectorAll("[data-app-nav] a[href]");

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(link.href, window.location.href);

      if (
        nextUrl.origin !== currentUrl.origin ||
        (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search)
      ) {
        return;
      }

      event.preventDefault();

      const targetName = link.textContent.trim() || "page";
      const next = encodeURIComponent(nextUrl.pathname + nextUrl.search + nextUrl.hash);
      const title = encodeURIComponent(`Opening ${targetName}`);
      const copy = encodeURIComponent("Blurring the transition for a smoother switch between workspaces.");

      window.location.href = `${transitionPath}?next=${next}&title=${title}&copy=${copy}`;
    });
  });
});
