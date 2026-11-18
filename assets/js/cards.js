// Card grids (/games/, /projects/): load each live card's preview only once its
// app answers, so an undeployed project (or a dev server that isn't running)
// shows a note instead of a framed 404.
(function () {
  document.querySelectorAll(".project").forEach(function (card) {
    var frame = card.querySelector("iframe");
    if (!frame) return; // image and placeholder cards have nothing to load
    var status = card.querySelector(".project__status");
    var url = new URL(frame.dataset.src, location.href);
    var local = url.origin !== location.origin; // dev servers are cross-origin; production apps share this origin

    // Cross-origin probes come back opaque: reaching the server at all is the signal.
    fetch(url, local ? { mode: "no-cors" } : { method: "HEAD" })
      .then(function (res) {
        if (!res.ok && res.type !== "opaque") throw new Error(res.status);
        frame.addEventListener("load", function () { card.classList.add("live"); });
        frame.src = url.href;
      })
      .catch(function () {
        status.textContent = local ? "Not running on " + url.host : "Coming soon";
      });
  });
})();
