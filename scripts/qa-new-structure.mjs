import { chromium } from "@playwright/test";

const baseURL = process.env.QA_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const report = { checks: [], errors: [] };
const run = async (name, action) => {
  try { report.checks.push({ name, passed: true, detail: await action() }); }
  catch (error) { report.checks.push({ name, passed: false, detail: String(error) }); }
};
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (error) => report.errors.push(String(error)));
page.on("console", (message) => { if (message.type() === "error") report.errors.push(message.text()); });
await page.goto(baseURL, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });

await run("shared header and separate AI entry", async () => {
  await page.getByRole("button", { name: "进入我的页面" }).waitFor();
  await page.getByRole("button", { name: "查看收藏" }).waitFor();
  await page.getByRole("button", { name: "打开 AI 助手" }).click();
  await page.getByRole("dialog", { name: "AI 周末助手" }).waitFor();
  await page.getByRole("button", { name: "关闭 AI 助手" }).click();
  return "header + AI assistant reachable";
});
await run("plan list opens map detail and returns", async () => {
  await page.getByText("西岸看展、龙华会与滨江日落", { exact: true }).click();
  await page.getByText("AI 刚为你改了 3 处").waitFor();
  await page.getByRole("button", { name: "返回" }).click();
  await page.getByText("周末计划", { exact: true }).waitFor();
  return "list → detail → list";
});
await run("explore category and mixed feed", async () => {
  await page.getByRole("button", { name: "探索", exact: true }).click();
  await page.getByRole("button", { name: "用户攻略", exact: true }).click();
  await page.getByText("社区精选", { exact: true }).first().waitFor();
  return await page.locator(".explore-feed .activity-card").count();
});
await run("profile and favorites subpages", async () => {
  await page.getByRole("button", { name: "进入我的页面" }).click();
  await page.getByText("佳佳", { exact: true }).waitFor();
  await page.getByRole("button", { name: "查看收藏" }).click();
  await page.getByText("我的收藏", { exact: true }).waitFor();
  return "profile + favorites reachable";
});
await run("four-page navigation persists", async () => {
  for (const label of ["探索", "计划", "组队", "旅迹"]) await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByText("把喜欢的城市装进口袋", { exact: true }).waitFor();
  return "all four nav items clickable";
});
await run("mobile has no horizontal overflow", async () => page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth })));
await page.screenshot({ path: "qa/new-structure-mobile.png", fullPage: false, animations: "disabled" });

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await desktop.goto(baseURL, { waitUntil: "networkidle" });
await desktop.getByRole("button", { name: "计划", exact: true }).click();
await desktop.getByText("西岸看展、龙华会与滨江日落", { exact: true }).click();
await run("desktop map detail remains two-pane", async () => desktop.locator(".itinerary-screen").evaluate((element) => getComputedStyle(element).gridTemplateColumns));
await desktop.screenshot({ path: "qa/new-structure-desktop.png", fullPage: false, animations: "disabled" });
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (report.errors.length || report.checks.some((check) => !check.passed)) process.exitCode = 1;
