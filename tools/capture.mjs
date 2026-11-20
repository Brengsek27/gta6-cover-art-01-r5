import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const chrome = "/home/hatch/.cache/puppeteer/chrome/linux-157.0.8103.50/chrome-linux64/chrome";
const shots = JSON.parse(await readFile(join(root, "shots.json"), "utf8"));
const output = join(root, "screenshots");
const captureRoot = join(root, "tools", ".capture");
const cap = 262144;

if (!shots.length) throw new Error("shots.json is empty");

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function until(probe, description, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const result = await probe();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function getLocal(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
    if (response.ok) return response;
  } catch {
    return null;
  }
}

async function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let sequence = 0;
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  return {
    close: () => socket.close(),
    send(method, params = {}, sessionId) {
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params, sessionId }));
      });
    },
  };
}

async function capture(protocol, origin, shot, sessionId) {
  const send = (method, params) => protocol.send(method, params, sessionId);
  await send("Emulation.setDeviceMetricsOverride", {
    width: shot.w, height: shot.h, deviceScaleFactor: 1, mobile: false,
  });
  const navigation = await send("Page.navigate", { url: `${origin}/${shot.query}` });
  if (navigation.errorText) throw new Error(`${shot.name}: ${navigation.errorText}`);
  await until(async () => {
    const result = await send("Runtime.evaluate", {
      expression: "window.__shotReady === true", returnByValue: true,
    });
    return result.result.value;
  }, shot.name);
  for (let quality = 82; ; quality = Math.max(45, quality - 8)) {
    const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality, fromSurface: true });
    const bytes = Buffer.from(data, "base64");
    if (bytes.length <= cap) return bytes;
    if (quality === 45) throw new Error(`${shot.name} exceeds ${cap} bytes at quality 45`);
  }
}

await mkdir(captureRoot, { recursive: true });
const profile = await mkdtemp(join(captureRoot, "chrome-"));
const servePort = await freePort();
const server = spawn(process.execPath, ["serve.ts", "--port", String(servePort)], { cwd: root, stdio: "inherit" });
const origin = `http://127.0.0.1:${servePort}`;
let browser;
let protocol;
try {
  await until(() => getLocal(origin), "local app server");
  const debugPort = await freePort();
  browser = spawn(chrome, [
    "--headless", "--no-sandbox", "--disable-background-networking", "--no-first-run",
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, "about:blank",
  ], { cwd: root, stdio: "ignore" });
  const endpoint = await until(() => getLocal(`http://127.0.0.1:${debugPort}/json/version`), "Chrome DevTools");
  protocol = await connect((await endpoint.json()).webSocketDebuggerUrl);
  const { targetId } = await protocol.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await protocol.send("Target.attachToTarget", { targetId, flatten: true });
  await protocol.send("Page.enable", {}, sessionId);
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const shot of shots) {
    const bytes = await capture(protocol, origin, shot, sessionId);
    await writeFile(join(output, shot.name), bytes);
    console.log(`${shot.name}: ${bytes.length} bytes`);
  }
  if (shots.length !== 4) throw new Error(`Expected 4 shots, got ${shots.length}`);
} finally {
  protocol?.close();
  browser?.kill();
  server.kill();
}
