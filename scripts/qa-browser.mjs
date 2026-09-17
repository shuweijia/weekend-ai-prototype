import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const baseURL = process.env.QA_BASE_URL || "http://127.0.0.1:4173";
const outputDir = fileURLToPath(new URL("../qa/", import.meta.url));
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox"],
});

const report = {
  baseURL,
  consoleErrors: [],
  pageErrors: [],
  requestsFailed: [],
  checks: [],
  screenshots: [],
};

function attachDiagnostics(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") report.consoleErrors.push({ label, text: message.text() });
  });
  page.on("pageerror", (error) => report.pageErrors.push({ label, text: String(error) }));
  page.on("requestfailed", (request) => report.requestsFailed.push({
    label,
    url: request.url(),
    error: request.failure()?.errorText || "unknown",
  }));
}

async function shot(page, filename, fullPage = true) {
  const path = join(outputDir, filename);
  await page.screenshot({ path, fullPage, animations: "disabled" });
  report.screenshots.push(path);
}

async function check(name, action) {
  try {
    const detail = await action();
    report.checks.push({ name, status: "passed", detail: detail ?? null });
  } catch (error) {
    report.checks.push({ name, status: "failed", detail: String(error) });
  }
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
mobile.setDefaultTimeout(5000);
attachDiagnostics(mobile, "mobile");
await mobile.goto(baseURL, { waitUntil: "networkidle" });
await mobile.evaluate(() => localStorage.clear());
await mobile.reload({ waitUntil: "networkidle" });

await check("mobile initial itinerary renders", async () => {
  await mobile.getByText("AI 刚为你改了 3 处").waitFor();
  return await mobile.getByTestId("weekend-app").isVisible();
});
await shot(mobile, "00-mobile-viewport.png", false);
await shot(mobile, "01-mobile-itinerary.png");

await check("preferences propagate into the itinerary", async () => {
  await mobile.getByRole("button", { name: /9月19日 周六/ }).click();
  await mobile.getByRole("dialog", { name: "调整推荐偏好" }).waitFor();
  await mobile.getByRole("button", { name: "4+ 人", exact: true }).click();
  await mobile.locator('input[type="range"]').fill("400");
  await mobile.getByRole("button", { name: "保存偏好" }).click();
  const summary = await mobile.getByRole("button", { name: /9月19日 周六/ }).innerText();
  if (!summary.includes("4人") || !summary.includes("¥400/人内")) throw new Error(summary);
  return summary;
});

await check("mobile itinerary controls are named and touch-sized", async () => {
  const issues = await mobile.locator("button:visible").evaluateAll((buttons) => buttons.flatMap((button) => {
    const rect = button.getBoundingClientRect();
    const name = button.getAttribute("aria-label") || button.textContent?.trim() || "";
    const result = [];
    if (!name) result.push({ issue: "missing-name", html: button.outerHTML.slice(0, 120) });
    if (rect.width < 40 || rect.height < 40) result.push({ issue: "small-target", name, width: rect.width, height: rect.height });
    return result;
  }));
  if (issues.length) throw new Error(JSON.stringify(issues));
  return "all visible controls ≥40px with accessible names";
});

await check("explore and activity detail flow", async () => {
  await mobile.getByRole("button", { name: "探索", exact: true }).click();
  await mobile.getByText("把周末过成喜欢的样子").waitFor();
  await mobile.getByRole("heading", { name: "西岸美术馆" }).click();
  await mobile.getByRole("dialog", { name: "活动详情" }).waitFor();
  await shot(mobile, "02-mobile-activity-detail.png");
  await mobile.getByRole("button", { name: /查看 AI 行程/ }).click();
  await mobile.getByText("已定位到 AI 行程").waitFor();
  return "detail → itinerary";
});

await check("AI itinerary update flow", async () => {
  const input = mobile.getByRole("textbox", { name: "告诉 AI 如何改行程" });
  await input.fill("预算再省 50 元，少走一点");
  await mobile.getByRole("button", { name: "发送" }).click();
  await mobile.getByText("AI 已更新路线，变更已显示在行程中").waitFor();
  await mobile.getByRole("heading", { name: "龙华会免费创意市集" }).waitFor();
  return "AI change is visible in the route";
});

await check("lodging flow", async () => {
  await mobile.getByRole("button", { name: /住宿已加|加入住宿/ }).click();
  await mobile.getByRole("dialog", { name: "选择住宿" }).waitFor();
  await mobile.getByRole("button", { name: /西岸轻居酒店/ }).click();
  await mobile.getByText("住宿已加入行程与预算").waitFor();
  return "hotel selected";
});

await check("bill create flow", async () => {
  await mobile.getByRole("button", { name: /总账 ¥/ }).click();
  const billDialog = mobile.getByRole("dialog", { name: "行程账单与 AA" });
  await billDialog.waitFor();
  await mobile.getByRole("textbox", { name: "账单名称" }).fill("咖啡");
  await mobile.getByRole("spinbutton", { name: "金额" }).fill("36");
  await mobile.getByRole("button", { name: /添加/ }).click();
  await billDialog.getByText("咖啡", { exact: true }).waitFor();
  await billDialog.getByText("西岸轻居酒店", { exact: true }).waitFor();
  await billDialog.getByText(/4 人 AA：每人/).waitFor();
  await billDialog.getByRole("button", { name: "关闭" }).click();
  return "expense persisted in modal";
});

await check("memo create flow", async () => {
  await mobile.getByRole("button", { name: /备忘/ }).click();
  await mobile.getByRole("dialog", { name: "行程备忘" }).waitFor();
  await mobile.getByRole("textbox", { name: "新增备忘" }).fill("带充电宝");
  await mobile.getByRole("button", { name: /添加/ }).click();
  await mobile.getByText("带充电宝").waitFor();
  await mobile.getByRole("button", { name: "关闭" }).click();
  return "memo created";
});

await check("team join and exit state", async () => {
  await mobile.getByRole("button", { name: "组队", exact: true }).click();
  await mobile.getByText("找到同频的周末搭子").waitFor();
  await mobile.getByRole("button", { name: "申请加入" }).first().click();
  await mobile.getByRole("button", { name: /已加入/ }).waitFor();
  await mobile.getByRole("button", { name: "申请加入" }).click();
  await mobile.getByRole("button", { name: /审核中/ }).waitFor();
  await shot(mobile, "03-mobile-team-joined.png");
  return "joined first team + second application persisted";
});

await check("new team is published and visible", async () => {
  await mobile.getByRole("button", { name: /发起组队/ }).click();
  await mobile.getByRole("dialog", { name: "发起组队" }).waitFor();
  await mobile.getByLabel("标题").fill("周末同频小队");
  await mobile.getByRole("button", { name: "发布组队" }).click();
  await mobile.getByRole("heading", { name: "周末同频小队" }).waitFor();
  await mobile.getByRole("button", { name: /已发布/ }).waitFor();
  return "published team is visible in team list";
});

await check("check-in and guide publishing flows", async () => {
  await mobile.getByRole("button", { name: "旅迹", exact: true }).click();
  await mobile.getByRole("button", { name: /记录本次打卡/ }).click();
  await mobile.getByRole("dialog", { name: "记录打卡" }).waitFor();
  await mobile.getByRole("button", { name: "保存打卡" }).click();
  await mobile.getByText("打卡已保存到旅迹").waitFor();
  await mobile.getByRole("button", { name: /写一篇攻略/ }).click();
  await mobile.getByRole("dialog", { name: "发布攻略" }).waitFor();
  await mobile.getByRole("textbox", { name: "攻略正文" }).fill("路线顺畅，建议傍晚去滨江。交通与预算见正文。");
  await mobile.getByRole("button", { name: "发布攻略" }).click();
  await mobile.getByText("攻略已发布").waitFor();
  await mobile.getByText("刚刚发布 · 打卡").waitFor();
  await mobile.getByText("刚刚发布 · 攻略").waitFor();
  return "check-in + guide published and visible in journal";
});

await check("mobile has no horizontal overflow", async () => {
  const values = await mobile.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (values.scrollWidth > values.clientWidth + 1) throw new Error(JSON.stringify(values));
  return values;
});
await shot(mobile, "04-mobile-journal.png");

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
desktop.setDefaultTimeout(5000);
attachDiagnostics(desktop, "desktop");
await desktop.goto(baseURL, { waitUntil: "networkidle" });
await check("desktop two-pane itinerary renders", async () => {
  await desktop.getByText("AI 刚为你改了 3 处").waitFor();
  const columns = await desktop.locator(".itinerary-screen").evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  if (!columns || columns === "none") throw new Error(`gridTemplateColumns=${columns}`);
  return columns;
});
await check("desktop has no horizontal overflow", async () => {
  const values = await desktop.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (values.scrollWidth > values.clientWidth + 1) throw new Error(JSON.stringify(values));
  return values;
});
await shot(desktop, "05-desktop-itinerary.png");

await writeFile(join(outputDir, "report.json"), JSON.stringify(report, null, 2));
await browser.close();

const failed = report.checks.filter((item) => item.status === "failed");
console.log(JSON.stringify(report, null, 2));
const actionableRequestFailures = report.requestsFailed.filter((item) =>
  !(item.error === "net::ERR_ABORTED" && item.url.includes("/node_modules/.vite/deps/")),
);
if (failed.length || report.consoleErrors.length || report.pageErrors.length || actionableRequestFailures.length) process.exitCode = 1;
