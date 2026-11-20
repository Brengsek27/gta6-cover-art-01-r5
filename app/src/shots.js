export function shotReady() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}

export function readShot(query) {
  return query.get("shot") ?? "editor";
}
