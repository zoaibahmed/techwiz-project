import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const mode = process.argv[2];
assert(["live", "demo"].includes(mode), "Pass live or demo");
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4173",
    "--strictPort",
  ],
  { stdio: "pipe", windowsHide: true },
);
let browser;
try {
  let ready = false;
  for (let n = 0; n < 40; n++) {
    try {
      ready = (await fetch("http://127.0.0.1:4173")).ok;
    } catch {}
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  assert(ready, "Preview server failed to start");
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const calls = [];
  page.on("request", (request) => {
    if (["fetch", "xhr"].includes(request.resourceType()))
      calls.push(request.url());
  });
  await page.goto("http://127.0.0.1:4173");
  await page.locator("h1").waitFor();
  if (mode === "live") {
    assert.match(
      await page.locator("h1").innerText(),
      /integration is not configured/,
    );
    assert.equal(await page.locator(".demo-controls").count(), 0);
  } else {
    assert.match(await page.locator("h1").innerText(), /The living\s+market/);
    assert.match(
      await page.locator(".demo-banner").innerText(),
      /fictional data/,
    );
  }
  assert.deepEqual(calls, [], "Build made unexpected API requests");
  console.log(`${mode} build browser smoke passed; no fetch/XHR API calls.`);
} finally {
  await browser?.close();
  server.kill();
}
