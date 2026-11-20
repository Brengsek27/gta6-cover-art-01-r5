import { drawCover } from "./cover.js";
import { readShot, shotReady } from "./shots.js";

const byId = (id) => document.getElementById(id);
const canvas = byId("cover");
const sampleNames = ["boulevard", "pier", "marina", "street"];
const state = {
  layout: "collage", grade: "sunset", caption: "NEON COAST", sub: "vice heat rising",
  sticker: "MAXIMUM HEAT", ink: false, stars: true, grain: true, zoom: 1,
};
const textFields = ["caption", "sub", "sticker"];
const switches = ["ink", "stars", "grain"];
let photos = [];
let names = [];
let loadId = 0;
let activeSample = "";

function buttons(key) {
  return document.querySelectorAll(`[data-${key}]`);
}

function activate(key, value) {
  for (const button of buttons(key)) {
    const active = button.dataset[key] === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

function redraw() {
  if (photos.length) drawCover(canvas, photos, { ...state, names });
}

function resize(size) {
  const match = /^(\d{2,4})x(\d{2,4})$/.exec(size);
  if (!match) return;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 64 || height < 64 || width > 4096 || height > 4096) return;
  canvas.width = width;
  canvas.height = height;
  canvas.style.setProperty("--cover-ratio", width / height);
  byId("dimensions").textContent = `${width} × ${height}`;
  const format = byId("format");
  format.querySelector("[data-custom]")?.remove();
  if (![...format.options].some((option) => option.value === size)) {
    const option = new Option(`Custom · ${width} × ${height}`, size);
    option.dataset.custom = "";
    format.add(option);
  }
  format.value = size;
  redraw();
}

function loadPhoto(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A photo could not be opened."));
    image.src = url;
  });
}

function status(message) {
  const element = byId("status");
  element.textContent = message;
  element.hidden = !message;
}

async function loadScenes(sources, sample = "") {
  const request = ++loadId;
  try {
    const images = await Promise.all(sources.map(({ url }) => loadPhoto(url)));
    if (request !== loadId) return;
    photos = images;
    names = sources.map(({ name }) => name);
    activeSample = sample;
    activate("sample", activeSample);
    byId("thumbnails").replaceChildren(...images.map((image, index) => {
      image.alt = names[index] === "user" ? `Your photo ${index + 1}` : `${names[index]} sample`;
      return image;
    }));
    status("");
    byId("export").disabled = false;
    redraw();
  } catch (error) {
    if (request === loadId) status(error.message);
  } finally {
    for (const { url, name } of sources) if (name === "user") URL.revokeObjectURL(url);
  }
}

function loadSamples(selection, sample = selection[0]) {
  return loadScenes(selection.map((name) => ({ name, url: `./samples/${name}.jpg` })), sample);
}

function loadFiles(files) {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  const accepted = [...files].filter((file) => allowed.has(file.type)).slice(0, 4);
  if (!accepted.length) {
    if (files.length) status("Choose JPG, PNG or WebP photos.");
    return;
  }
  return loadScenes(accepted.map((file) => ({ name: "user", url: URL.createObjectURL(file) })));
}

function syncControls() {
  for (const key of ["layout", "grade"]) activate(key, state[key]);
  for (const key of textFields) byId(key).value = state[key];
  for (const key of switches) byId(key).checked = state[key];
}

for (const key of ["layout", "grade"]) {
  for (const button of buttons(key)) button.addEventListener("click", () => {
    state[key] = button.dataset[key];
    activate(key, state[key]);
    redraw();
  });
}
for (const button of buttons("sample")) button.addEventListener("click", () => {
  const name = button.dataset.sample;
  loadSamples([name, ...sampleNames.slice(1)], name);
});
for (const key of textFields) byId(key).addEventListener("input", (event) => {
  state[key] = event.target.value;
  redraw();
});
for (const key of switches) byId(key).addEventListener("change", (event) => {
  state[key] = event.target.checked;
  redraw();
});
byId("zoom").addEventListener("input", (event) => {
  state.zoom = event.target.valueAsNumber / 100;
  byId("zoom-value").textContent = `${event.target.value}%`;
  redraw();
});
byId("format").addEventListener("change", (event) => resize(event.target.value));
byId("files").addEventListener("change", (event) => {
  loadFiles(event.target.files);
  event.target.value = "";
});
const drop = byId("drop");
drop.addEventListener("dragover", (event) => {
  event.preventDefault();
  drop.classList.add("dragging");
});
drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
drop.addEventListener("drop", (event) => {
  event.preventDefault();
  drop.classList.remove("dragging");
  loadFiles(event.dataTransfer.files);
});
byId("export").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `neon-coast-${canvas.width}x${canvas.height}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

const query = new URLSearchParams(location.search);
const shot = readShot(query);
if (shot !== null) {
  for (const key of ["layout", "grade"]) {
    const value = query.get(key);
    if ([...buttons(key)].some((button) => button.dataset[key] === value)) state[key] = value;
  }
  for (const key of ["caption", "sub"]) {
    if (query.has(key)) state[key] = query.get(key).slice(0, byId(key).maxLength);
  }
  state.ink = query.get("ink") === "1";
  if (query.has("stars")) state.stars = query.get("stars") !== "0";
  if (query.has("grain")) state.grain = query.get("grain") !== "0";
  if (query.has("sticker")) state.sticker = query.get("sticker").slice(0, byId("sticker").maxLength);
  if (query.has("zoom")) state.zoom = Math.min(1.3, Math.max(.8, Number(query.get("zoom")) / 100));
  if (query.has("stars")) state.stars = query.get("stars") !== "0";
  if (query.has("grain")) state.grain = query.get("grain") !== "0";
  if (query.has("sticker")) state.sticker = query.get("sticker").slice(0, byId("sticker").maxLength);
  if (query.has("zoom")) state.zoom = Math.min(1.3, Math.max(.8, Number(query.get("zoom")) / 100));
  resize(query.get("size") ?? "1080x1080");
}
syncControls();
await Promise.all([document.fonts.load("144px Anton"), document.fonts.load("40px Pacifico")]);
await document.fonts.ready;
const selection = sampleNames.map((fallback, index) => {
  const value = query.get(index ? `photo${index + 1}` : "photo");
  return shot !== null && sampleNames.includes(value) ? value : fallback;
});
await loadSamples(selection);
if (shot === "cover") document.body.classList.add("shot-cover");
if (shot !== null && photos.length) shotReady();
