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

const report = { baseURL, consoleErrors: [], pageErrors: [], requestsFailed: [], checks: [], screenshots: [] };

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

async function check(name, action) {
  try {
    const detail = await action();
    report.checks.push({ name, status: "passed", detail: detail ?? null });
  } catch (error) {
    report.checks.push({ name, status: "failed", detail: String(error) });
  }
}

async function shot(page, filename, fullPage = true) {
  const path = join(outputDir, filename);
  await page.screenshot({ path, fullPage, animations: "disabled" });
  report.screenshots.push(path);
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
mobile.setDefaultTimeout(6000);
attachDiagnostics(mobile, "mobile");
await mobile.goto(baseURL, { waitUntil: "networkidle" });
await mobile.evaluate(() => localStorage.clear());
await mobile.reload({ waitUntil: "networkidle" });

await check("image-led explore structure renders", async () => {
  const title = await mobile.locator(".common-header h1").innerText();
  if (title !== "这个周末，去哪里？") throw new Error(title);
  const kicker = await mobile.locator(".common-header small").innerText();
  if (!kicker.includes("上海 27° 晴")) throw new Error(kicker);
  await mobile.getByRole("textbox", { name: "搜索地点、活动或攻略" }).waitFor();
  await mobile.getByRole("button", { name: /筛选：3人，预算每人300元/ }).waitFor();
  await mobile.getByRole("heading", { name: "西岸美术馆" }).waitFor();
  await mobile.getByRole("heading", { name: "学姐的徐汇滨江日落机位" }).waitFor();
  const height = await mobile.locator(".destination-image").first().evaluate((element) => element.getBoundingClientRect().height);
  if (height < 220) throw new Error(`card image height=${height}`);
  return `weather in greeting + search/filter + ${height}px image-led cards`;
});

await check("shared navigation and independent AI entry render", async () => {
  for (const name of ["探索", "计划", "组队", "旅迹"]) {
    await mobile.getByRole("button", { name, exact: true }).waitFor();
  }
  await mobile.getByRole("button", { name: "打开 AI 助手" }).waitFor();
  const columns = await mobile.locator(".bottom-shell").evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  if (!columns || columns === "none") throw new Error(columns);
  return columns;
});
await shot(mobile, "20-home-v2-mobile.png", false);
await shot(mobile, "20-home-v2-mobile-full.png");

await check("profile and journey are merged while favorites remain reachable", async () => {
  await mobile.getByRole("button", { name: "进入我的旅迹" }).click();
  if (await mobile.locator(".common-header h1").innerText() !== "我的旅迹") throw new Error("merged journey title missing");
  for (const name of ["我的同行", "我的账单", "我的备忘", "记录本次打卡", "写一篇攻略"]) await mobile.getByRole("button", { name: new RegExp(name) }).waitFor();
  await mobile.getByRole("heading", { name: "最近旅迹" }).waitFor();
  await shot(mobile, "22-merged-journey-mobile.png", false);
  await mobile.getByRole("button", { name: "探索", exact: true }).click();
  await mobile.getByRole("button", { name: "查看收藏" }).click();
  if (await mobile.locator(".common-header h1").innerText() !== "我的收藏") throw new Error("favorites title missing");
  await mobile.getByRole("heading", { name: "西岸美术馆" }).waitFor();
  await mobile.getByRole("button", { name: "返回" }).click();
  return "avatar and journey tab share one page + favorites";
});

await check("search and category filters update the image feed", async () => {
  const search = mobile.getByRole("textbox", { name: "搜索地点、活动或攻略" });
  await search.fill("龙华");
  const searchCount = await mobile.locator(".destination-card").count();
  if (searchCount !== 1) throw new Error(`search cards=${searchCount}`);
  await mobile.getByRole("heading", { name: "龙华会周末市集" }).waitFor();
  await mobile.getByRole("button", { name: "清空搜索" }).click();
  await mobile.getByRole("button", { name: "用户攻略", exact: true }).click();
  await mobile.getByRole("heading", { name: "学生党西岸看展省钱攻略" }).waitFor();
  const count = await mobile.locator(".destination-card").count();
  if (count !== 2) throw new Error(`guide cards=${count}`);
  await mobile.getByRole("button", { name: "为你推荐", exact: true }).click();
  return { searchCount, guideCount: count };
});

await check("destination card opens a full secondary detail page", async () => {
  await mobile.getByRole("heading", { name: "西岸美术馆" }).click();
  await mobile.getByRole("button", { name: "返回探索页" }).waitFor();
  await mobile.getByRole("tab", { name: "攻略" }).click();
  await mobile.getByRole("heading", { name: "学生党出发提醒" }).waitFor();
  await mobile.getByRole("tab", { name: "评价" }).click();
  await mobile.getByText(/图片很好拍/).waitFor();
  await mobile.getByRole("tab", { name: "概览" }).click();
  await shot(mobile, "21-place-detail-mobile.png", false);
  await mobile.getByRole("button", { name: "返回探索页" }).click();
  return "image card → detail page → tabs → back";
});

await check("plan tab opens list before map detail", async () => {
  await mobile.getByRole("button", { name: "计划", exact: true }).click();
  if (await mobile.locator(".common-header h1").innerText() !== "我的周末计划") throw new Error("plan list title missing");
  await mobile.getByRole("button", { name: /西岸看展、龙华会与滨江日落/ }).waitFor();
  await shot(mobile, "13-reference-plan-list.png", false);
  await mobile.getByRole("button", { name: /西岸看展、龙华会与滨江日落/ }).click();
  if (await mobile.locator(".common-header h1").innerText() !== "徐汇滨江周末计划") throw new Error("plan detail title missing");
  await mobile.getByText("AI 刚为你改了 3 处").waitFor();
  await shot(mobile, "14-reference-plan-detail.png", false);
  await mobile.getByRole("button", { name: "返回" }).click();
  if (await mobile.locator(".common-header h1").innerText() !== "我的周末计划") throw new Error("return to list failed");
  return "list → map/timeline → list";
});

await check("floating AI assistant updates and opens the plan", async () => {
  await mobile.getByRole("button", { name: "打开 AI 助手" }).click();
  const assistant = mobile.getByRole("dialog", { name: "AI 周末助手" });
  await assistant.waitFor();
  await assistant.getByRole("button", { name: "预算再省 ¥50" }).click();
  await mobile.getByText("AI 已更新路线，变更已显示在行程中").waitFor();
  await mobile.getByRole("heading", { name: "龙华会免费创意市集" }).waitFor();
  return "AI assistant → visible route mutation";
});

await check("preferences, lodging, bills and memo stay connected", async () => {
  await mobile.getByRole("button", { name: /9月19日 周六/ }).click();
  const preferences = mobile.getByRole("dialog", { name: "调整推荐偏好" });
  await preferences.getByRole("button", { name: "4+ 人", exact: true }).click();
  await preferences.locator('input[type="range"]').fill("400");
  await preferences.getByRole("button", { name: "保存偏好" }).click();
  const summary = await mobile.getByRole("button", { name: /9月19日 周六/ }).innerText();
  if (!summary.includes("4人") || !summary.includes("¥400/人内")) throw new Error(summary);
  await mobile.getByRole("button", { name: /住宿已加|加入住宿/ }).click();
  const stay = mobile.getByRole("dialog", { name: "选择住宿" });
  await stay.getByRole("button", { name: /西岸轻居酒店/ }).click();
  await mobile.getByRole("button", { name: /总账 ¥/ }).click();
  const bills = mobile.getByRole("dialog", { name: "行程账单与 AA" });
  await bills.getByText("西岸轻居酒店", { exact: true }).waitFor();
  await bills.getByText(/4 人 AA：每人/).waitFor();
  await bills.getByRole("button", { name: "关闭" }).click();
  await mobile.getByRole("button", { name: /备忘/ }).click();
  const memo = mobile.getByRole("dialog", { name: "行程备忘" });
  await memo.getByRole("textbox", { name: "新增备忘" }).fill("带充电宝");
  await memo.getByRole("button", { name: /添加/ }).click();
  await memo.getByText("带充电宝").waitFor();
  await memo.getByRole("button", { name: "关闭" }).click();
  return "preferences + lodging + AA + memo";
});

await check("team creation and application remain closed-loop", async () => {
  await mobile.getByRole("button", { name: "组队", exact: true }).click();
  await mobile.getByRole("button", { name: "申请加入" }).first().click();
  await mobile.getByRole("button", { name: /已加入/ }).waitFor();
  await mobile.getByRole("button", { name: /发起组队/ }).click();
  const team = mobile.getByRole("dialog", { name: "发起组队" });
  await team.getByLabel("标题").fill("周末同频小队");
  await team.getByRole("button", { name: "发布组队" }).click();
  await mobile.getByRole("heading", { name: "周末同频小队" }).waitFor();
  return "join + publish visible team";
});

await check("merged journey page publishes visible check-in and guide", async () => {
  await mobile.getByRole("button", { name: "旅迹", exact: true }).click();
  if (await mobile.locator(".common-header h1").innerText() !== "我的旅迹") throw new Error("merged page missing");
  await mobile.getByRole("button", { name: /我的账单/ }).waitFor();
  await mobile.getByRole("button", { name: /记录本次打卡/ }).click();
  const checkin = mobile.getByRole("dialog", { name: "记录打卡" });
  await checkin.getByRole("button", { name: "保存打卡" }).click();
  await mobile.getByRole("button", { name: /写一篇攻略/ }).click();
  const guide = mobile.getByRole("dialog", { name: "发布攻略" });
  await guide.getByRole("textbox", { name: "攻略正文" }).fill("路线顺畅，建议傍晚去滨江。");
  await guide.getByRole("button", { name: "发布攻略" }).click();
  await mobile.getByText("刚刚发布 · 打卡").waitFor();
  await mobile.getByText("刚刚发布 · 攻略").waitFor();
  await shot(mobile, "22-merged-journey-published-mobile.png", false);
  return "profile tools + published items visible on one page";
});

await check("mobile has named controls and no horizontal overflow", async () => {
  const state = await mobile.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    unnamed: Array.from(document.querySelectorAll("button")).filter((button) => {
      const style = getComputedStyle(button);
      if (style.display === "none" || style.visibility === "hidden") return false;
      return !(button.getAttribute("aria-label") || button.textContent?.trim());
    }).length,
  }));
  if (state.scrollWidth > state.clientWidth + 1 || state.unnamed) throw new Error(JSON.stringify(state));
  return state;
});

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
desktop.setDefaultTimeout(6000);
attachDiagnostics(desktop, "desktop");
await desktop.goto(baseURL, { waitUntil: "networkidle" });
await desktop.evaluate(() => localStorage.clear());
await desktop.reload({ waitUntil: "networkidle" });

await check("desktop adapts the image-led home and place detail", async () => {
  await desktop.getByRole("textbox", { name: "搜索地点、活动或攻略" }).waitFor();
  const columns = await desktop.locator(".explore-feed").evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  if (!columns || columns.split(" ").length < 2) throw new Error(columns);
  await shot(desktop, "23-home-v2-desktop.png", false);
  await desktop.locator(".destination-card").first().click();
  await desktop.getByRole("heading", { name: "西岸美术馆" }).waitFor();
  await desktop.getByRole("button", { name: "加入周末计划" }).waitFor();
  await shot(desktop, "24-place-detail-desktop.png", false);
  await desktop.getByRole("button", { name: "返回探索页" }).click();
  return columns;
});

await check("desktop keeps the same three-part hierarchy", async () => {
  await desktop.getByRole("heading", { name: "西岸美术馆" }).waitFor();
  await desktop.getByRole("button", { name: "打开 AI 助手" }).waitFor();
  await desktop.getByRole("button", { name: "计划", exact: true }).click();
  await desktop.getByRole("button", { name: /西岸看展、龙华会与滨江日落/ }).click();
  const columns = await desktop.locator(".itinerary-screen").evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  if (!columns || columns === "none") throw new Error(columns);
  return columns;
});
await shot(desktop, "25-plan-detail-desktop.png", false);

await check("desktop has no horizontal overflow", async () => {
  const state = await desktop.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  if (state.scrollWidth > state.clientWidth + 1) throw new Error(JSON.stringify(state));
  return state;
});

await writeFile(join(outputDir, "report.json"), JSON.stringify(report, null, 2));
await browser.close();

const failures = report.checks.filter((item) => item.status === "failed");
const actionableRequestFailures = report.requestsFailed.filter((item) =>
  !(item.error === "net::ERR_ABORTED" && item.url.includes("/node_modules/.vite/deps/")),
);
console.log(JSON.stringify(report, null, 2));
if (failures.length || report.consoleErrors.length || report.pageErrors.length || actionableRequestFailures.length) process.exitCode = 1;
