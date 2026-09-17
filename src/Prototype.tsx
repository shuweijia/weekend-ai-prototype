import { useEffect, useRef, useState } from "react";
import {
  BackpackIcon, BookmarkIcon, CalendarIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon,
  ChevronRightIcon, ClockIcon, Cross2Icon, FileTextIcon, GearIcon, GlobeIcon,
  GroupIcon, HomeIcon, MagicWandIcon, MagnifyingGlassIcon, MixerHorizontalIcon,
  PaperPlaneIcon, Pencil2Icon, PersonIcon, PlusIcon, RocketIcon,
  SewingPinFilledIcon, Share1Icon, StarFilledIcon, SunIcon,
} from "@radix-ui/react-icons";
import { KeyboardInput, MobileScroll, useKeyboardInsets } from "./mobile";

type Tab = "explore" | "itinerary" | "team" | "journal";
type Page = Tab | "favorites" | "activity" | "companions" | "bills" | "memos";
type PlanView = "overview" | "saturday" | "sunday";
type ModalName = "preferences" | "stay" | "bills" | "memo" | "team" | "checkin" | "guide" | "manualPlan" | null;
type Stop = { id: number; name: string; time: string; tag: string; image: string; cost: number };
type Expense = { id: number; title: string; amount: number; payer: string };
type Memo = { id: number; text: string; done: boolean };
type CustomTeam = { id: number; name: string; meta: string; note: string };
type JournalEntry = { id: number; type: "checkin" | "guide"; title: string; note: string; activityId?: number; image?: string };
type GuidePreview = { id: number; activityId: number; title: string; author: string; excerpt: string; note: string };
type TeamListing = { id: number; activityId: number; name: string; time: string; meeting: string; memberCount: number; capacity: number; note: string; host: string; tags: string[]; custom?: boolean };

const activities = [
  { id: 1, name: "西岸美术馆", type: "展览", time: "10:00–12:00", cost: 80, image: "/assets/weekend/west-bund-museum.png", reason: "室内避暑 · 艺术偏好 94%", distance: "地铁 32 分钟", location: "上海 · 徐汇滨江", address: "龙腾大道 2600 号", description: "在黄浦江畔慢慢看一场展，把午后的光影和艺术都留给自己。学生证可享优惠，馆内动线舒适，也适合第一次约见的周末搭子。" },
  { id: 2, name: "龙华会周末市集", type: "市集", time: "12:30–14:00", cost: 58, image: "/assets/weekend/longhua-hui.png", reason: "午餐顺路 · 适合 3 人", distance: "步行 900 米", location: "上海 · 龙华会", address: "龙华路 2778 号", description: "从手作摊位逛到独立咖啡，午餐和小众好物一次解决。市集就在地铁上盖，雨天也能轻松抵达。" },
  { id: 3, name: "徐汇滨江日落散步", type: "城市漫步", time: "17:30–19:00", cost: 0, image: "/assets/weekend/xuhui-riverside.png", reason: "AI 已避开高温时段", distance: "骑行 1.8 公里", location: "上海 · 徐汇滨江", address: "龙腾大道滨江步道", description: "沿着江边从艺术区走到日落观景台，晚风、骑行和城市天际线都刚刚好。路线平缓，新手也能自在完成。" },
  { id: 5, name: "衡山路街区早午餐", type: "早午餐", time: "10:30–12:00", cost: 72, image: "/assets/weekend/longhua-hui.png", reason: "周日上午轻松出发", distance: "地铁 18 分钟", location: "上海 · 衡复风貌区", address: "衡山路 8 号", description: "从一顿松弛的早午餐开始周日，在梧桐街区里慢慢醒来，为接下来的城市漫步补充体力。" },
  { id: 6, name: "武康路建筑漫步", type: "城市漫步", time: "13:00–15:00", cost: 0, image: "/assets/weekend/xuhui-riverside.png", reason: "树荫路线 · 少走回头路", distance: "步行 2.4 公里", location: "上海 · 武康路", address: "武康路历史文化名街", description: "沿着武康路和安福路看老建筑、逛小店，路线以林荫路为主，适合边走边拍。" },
  { id: 7, name: "上海图书馆东馆", type: "文化", time: "15:30–17:30", cost: 0, image: "/assets/weekend/west-bund-museum.png", reason: "午后室内避暑", distance: "地铁 25 分钟", location: "上海 · 浦东新区", address: "合欢路 300 号", description: "把周末最后一站留给安静的阅读空间，在开阔明亮的建筑里休息，也为两天行程自然收尾。" },
];
const initialStops: Stop[] = activities.slice(0, 3).map((a) => ({ id: a.id, name: a.name, time: a.time, tag: a.type, image: a.image, cost: a.cost }));
const sundayStops: Stop[] = activities.slice(3).map((a) => ({ id: a.id, name: a.name, time: a.time, tag: a.type, image: a.image, cost: a.cost }));
const resolveStopImage = (stop: Stop) => activities.find((activity) => activity.id === stop.id)?.image || stop.image || "/assets/weekend/xuhui-riverside.png";
const repairBrokenImage = (event: React.SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === "true") return;
  image.dataset.fallbackApplied = "true";
  image.src = "/assets/weekend/xuhui-riverside.png";
};
const initialExpenses: Expense[] = [
  { id: 1, title: "西岸美术馆门票", amount: 240, payer: "我" },
  { id: 2, title: "共享单车", amount: 18, payer: "林夕" },
  { id: 3, title: "市集午餐", amount: 126, payer: "陈默" },
];
const hotelPrices: Record<string, number> = { "徐家汇青旅": 129, "西岸轻居酒店": 238 };
const communityGuides: GuidePreview[] = [
  { id: 101, activityId: 3, title: "沿江散步，等一场橘子味的日落", author: "小林同学", excerpt: "从西岸美术馆一路走到日晖港桥，17:40 抵达机位刚刚好。", note: "建议从龙腾大道出发，沿江向北慢慢走。日落前 20 分钟抵达日晖港桥，桥下和草坪都很出片；返程从龙华中路站坐地铁，少走回头路。" },
  { id: 102, activityId: 1, title: "学生党西岸看展省钱攻略", author: "阿默", excerpt: "学生证、错峰入馆和滨江顺路玩法一次说清，人均不到百元。", note: "提前在官方渠道预约，带学生证现场核验。上午十点入馆人更少，看完主展后从临江出口离开，可以直接衔接滨江步道和龙华会市集。" },
  { id: 103, activityId: 2, title: "龙华会逛吃不踩雷路线", author: "栗子", excerpt: "先吃再逛、三家摊位实测，雨天也能舒服走完。", note: "地铁口先去二层轻食区错峰午餐，再从南区手作摊一路逛到咖啡快闪。大部分区域有顶棚，临时下雨也不用改计划。" },
];
const baseTeams: TeamListing[] = [
  { id: 201, activityId: 1, name: "西岸看展搭子", time: "周六 09:40", meeting: "龙华中路地铁站 6 号口", memberCount: 2, capacity: 4, note: "摄影系学生，慢慢逛不赶时间，结束后一起去滨江吹风。", host: "林夕", tags: ["学生友好", "拍照", "不赶时间"] },
  { id: 202, activityId: 3, name: "徐汇滨江日落骑行小队", time: "周六 16:50", meeting: "西岸美术馆南门", memberCount: 3, capacity: 5, note: "新手友好，均速 12km/h，自备单车或现场扫码。", host: "陈默", tags: ["骑行", "日落", "新手友好"] },
];

function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : initial; }
    catch { return initial; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)); }, [key, state]);
  return [state, setState] as const;
}

export default function Prototype({ framedPreview = false }: { framedPreview?: boolean }) {
  const { bottomInset } = useKeyboardInsets();
  const [tab, setTab] = usePersistentState<Tab>("weekend-tab", "explore");
  const [page, setPage] = useState<Page>(tab);
  const [detailOrigin, setDetailOrigin] = useState<Page>("explore");
  const [planDetail, setPlanDetail] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [modal, setModal] = useState<ModalName>(null);
  const [selectedActivity, setSelectedActivity] = useState(activities[0]);
  const [selectedGuide, setSelectedGuide] = useState<GuidePreview | null>(communityGuides[0]);
  const [selectedTeam, setSelectedTeam] = useState<TeamListing | null>(null);
  const [stops, setStops] = usePersistentState<Stop[]>("weekend-stops", initialStops);
  const [expenses, setExpenses] = usePersistentState<Expense[]>("weekend-expenses", initialExpenses);
  const [memos, setMemos] = usePersistentState<Memo[]>("weekend-memos", [
    { id: 1, text: "带学生证，美术馆可享优惠", done: false },
    { id: 2, text: "17:00 前到滨江占日落机位", done: false },
    { id: 3, text: "给相机充电", done: true },
  ]);
  const [hotel, setHotel] = usePersistentState("weekend-hotel", "徐家汇青旅");
  const [joined, setJoined] = usePersistentState("weekend-joined", false);
  const [saved, setSaved] = usePersistentState<number[]>("weekend-saved", [1]);
  const [aiText, setAiText] = useState("");
  const [aiWorking, setAiWorking] = useState(false);
  const [toast, setToast] = useState("");
  const [guides, setGuides] = usePersistentState("weekend-guides", 2);
  const [checkins, setCheckins] = usePersistentState("weekend-checkins", 6);
  const [weatherAlert, setWeatherAlert] = useState(true);
  const [routeReady, setRouteReady] = usePersistentState("weekend-route-ready", true);
  const [budget, setBudget] = usePersistentState("weekend-budget", 300);
  const [people, setPeople] = usePersistentState("weekend-people", 3);
  const [likes, setLikes] = usePersistentState<string[]>("weekend-likes", ["展览", "市集", "城市漫步"]);
  const [aiNote, setAiNote] = useState("户外散步移到傍晚，少走 1.8 km");
  const [customTeams, setCustomTeams] = usePersistentState<CustomTeam[]>("weekend-custom-teams", []);
  const [journalEntries, setJournalEntries] = usePersistentState<JournalEntry[]>("weekend-journal-entries", []);
  const total = expenses.reduce((sum, item) => sum + item.amount, 0) + (hotelPrices[hotel] ?? 0);
  useEffect(() => {
    setStops((current) => {
      const repaired = current.map((stop) => ({ ...stop, image: resolveStopImage(stop) }));
      return repaired.some((stop, index) => stop.image !== current[index]?.image) ? repaired : current;
    });
  }, [setStops]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [page, planDetail]);
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2200); };
  const applyAi = (prompt = aiText) => {
    if (!prompt.trim()) return;
    setAiWorking(true);
    window.setTimeout(() => {
      const normalized = prompt.toLowerCase();
      if (normalized.includes("下雨") || normalized.includes("室内")) {
        setStops((current) => current.map((stop) => stop.id === 3 ? { ...stop, name: "西岸艺术中心雨天特展", time: "16:30–18:00", tag: "雨天室内", image: "/assets/weekend/west-bund-museum.png", cost: 60 } : stop));
        setAiNote("已把滨江散步替换为室内特展，雨天也能顺路玩");
      } else if (normalized.includes("省") || normalized.includes("预算")) {
        setStops((current) => current.map((stop) => stop.id === 2 ? { ...stop, name: "龙华会免费创意市集", cost: 0 } : stop));
        setAiNote("已替换 1 个免费活动，预计每人再省 ¥58");
      } else if (normalized.includes("咖啡")) {
        setStops((current) => current.some((stop) => stop.id === 4) ? current : [...current, { id: 4, name: "滨江咖啡快闪", time: "15:30–16:20", tag: "咖啡", image: "/assets/weekend/xuhui-riverside.png", cost: 32 }]);
        setAiNote("已在市集与滨江之间加入咖啡休息，不绕路");
      } else {
        setStops((current) => current.map((stop) => stop.id === 2 ? { ...stop, time: "13:00–14:30" } : stop.id === 3 ? { ...stop, time: "18:00–19:30" } : stop));
        setAiNote("已减少步行并优先衔接地铁，日落顺延 30 分钟");
      }
      setWeatherAlert(true); setRouteReady(true); setAiWorking(false); setAiText("");
      showToast("AI 已更新路线，变更已显示在行程中");
    }, 650);
  };
  const navigate = (next: Tab) => { setTab(next); setPage(next); };
  const openActivity = (activity: typeof activities[number], origin: Page, guide: GuidePreview | null = null, team: TeamListing | null = null) => { setSelectedActivity(activity); setSelectedGuide(guide); setSelectedTeam(team); setDetailOrigin(origin); setPage("activity"); };
  const addSelectedToPlan = () => { setStops((current) => current.some((stop) => stop.id === selectedActivity.id) ? current : [...current, { id: selectedActivity.id, name: selectedActivity.name, time: selectedActivity.time, tag: selectedActivity.type, image: selectedActivity.image, cost: selectedActivity.cost }]); navigate("itinerary"); setPlanDetail(true); showToast("地点已加入计划，AI 已重新排好路线"); };
  const pageTitles: Record<Page, { kicker: string; title: string }> = {
    explore: { kicker: "下午好，佳佳 · 上海 27° 晴", title: "这个周末，去哪里？" },
    itinerary: { kicker: "下午好，佳佳", title: planDetail ? "徐汇滨江周末计划" : "我的周末计划" },
    team: { kicker: "下午好，佳佳", title: "找到同频的周末搭子" },
    journal: { kicker: "周末探索家 · 12 级", title: "我的旅迹" },
    favorites: { kicker: `已收藏 ${saved.length} 个灵感`, title: "我的收藏" },
    activity: { kicker: selectedActivity.location, title: selectedActivity.name },
    companions: { kicker: "一起出发过的人", title: "我的同行记录" },
    bills: { kicker: "按每次出行归档", title: "我的账单" },
    memos: { kicker: "每段旅程都有准备", title: "我的备忘" },
  };
  const mainContent = <main className="app-main">
      {page !== "activity" && !(page === "itinerary" && planDetail) && <CommonHeader {...pageTitles[page]} page={page} detail={page === "itinerary" && planDetail} onProfile={() => navigate("journal")} onFavorites={() => setPage("favorites")} onBack={() => { if (planDetail) setPlanDetail(false); else setPage(tab); }} />}
      {page === "explore" && <ExploreScreen onOpen={(activity, guide) => openActivity(activity, "explore", guide)} onPlan={() => { setRouteReady(true); navigate("itinerary"); setPlanDetail(true); showToast("AI 行程已生成"); }} onPreferences={() => setModal("preferences")} saved={saved} setSaved={setSaved} budget={budget} people={people} likes={likes} entries={journalEntries} />}
      {page === "itinerary" && !planDetail && <PlanListScreen stops={stops} hotel={hotel} people={people} budget={budget} onOpen={() => setPlanDetail(true)} onCreate={() => setModal("manualPlan")} />}
      {page === "itinerary" && planDetail && <InteractiveItineraryScreen stops={stops} setStops={setStops} expenses={expenses} memos={memos} total={total} weatherAlert={weatherAlert} setWeatherAlert={setWeatherAlert} openModal={setModal} routeReady={routeReady} onExplore={() => navigate("explore")} showToast={showToast} budget={budget} people={people} aiNote={aiNote} onBack={() => setPlanDetail(false)} onOpenAi={() => setAiOpen(true)} onOpenStop={(stop) => openActivity(activities.find((activity) => activity.id === stop.id) ?? activities[0], "itinerary")} />}
      {page === "team" && <TeamScreen joined={joined} openCreate={() => setModal("team")} customTeams={customTeams} onOpen={(team) => openActivity(activities.find((activity) => activity.id === team.activityId) ?? activities[0], "team", communityGuides.find((guide) => guide.activityId === team.activityId) ?? null, team)} />}
      {page === "journal" && <JournalScreen checkins={checkins} guides={guides} openCheckin={() => setModal("checkin")} openGuide={() => setModal("guide")} saved={saved.length} showToast={showToast} entries={journalEntries} onPreferences={() => setModal("preferences")} onCompanions={() => setPage("companions")} onBills={() => setPage("bills")} onMemo={() => setPage("memos")} />}
      {page === "companions" && <CompanionHistoryScreen joined={joined} customTeams={customTeams} onOpen={(team) => openActivity(activities.find((activity) => activity.id === team.activityId) ?? activities[0], "companions", communityGuides.find((guide) => guide.activityId === team.activityId) ?? null, team)} />}
      {page === "bills" && <BillHistoryScreen expenses={expenses} hotel={hotel} people={people} onOpenCurrent={() => setModal("bills")} />}
      {page === "memos" && <MemoHistoryScreen memos={memos} onOpenCurrent={() => setModal("memo")} />}
      {page === "favorites" && <FavoritesScreen saved={saved} onOpen={(activity) => openActivity(activity, "favorites")} setSaved={setSaved} />}
      {page === "activity" && <ActivityDetailScreen activity={selectedActivity} guide={selectedGuide} team={selectedTeam} checkins={journalEntries.filter((entry) => entry.type === "checkin" && entry.activityId === selectedActivity.id)} joined={joined} setJoined={setJoined} showToast={showToast} saved={saved} setSaved={setSaved} onBack={() => setPage(detailOrigin === "activity" ? "explore" : detailOrigin)} />}
    </main>;
  return <div className="weekend-app" data-testid="weekend-app">
    {framedPreview ? <MobileScroll key={`${page}-${planDetail ? "detail" : "list"}`} className="prototype-mobile-scroll">{mainContent}</MobileScroll> : mainContent}
    {page === "itinerary" && planDetail && routeReady && stops.length > 0 && <div className="ai-composer itinerary-ai-dock" style={{ bottom: `${bottomInset + 12}px` }}><div><MagicWandIcon /><KeyboardInput aria-label="告诉 AI 如何改行程" value={aiText} onChange={(event) => setAiText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applyAi(); }} placeholder="告诉 AI 怎么调整这份计划…" /><button aria-label="发送" disabled={!aiText.trim() || aiWorking} onClick={() => applyAi()}>{aiWorking ? <span className="spinner" /> : <PaperPlaneIcon />}</button></div></div>}
    {page === "activity" && <div className="activity-plan-bar"><div><small>预计花费</small><b>{selectedActivity.cost ? `¥${selectedActivity.cost}` : "免费"}</b></div><button onClick={addSelectedToPlan}><PlusIcon /> 加入周末计划</button></div>}
    {page !== "activity" && page !== "companions" && page !== "bills" && page !== "memos" && !(page === "itinerary" && planDetail) && <UnifiedNav tab={tab} setTab={navigate} onAi={() => setAiOpen(true)} />}
    {aiOpen && <AiAssistant close={() => setAiOpen(false)} onApply={(prompt) => { applyAi(prompt); navigate("itinerary"); setPlanDetail(true); setAiOpen(false); }} />}
    <AppModal name={modal} close={() => setModal(null)} hotel={hotel} setHotel={setHotel} expenses={expenses} setExpenses={setExpenses} memos={memos} setMemos={setMemos} joined={joined} setJoined={setJoined} setCheckins={setCheckins} setGuides={setGuides} setTab={(next) => { navigate(next); if (next === "itinerary") setPlanDetail(true); }} showToast={showToast} budget={budget} setBudget={setBudget} people={people} setPeople={setPeople} likes={likes} setLikes={setLikes} setCustomTeams={setCustomTeams} setJournalEntries={setJournalEntries} setStops={setStops} setRouteReady={setRouteReady} />
    {toast && <div className="toast" role="status"><CheckIcon />{toast}</div>}
  </div>;
}

function UnifiedNav({ tab, setTab, onAi }: { tab: Tab; setTab: (tab: Tab) => void; onAi: () => void }) {
  const items: [Tab, string, React.ReactNode][] = [["explore", "探索", <MagnifyingGlassIcon />], ["itinerary", "计划", <CalendarIcon />], ["team", "组队", <GroupIcon />], ["journal", "旅迹", <GlobeIcon />]];
  return <div className="bottom-shell"><nav className="mobile-nav" aria-label="主导航">{items.map(([id, label, icon]) => <button className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}>{icon}<span>{label}</span></button>)}</nav><button className="ai-fab" aria-label="打开 AI 助手" onClick={onAi}><MagicWandIcon /></button></div>;
}

function CommonHeader({ kicker, title, page, detail, onProfile, onFavorites, onBack }: { kicker: string; title: string; page: Page; detail: boolean; onProfile: () => void; onFavorites: () => void; onBack: () => void }) {
  const isSubpage = page === "favorites" || page === "companions" || page === "bills" || page === "memos" || detail;
  return <header className="common-header"><button className="profile-button" aria-label={isSubpage ? "返回" : "进入我的旅迹"} onClick={isSubpage ? onBack : onProfile}>{isSubpage ? <ChevronLeftIcon /> : <span className="avatar">佳</span>}</button><div><small>{kicker}</small><h1>{title}</h1></div><button className={`favorite-button ${page === "favorites" ? "active" : ""}`} aria-label="查看收藏" onClick={onFavorites}><BookmarkIcon /></button></header>;
}

function PlanListScreen({ stops, hotel, people, budget, onOpen, onCreate }: { stops: Stop[]; hotel: string; people: number; budget: number; onOpen: () => void; onCreate: () => void }) {
  return <section className="plan-list-screen screen-shell"><div className="plan-list-toolbar"><div><span className="eyebrow"><MagicWandIcon /> AI 已为你排好</span><h2>周末计划</h2></div><button className="primary-button compact" onClick={onCreate}><PlusIcon /> 新计划</button></div><button className="plan-card" onClick={onOpen}><div className="plan-card-cover"><img src="/assets/weekend/xuhui-riverside.png" alt="徐汇滨江周末计划" /><span>本周六 · 上海</span></div><div className="plan-card-copy"><div><small>9月19日 · {people} 人 · ¥{budget}/人内</small><h3>西岸看展、龙华会与滨江日落</h3><p>{stops.length} 个地点 · {hotel ? `住 ${hotel}` : "当天往返"}</p></div><div className="plan-route-preview">{stops.slice(0, 3).map((stop, index) => <span key={stop.id}><b>{index + 1}</b>{stop.name}</span>)}</div><footer><span><SunIcon /> 晴 27° · AI 已避开高温</span><strong>查看地图与时间线 <ChevronRightIcon /></strong></footer></div></button><article className="plan-card plan-card-past"><div className="plan-card-cover"><img src="/assets/weekend/west-bund-museum.png" alt="八月看展计划" /><span>已完成</span></div><div className="plan-card-copy"><div><small>8月29日 · 上海</small><h3>西岸艺术一日漫游</h3><p>2 个地点 · 实际花费 ¥168</p></div><footer><span><CheckIcon /> 已完成并打卡</span><strong>回看旅迹</strong></footer></div></article></section>;
}

function FavoritesScreen({ saved, onOpen, setSaved }: { saved: number[]; onOpen: (activity: typeof activities[number]) => void; setSaved: React.Dispatch<React.SetStateAction<number[]>> }) {
  const items = activities.filter((activity) => saved.includes(activity.id));
  return <section className="favorites-screen screen-shell">{items.length ? <div className="favorite-list">{items.map((activity) => <article key={activity.id}><button className="favorite-card-main" onClick={() => onOpen(activity)}><img src={activity.image} alt={activity.name} /><span><small>{activity.type} · {activity.time}</small><h3>{activity.name}</h3><p>{activity.reason}</p></span><ChevronRightIcon /></button><button className="favorite-remove" aria-label={`取消收藏 ${activity.name}`} onClick={() => setSaved((ids) => ids.filter((id) => id !== activity.id))}><BookmarkIcon /></button></article>)}</div> : <div className="empty-plan"><span><BookmarkIcon /></span><h2>还没有收藏</h2><p>在探索页点亮收藏，这里会替你收好周末灵感。</p></div>}</section>;
}

function AiAssistant({ close, onApply }: { close: () => void; onApply: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [sentPrompt, setSentPrompt] = useState("帮我确认一下后续的交通安排");
  const [thinking, setThinking] = useState(false);
  const send = (value: string) => {
    if (!value.trim()) return;
    setSentPrompt(value.trim()); setPrompt(""); setThinking(true);
    window.setTimeout(() => setThinking(false), 700);
  };
  return <section className="ai-page" role="dialog" aria-modal="true" aria-label="AI 周末助手"><header className="ai-page-header"><button aria-label="关闭 AI 助手" onClick={close}><Cross2Icon /></button><button className="ai-plan-title">徐汇滨江周末计划 <ChevronRightIcon /></button><button aria-label="更多 AI 选项"><MixerHorizontalIcon /></button></header><div className="ai-conversation"><div className="ai-user-bubble"><CalendarIcon />{sentPrompt}</div>{thinking ? <div className="ai-reading"><MagicWandIcon /><span>正在读取行程内容…</span></div> : <><div className="ai-reading"><MagicWandIcon /><span>已读取当前行程</span><CheckIcon /></div><article className="ai-answer"><p>好的，我结合你计划里的地点与时间，把后续交通梳理了一下：</p><h3>地铁与步行衔接</h3><p>西岸美术馆结束后步行约 12 分钟到龙华中路站；前往龙华会建议搭乘 12 号线，出站后步行约 6 分钟。</p><h3>滨江日落段</h3><p>16:50 从龙华会出发，骑行约 18 分钟抵达徐汇滨江。AI 已预留 20 分钟机动时间，遇到高温可改乘网约车。</p><div className="ai-change-card"><span><CheckIcon /> 可直接应用</span><b>少走 1.8km · 日落顺延 30 分钟</b><button onClick={() => onApply(sentPrompt)}>应用到计划</button></div></article></>}</div><div className="ai-suggestions"><button onClick={() => send("如果下雨，全部改成室内")}>雨天备选</button><button onClick={() => send("预算再省 50 元")}>再省 ¥50</button><button onClick={() => send("加入一家咖啡馆")}>加咖啡馆</button></div><form className="ai-page-composer" onSubmit={(event) => { event.preventDefault(); send(prompt); }}><button type="button" aria-label="添加附件"><PlusIcon /></button><input aria-label="发消息或按住说话" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="发消息或按住说话" /><button aria-label="发送给 AI" disabled={!prompt.trim()}><PaperPlaneIcon /></button></form><small className="ai-disclaimer">内容由 AI 生成，请核对出行信息</small></section>;
}

function ExploreScreen({ onOpen, onPlan, onPreferences, saved, setSaved, budget, people, likes, entries }: { onOpen: (activity: typeof activities[number], guide: GuidePreview) => void; onPlan: () => void; onPreferences: () => void; saved: number[]; setSaved: React.Dispatch<React.SetStateAction<number[]>>; budget: number; people: number; likes: string[]; entries: JournalEntry[] }) {
  const [filter, setFilter] = useState("为你推荐");
  const [query, setQuery] = useState("");
  const filters = ["为你推荐", "展览", "市集", "城市漫步", "免费"];
  const publishedGuides: GuidePreview[] = entries.filter((entry) => entry.type === "guide").map((entry) => ({ id: entry.id, activityId: entry.activityId ?? 1, title: entry.title, author: "佳佳", excerpt: entry.note || "刚刚发布的周末攻略", note: entry.note || "这是一篇刚刚发布的周末攻略。" }));
  const guideItems = [...publishedGuides, ...communityGuides].map((guide) => ({ activity: activities.find((item) => item.id === guide.activityId) ?? activities[0], guide }));
  const normalizedQuery = query.trim().toLowerCase();
  const feed = guideItems.filter(({ activity, guide }) => {
    const matchesCategory = filter === "为你推荐" || filter === activity.type || (filter === "免费" && activity.cost === 0);
    const matchesQuery = !normalizedQuery || [guide.title, guide.author, guide.excerpt, activity.name, activity.type, activity.location].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesCategory && matchesQuery;
  });
  return <section className="explore-screen screen-shell"><div className="explore-search-row"><label className="explore-search"><MagnifyingGlassIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="搜索地点、活动或攻略" placeholder="搜索地点、活动或攻略" />{query && <button aria-label="清空搜索" onClick={() => setQuery("")}><Cross2Icon /></button>}</label><button className="explore-filter" aria-label={`筛选：${people}人，预算每人${budget}元`} onClick={onPreferences}><MixerHorizontalIcon /><span><b>{people} 人</b><small>¥{budget}/人</small></span></button></div><div className="chip-row explore-tabs" aria-label="目的地游玩类型">{filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="section-heading explore-heading"><div><h2>{query ? `“${query}”的结果` : "大家刚去过"}</h2><p>{likes.slice(0, 2).join("、")}等偏好 · 真实用户分享</p></div><button onClick={onPlan}>AI 排成路线 <ChevronRightIcon /></button></div>{feed.length ? <div className="activity-grid explore-feed">{feed.map(({ activity, guide }) => <article className="destination-card" role="button" tabIndex={0} aria-label={`查看攻略：${guide.title}`} key={guide.id} onClick={() => onOpen(activity, guide)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(activity, guide); } }}><div className="destination-image"><img src={activity.image} alt={activity.name} draggable="false" /><div className="destination-topline"><span>{activity.type}</span><button aria-label={saved.includes(activity.id) ? `取消收藏${guide.title}` : `收藏${guide.title}`} onClick={(event) => { event.stopPropagation(); setSaved((ids) => ids.includes(activity.id) ? ids.filter((id) => id !== activity.id) : [...ids, activity.id]); }}><BookmarkIcon className={saved.includes(activity.id) ? "saved" : ""} /></button></div><div className="destination-overlay"><span><SewingPinFilledIcon /> {activity.location} · {activity.name}</span><h3>{guide.title}</h3><p>{guide.excerpt}</p></div></div><footer><span><PersonIcon /> @{guide.author} 分享</span><strong>查看攻略 <ChevronRightIcon /></strong></footer></article>)}</div> : <div className="explore-empty"><MagnifyingGlassIcon /><h3>没有找到相关地点</h3><p>试试搜索“滨江”或切换其他分类。</p><button onClick={() => { setQuery(""); setFilter("为你推荐"); }}>查看全部推荐</button></div>}</section>;
}

function ActivityDetailScreen({ activity, guide, team, checkins, joined, setJoined, showToast, saved, setSaved, onBack }: { activity: typeof activities[number]; guide: GuidePreview | null; team: TeamListing | null; checkins: JournalEntry[]; joined: boolean; setJoined: (value: boolean) => void; showToast: (message: string) => void; saved: number[]; setSaved: React.Dispatch<React.SetStateAction<number[]>>; onBack: () => void }) {
  const matchingGuide = guide ?? communityGuides.find((item) => item.activityId === activity.id) ?? communityGuides[0];
  const matchingTeam = team ?? baseTeams.find((item) => item.activityId === activity.id) ?? null;
  const [section, setSection] = useState<"overview" | "guide" | "team" | "reviews">("overview");
  useEffect(() => setSection("overview"), [activity.id, guide?.id, team?.id]);
  const isSaved = saved.includes(activity.id);
  const checkinPhotos = checkins.filter((entry) => entry.image).map((entry) => entry.image as string);
  const gallery = [...checkinPhotos, activity.image, ...activities.filter((item) => item.id !== activity.id).map((item) => item.image)];
  return <section className="activity-detail-screen"><div className="activity-detail-nav"><button aria-label="返回上一页" onClick={onBack}><ChevronLeftIcon /></button><button aria-label={isSaved ? "取消收藏" : "收藏地点"} className={isSaved ? "saved" : ""} onClick={() => setSaved((ids) => isSaved ? ids.filter((id) => id !== activity.id) : [...ids, activity.id])}><BookmarkIcon /></button></div><div className="activity-detail-hero"><img src={activity.image} alt={activity.name} draggable="false" /></div><div className="activity-detail-content"><div className="activity-detail-title"><div><span>{activity.type} · AI 匹配 94%</span><h1>{activity.name}</h1><p><SewingPinFilledIcon /> {activity.address}</p></div><strong><StarFilledIcon /> 4.8</strong></div><div className="activity-facts"><div><SewingPinFilledIcon /><span><small>位置</small><b>{activity.location.replace("上海 · ", "")}</b></span></div><div><ClockIcon /><span><small>开放</small><b>{activity.time}</b></span></div><div><SunIcon /><span><small>天气</small><b>晴 · 27°C</b></span></div></div><div className="activity-detail-tabs" role="tablist" aria-label="地点详情分类"><button role="tab" aria-selected={section === "overview"} className={section === "overview" ? "active" : ""} onClick={() => setSection("overview")}>概览</button><button role="tab" aria-selected={section === "guide"} className={section === "guide" ? "active" : ""} onClick={() => setSection("guide")}>攻略</button><button role="tab" aria-selected={section === "team"} className={section === "team" ? "active" : ""} onClick={() => setSection("team")}>组队</button><button role="tab" aria-selected={section === "reviews"} className={section === "reviews" ? "active" : ""} onClick={() => setSection("reviews")}>评价</button></div>{section === "overview" && <div className="detail-section"><p>{activity.description}</p><div className="detail-section-heading"><h2>现场照片</h2><span>{gallery.length} 张</span></div><div className="activity-gallery">{gallery.map((image, index) => <figure className={index < checkinPhotos.length ? "checkin-photo" : ""} key={`${image}-${index}`}><img src={image} alt={`${activity.name}现场照片${index + 1}`} draggable="false" />{index < checkinPhotos.length && <figcaption>佳佳打卡</figcaption>}</figure>)}</div></div>}{section === "guide" && <div className="detail-section detail-guide synced-guide"><div className="guide-author"><span className="avatar">{matchingGuide.author.slice(0, 1)}</span><span><b>@{matchingGuide.author}</b><small>亲自去过 · 用户分享</small></span></div><h2>{matchingGuide.title}</h2><p>{matchingGuide.note}</p><article><b>地点与卡片完全同步</b><p>{activity.name} · {activity.address} · {activity.time}</p></article><article><b>顺路这样玩</b><p>结束后可加入 AI 路线，自动衔接下一站并减少折返。</p></article></div>}{section === "team" && <div className="detail-section team-detail-section">{matchingTeam ? <><div className="team-detail-heading"><div className="member-stack"><span>{matchingTeam.host.slice(0, 1)}</span><span>佳</span><span>+</span></div><span className="spots">还差 {Math.max(0, matchingTeam.capacity - matchingTeam.memberCount - (joined ? 1 : 0))} 人</span></div><h2>{matchingTeam.name}</h2><p>{matchingTeam.note}</p><div className="team-detail-facts"><div><PersonIcon /><span><small>发起人</small><b>{matchingTeam.host} · 已实名</b></span></div><div><CalendarIcon /><span><small>集合时间</small><b>{matchingTeam.time}</b></span></div><div><SewingPinFilledIcon /><span><small>集合地点</small><b>{matchingTeam.meeting}</b></span></div></div><div className="team-tags">{matchingTeam.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><button className={`team-join-button ${joined ? "joined" : ""}`} onClick={() => { setJoined(!joined); showToast(joined ? "已退出这次同行" : "已加入组队，记录已同步到我的同行"); }}>{joined ? <><CheckIcon /> 已加入，查看同行记录</> : <><GroupIcon /> 申请加入</>}</button></> : <div className="empty-inline"><GroupIcon /><h2>还没有人发起组队</h2><p>你可以从组队页为这个地点发起同行。</p></div>}</div>}{section === "reviews" && <div className="detail-section detail-reviews">{checkins.map((entry) => <div className="my-checkin-review" key={entry.id}><span className="avatar">佳</span><p><b>佳佳 · 刚刚打卡</b><br />{entry.note || entry.title}{entry.image && <small><SewingPinFilledIcon /> 已上传 1 张现场照片</small>}</p></div>)}<div><span className="avatar">林</span><p><b>林同学 · 5.0</b><br />图片很好拍，公共交通也方便，和朋友慢慢逛很舒服。</p></div><div><span className="avatar">陈</span><p><b>陈默 · 4.8</b><br />路线安排合理，傍晚接滨江日落刚好。</p></div></div>}</div></section>;
}

type ItineraryScreenProps = { stops: Stop[]; setStops: React.Dispatch<React.SetStateAction<Stop[]>>; expenses: Expense[]; memos: Memo[]; total: number; weatherAlert: boolean; setWeatherAlert: (value: boolean) => void; openModal: (name: ModalName) => void; routeReady: boolean; onExplore: () => void; showToast: (message: string) => void; budget: number; people: number; aiNote: string; onBack: () => void; onOpenAi: () => void; onOpenStop: (stop: Stop) => void };

function InteractiveItineraryScreen({ stops, setStops, expenses, memos, total, weatherAlert, setWeatherAlert, openModal, routeReady, onExplore, budget, people, aiNote, onBack, onOpenAi, onOpenStop }: ItineraryScreenProps) {
  const [planView, setPlanView] = useState<PlanView>("saturday");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ name: "", time: "", cost: "" });
  const dayStops = planView === "sunday" ? sundayStops : stops;
  const visibleMapStops = planView === "overview" ? stops : dayStops;
  const saturdayCost = stops.reduce((sum, stop) => sum + stop.cost, 0);
  const sundayCost = sundayStops.reduce((sum, stop) => sum + stop.cost, 0);
  const transportNotes = planView === "sunday"
    ? ["衡山路站出发 · 步行约 6 分钟", "沿林荫街区步行约 18 分钟", "从交通大学站乘地铁约 25 分钟"]
    : ["龙华中路地铁站出发 · 地铁 12 号线约 18 分钟", "从上一站步行约 12 分钟", "从上一站骑行约 18 分钟"];
  const beginEdit = (stop: Stop) => { setEditingId(stop.id); setDraft({ name: stop.name, time: stop.time, cost: String(stop.cost) }); };
  const saveEdit = (id: number) => {
    setStops((current) => current.map((stop) => stop.id === id ? { ...stop, name: draft.name.trim() || stop.name, time: draft.time.trim() || stop.time, cost: Number(draft.cost) || 0 } : stop));
    setEditingId(null);
  };
  const switchView = (view: PlanView) => { setPlanView(view); setEditingId(null); };

  return <section className="itinerary-screen video-plan-screen">
    <div className="map-pane">
      <img className="map-image" src="/assets/weekend/map-route.png" alt="上海徐汇周末路线地图" draggable="false" onError={repairBrokenImage} />
      <div className="plan-map-header"><button aria-label="返回计划列表" onClick={onBack}><ChevronLeftIcon /></button><b>徐汇滨江周末计划</b><button aria-label="查看AI对话记录" onClick={onOpenAi}><MagicWandIcon /></button></div>
      {visibleMapStops.slice(0, 3).map((stop, index) => <button key={`${planView}-${stop.id}`} className={`map-stop stop-${index + 1}`} onClick={() => onOpenStop(stop)}><img src={resolveStopImage(stop)} alt="" draggable="false" onError={repairBrokenImage} /><span><b>{index + 1}. {stop.name}</b><small>{stop.time}</small></span></button>)}
    </div>
    <div className="plan-pane expanded">
      <div className="drag-handle" />
      <div className="plan-day-tabs" role="tablist" aria-label="行程日期">
        <button role="tab" aria-selected={planView === "overview"} className={planView === "overview" ? "active" : ""} onClick={() => switchView("overview")}>总览</button>
        <button role="tab" aria-selected={planView === "saturday"} className={planView === "saturday" ? "active" : ""} onClick={() => switchView("saturday")}>9.19 周六</button>
        <button role="tab" aria-selected={planView === "sunday"} className={planView === "sunday" ? "active" : ""} onClick={() => switchView("sunday")}>9.20 周日</button>
      </div>
      {!routeReady || stops.length === 0 ? <EmptyPlan onExplore={onExplore} /> : planView === "overview" ? <div className="plan-overview" role="tabpanel">
        <header className="plan-heading"><div><span className="eyebrow"><MagicWandIcon /> AI 已排好两天路线</span><h1>上海周末 · 2 天</h1><p>6 个地点 · 文化、街区与滨江路线，人均预计 ¥{Math.round((saturdayCost + sundayCost) / people)}。</p></div><button className="icon-button" aria-label="调整行程偏好" onClick={() => openModal("preferences")}><Pencil2Icon /></button></header>
        <div className="overview-stats"><span><b>2</b><small>天行程</small></span><span><b>6</b><small>个地点</small></span><span><b>24.8</b><small>探索公里</small></span></div>
        <div className="overview-days">
          <button onClick={() => switchView("saturday")}><img src={resolveStopImage(stops[0])} alt="周六西岸路线" onError={repairBrokenImage} /><span><small>9.19 周六 · {stops.length} 个地点</small><b>西岸看展、龙华会与滨江日落</b><em>查看周六路线 <ChevronRightIcon /></em></span></button>
          <button onClick={() => switchView("sunday")}><img src={resolveStopImage(sundayStops[1])} alt="周日城市漫步路线" onError={repairBrokenImage} /><span><small>9.20 周日 · {sundayStops.length} 个地点</small><b>衡山路早午餐、武康路与阅读时光</b><em>查看周日路线 <ChevronRightIcon /></em></span></button>
        </div>
      </div> : <div role="tabpanel">
        <header className="plan-heading"><div><span className="eyebrow"><MagicWandIcon /> AI 已综合天气与预算</span><h1>{planView === "sunday" ? "9.20 周日" : "9.19 周六"} · 上海</h1><p>{planView === "sunday" ? "上午漫步街区、午后转入室内，路线更轻松" : aiNote}，人均 ¥{Math.round((planView === "sunday" ? sundayCost : total) / people)} / ¥{budget}。</p></div><button className="icon-button" aria-label="调整行程偏好" onClick={() => openModal("preferences")}><Pencil2Icon /></button></header>
        <div className="plan-details">
          {planView === "saturday" && weatherAlert && <button className="weather-alert" onClick={() => setWeatherAlert(false)}><SunIcon /><span><b>下午高温，已调整路线</b><small>点此确认，或继续告诉 AI 怎么改</small></span><Cross2Icon /></button>}
          <div className="timeline">{dayStops.map((stop, index) => <div className="timeline-stop" key={`${planView}-${stop.id}`}><div className="timeline-item"><div className="timeline-index">{index + 1}</div><button className="timeline-place" onClick={() => onOpenStop(stop)}><img src={resolveStopImage(stop)} alt={stop.name} draggable="false" onError={repairBrokenImage} /><span className="timeline-copy"><span>{stop.tag}</span><h3>{stop.name}</h3><p><ClockIcon /> {stop.time} · {stop.cost ? `¥${stop.cost}` : "免费"}</p></span></button><button className="small-button" onClick={() => planView === "saturday" ? beginEdit(stop) : onOpenStop(stop)}>{planView === "saturday" ? "编辑" : "查看"}</button><small className="transport-note"><RocketIcon /> {transportNotes[index] ?? "从上一站步行约 15 分钟"}</small></div>{planView === "saturday" && editingId === stop.id && <div className="stop-editor"><label>地点名称<KeyboardInput value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} /></label><label>游玩时间<KeyboardInput value={draft.time} onChange={(event) => setDraft((value) => ({ ...value, time: event.target.value }))} /></label><label>预计花费<KeyboardInput inputMode="numeric" value={draft.cost} onChange={(event) => setDraft((value) => ({ ...value, cost: event.target.value }))} /></label><div><button onClick={() => setEditingId(null)}>取消</button><button className="primary-button" onClick={() => saveEdit(stop.id)}>保存修改</button></div></div>}</div>)}</div>
          <div className="plan-tools"><button onClick={() => openModal("bills")}><BackpackIcon /><span><b>本次账单 ¥{total}</b><small>{expenses.length} 笔 · {people} 人 AA</small></span><ChevronRightIcon /></button><button onClick={() => openModal("memo")}><FileTextIcon /><span><b>本次备忘 {memos.length} 条</b><small>{memos.filter((memo) => !memo.done).length} 条待办</small></span><ChevronRightIcon /></button></div>
        </div>
      </div>}
    </div>
  </section>;
}

function ItineraryScreen({ stops, setStops, expenses, memos, total, weatherAlert, setWeatherAlert, openModal, routeReady, onExplore, budget, people, aiNote, onBack, onOpenAi, onOpenStop }: ItineraryScreenProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ name: "", time: "", cost: "" });
  const transportNotes = ["龙华中路地铁站出发 · 地铁 12 号线约 18 分钟", "从上一站步行约 12 分钟", "从上一站骑行约 18 分钟"];
  const beginEdit = (stop: Stop) => { setEditingId(stop.id); setDraft({ name: stop.name, time: stop.time, cost: String(stop.cost) }); };
  const saveEdit = (id: number) => {
    setStops((current) => current.map((stop) => stop.id === id ? { ...stop, name: draft.name.trim() || stop.name, time: draft.time.trim() || stop.time, cost: Number(draft.cost) || 0 } : stop));
    setEditingId(null);
  };
  return <section className="itinerary-screen video-plan-screen"><div className="map-pane"><img className="map-image" src="/assets/weekend/map-route.png" alt="上海徐汇周末路线地图" draggable="false" /><div className="plan-map-header"><button aria-label="返回计划列表" onClick={onBack}><ChevronLeftIcon /></button><b>徐汇滨江周末计划</b><button aria-label="查看AI对话记录" onClick={onOpenAi}><MagicWandIcon /></button></div>{stops.slice(0, 3).map((stop, index) => <button key={stop.id} className={`map-stop stop-${index + 1}`} onClick={() => onOpenStop(stop)}><img src={stop.image} alt="" draggable="false" /><span><b>{index + 1}. {stop.name}</b><small>{stop.time}</small></span></button>)}</div><div className="plan-pane expanded"><div className="drag-handle" /><div className="plan-day-tabs"><button>总览</button><button className="active">9.19 周六</button><button>9.20 周日</button></div>{!routeReady || stops.length === 0 ? <EmptyPlan onExplore={onExplore} /> : <><header className="plan-heading"><div><span className="eyebrow"><MagicWandIcon /> AI 已综合天气与预算</span><h1>9.19 周六 · 上海</h1><p>{aiNote}，人均 ¥{Math.round(total / people)} / ¥{budget}。</p></div><button className="icon-button" aria-label="调整行程偏好" onClick={() => openModal("preferences")}><Pencil2Icon /></button></header><div className="plan-details">{weatherAlert && <button className="weather-alert" onClick={() => setWeatherAlert(false)}><SunIcon /><span><b>下午高温，已调整路线</b><small>点此确认，或继续告诉 AI 怎么改</small></span><Cross2Icon /></button>}<div className="timeline">{stops.map((stop, index) => <div className="timeline-stop" key={stop.id}><div className="timeline-item"><div className="timeline-index">{index + 1}</div><button className="timeline-place" onClick={() => onOpenStop(stop)}><img src={stop.image} alt={stop.name} draggable="false" /><span className="timeline-copy"><span>{stop.tag}</span><h3>{stop.name}</h3><p><ClockIcon /> {stop.time} · {stop.cost ? `¥${stop.cost}` : "免费"}</p></span></button><button className="small-button" onClick={() => beginEdit(stop)}>编辑</button><small className="transport-note"><RocketIcon /> {transportNotes[index] ?? "从上一站步行约 15 分钟"}</small></div>{editingId === stop.id && <div className="stop-editor"><label>地点名称<KeyboardInput value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} /></label><label>游玩时间<KeyboardInput value={draft.time} onChange={(event) => setDraft((value) => ({ ...value, time: event.target.value }))} /></label><label>预计花费<KeyboardInput inputMode="numeric" value={draft.cost} onChange={(event) => setDraft((value) => ({ ...value, cost: event.target.value }))} /></label><div><button onClick={() => setEditingId(null)}>取消</button><button className="primary-button" onClick={() => saveEdit(stop.id)}>保存修改</button></div></div>}</div>)}</div><div className="plan-tools"><button onClick={() => openModal("bills")}><BackpackIcon /><span><b>本次账单 ¥{total}</b><small>{expenses.length} 笔 · {people} 人 AA</small></span><ChevronRightIcon /></button><button onClick={() => openModal("memo")}><FileTextIcon /><span><b>本次备忘 {memos.length} 条</b><small>{memos.filter((memo) => !memo.done).length} 条待办</small></span><ChevronRightIcon /></button></div></div></>}</div></section>;
}

function EmptyPlan({ onExplore }: { onExplore: () => void }) { return <div className="empty-plan"><span><MagicWandIcon /></span><h2>还没有周末路线</h2><p>先挑几个感兴趣的活动，AI 会为你安排时间、交通和预算。</p><button className="primary-button" onClick={onExplore}>去探索活动</button></div>; }

function TeamScreen({ joined, openCreate, customTeams, onOpen }: { joined: boolean; openCreate: () => void; customTeams: CustomTeam[]; onOpen: (team: TeamListing) => void }) {
  const customListings: TeamListing[] = customTeams.map((team) => ({ id: team.id, activityId: 1, name: team.name, time: team.meta.split(" · ")[0] || "周六 09:40", meeting: team.meta.split(" · ")[1] || "龙华中路地铁站", memberCount: 1, capacity: 4, note: team.note, host: "佳佳", tags: ["我发起的", "公开集合"], custom: true }));
  const allTeams = [...baseTeams, ...customListings];
  return <section className="team-screen screen-shell"><div className="team-top-actions"><button className="safety-banner"><GroupIcon /><span><b>校园身份友好</b><small>公开集合 · 可退出与举报</small></span><ChevronRightIcon /></button><button className="primary-button compact" onClick={openCreate}><PlusIcon /> 发起组队</button></div><div className="section-heading"><div><h2>和你的路线顺路</h2><p>卡片与探索页使用同一地点详情</p></div></div><div className="activity-grid explore-feed team-destination-list">{allTeams.map((team, index) => { const activity = activities.find((item) => item.id === team.activityId) ?? activities[0]; const memberCount = team.memberCount + (joined && index === 0 ? 1 : 0); return <article className="destination-card team-destination-card" role="button" tabIndex={0} key={team.id} onClick={() => onOpen(team)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(team); }}><div className="destination-image"><img src={activity.image} alt={activity.name} draggable="false" /><div className="destination-topline"><span>{team.custom ? "我发起的" : `还差 ${Math.max(0, team.capacity - memberCount)} 人`}</span><span className="team-capacity"><GroupIcon /> {memberCount}/{team.capacity}</span></div><div className="destination-overlay"><span><SewingPinFilledIcon /> {activity.name}</span><h3>{team.name}</h3><p>{team.time} · {team.meeting}</p><div className="overlay-member-row"><div className="member-stack"><span>{team.host.slice(0, 1)}</span><span>佳</span><span>+</span></div><span>发起人 {team.host}</span></div></div></div><footer><span>{team.note}</span><strong>查看详情 <ChevronRightIcon /></strong></footer></article>; })}</div></section>;
}

function JournalScreen({ checkins, guides, openCheckin, openGuide, saved, showToast, entries, onPreferences, onCompanions, onBills, onMemo }: { checkins: number; guides: number; openCheckin: () => void; openGuide: () => void; saved: number; showToast: (message: string) => void; entries: JournalEntry[]; onPreferences: () => void; onCompanions: () => void; onBills: () => void; onMemo: () => void }) {
  const shareJourney = () => { void navigator.clipboard?.writeText(window.location.href); showToast("旅迹链接已复制，可以发给朋友了"); };
  const checkinEntries = entries.filter((entry) => entry.type === "checkin");
  return <section className="journal-screen merged-profile-screen screen-shell"><header className="journal-hero"><div><span className="avatar large">佳</span><div><small>上海城市探索家 · 12 级</small><h1>佳佳</h1><p>去更大的世界，见更好的自己</p></div></div><div className="journal-hero-tools"><button className="icon-button" aria-label="偏好设置" onClick={onPreferences}><GearIcon /></button><button className="icon-button" aria-label="分享旅迹" onClick={shareJourney}><Share1Icon /></button></div></header><div className="stat-row"><div><b>{checkins}</b><span>次打卡</span></div><div><b>{guides}</b><span>篇攻略</span></div><div><b>{saved}</b><span>个收藏</span></div><div><b>24.8</b><span>探索公里</span></div></div><div className="journal-actions"><button className="primary-button" onClick={openCheckin}><SewingPinFilledIcon /> 记录本次打卡</button><button className="secondary-button" onClick={openGuide}><Pencil2Icon /> 写一篇攻略</button></div><div className="profile-tool-grid"><button onClick={onCompanions}><PersonIcon /><span><b>我的同行</b><small>同行过的记录</small></span><ChevronRightIcon /></button><button onClick={onBills}><BackpackIcon /><span><b>我的账单</b><small>每次出行账单</small></span><ChevronRightIcon /></button><button onClick={onMemo}><FileTextIcon /><span><b>我的备忘</b><small>每次出行备忘</small></span><ChevronRightIcon /></button></div><div className="section-heading"><div><h2>最近旅迹</h2><p>来自你完成后的打卡记录</p></div><button onClick={() => showToast("已展示全部打卡旅迹")}>查看全部 <ChevronRightIcon /></button></div><div className="journal-grid">{checkinEntries.map((entry) => <article className="memory-card" key={entry.id}><img src="/assets/weekend/xuhui-riverside.png" alt={entry.title} draggable="false" /><div><span>刚刚打卡 · 上海</span><h3>{entry.title}</h3><p>{entry.note || "已保存到我的周末旅迹"}</p></div></article>)}<article className="memory-card featured"><img src="/assets/weekend/xuhui-riverside.png" alt="徐汇滨江日落打卡" draggable="false" /><div><span>9月12日 · 打卡</span><h3>徐汇滨江日落散步</h3><p>完成 3 个地点 · 步行 6.2km</p></div></article><article className="memory-card"><img src="/assets/weekend/west-bund-museum.png" alt="西岸美术馆打卡" draggable="false" /><div><span>8月29日 · 打卡</span><h3>西岸艺术一日漫游</h3><p>看展 2 小时 · 同行 4 人</p></div></article><article className="memory-card"><img src="/assets/weekend/longhua-hui.png" alt="龙华会打卡" draggable="false" /><div><span>8月16日 · 打卡</span><h3>龙华会周末市集</h3><p>逛了 12 个摊位 · 花费 ¥96</p></div></article></div></section>;
}

function CompanionHistoryScreen({ joined, customTeams, onOpen }: { joined: boolean; customTeams: CustomTeam[]; onOpen: (team: TeamListing) => void }) {
  const records: Array<TeamListing & { status: string; date: string }> = [
    ...(joined ? [{ ...baseTeams[0], status: "进行中", date: "9月19日" }] : []),
    { ...baseTeams[1], id: 302, memberCount: 5, status: "已完成", date: "9月12日" },
    { ...baseTeams[0], id: 303, name: "西岸艺术一日同行", memberCount: 4, status: "已完成", date: "8月29日" },
    ...customTeams.map((team) => ({ ...baseTeams[0], id: team.id, name: team.name, note: team.note, status: "招募中", date: "本周六", custom: true })),
  ];
  return <section className="companion-history screen-shell"><div className="history-summary"><GroupIcon /><div><b>{records.length} 次同行</b><span>每一次组队都会沉淀在这里</span></div></div><div className="companion-records">{records.map((record) => { const activity = activities.find((item) => item.id === record.activityId) ?? activities[0]; return <button key={record.id} onClick={() => onOpen(record)}><img src={activity.image} alt={activity.name} /><span><small>{record.date} · {record.status}</small><b>{record.name}</b><p>{record.memberCount}/{record.capacity} 人同行 · {record.meeting}</p></span><ChevronRightIcon /></button>; })}</div></section>;
}

function BillHistoryScreen({ expenses, hotel, people, onOpenCurrent }: { expenses: Expense[]; hotel: string; people: number; onOpenCurrent: () => void }) {
  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);
  const currentTotal = expenses.reduce((sum, item) => sum + item.amount, 0) + (hotelPrices[hotel] ?? 0);
  const trips = [
    { id: 1, date: "9月19日", title: "徐汇滨江周末计划", image: "/assets/weekend/xuhui-riverside.png", total: currentTotal, people, detail: `${expenses.length + (hotel ? 1 : 0)} 笔消费 · 待结算`, current: true },
    { id: 2, date: "8月29日", title: "西岸艺术一日漫游", image: "/assets/weekend/west-bund-museum.png", total: 168, people: 4, detail: "5 笔消费 · 已完成 AA" },
    { id: 3, date: "8月16日", title: "龙华会市集逛吃", image: "/assets/weekend/longhua-hui.png", total: 286, people: 3, detail: "7 笔消费 · 已完成 AA" },
  ];
  return <section className="record-page screen-shell"><div className="record-summary"><BackpackIcon /><span><b>{trips.length} 次出行账单</b><small>总支出 ¥{trips.reduce((sum, trip) => sum + trip.total, 0)}</small></span></div><div className="trip-record-list">{trips.map((trip) => <div className="trip-record-item" key={trip.id}><button onClick={() => trip.current ? onOpenCurrent() : setSelectedTrip((current) => current === trip.id ? null : trip.id)}><img src={trip.image} alt={trip.title} /><span><small>{trip.date} · {trip.detail}</small><b>{trip.title}</b><p>{trip.people} 人同行 · 人均 ¥{Math.round(trip.total / trip.people)}</p></span><strong>¥{trip.total}</strong><ChevronRightIcon /></button>{selectedTrip === trip.id && <div className="trip-record-detail"><span><b>门票与活动</b><strong>¥{Math.round(trip.total * .48)}</strong></span><span><b>餐饮与交通</b><strong>¥{trip.total - Math.round(trip.total * .48)}</strong></span><small><CheckIcon /> 已按 {trip.people} 人完成 AA 结算</small></div>}</div>)}</div></section>;
}

function MemoHistoryScreen({ memos, onOpenCurrent }: { memos: Memo[]; onOpenCurrent: () => void }) {
  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);
  const trips = [
    { id: 1, date: "9月19日", title: "徐汇滨江周末计划", image: "/assets/weekend/xuhui-riverside.png", count: memos.length, pending: memos.filter((memo) => !memo.done).length, preview: memos[0]?.text ?? "暂无备忘", current: true },
    { id: 2, date: "8月29日", title: "西岸艺术一日漫游", image: "/assets/weekend/west-bund-museum.png", count: 4, pending: 0, preview: "学生证、充电宝、预约二维码" },
    { id: 3, date: "8月16日", title: "龙华会市集逛吃", image: "/assets/weekend/longhua-hui.png", count: 3, pending: 0, preview: "雨伞、环保袋、空腹出发" },
  ];
  return <section className="record-page screen-shell"><div className="record-summary"><FileTextIcon /><span><b>{trips.length} 份出行备忘</b><small>按每次计划独立保存</small></span></div><div className="trip-record-list">{trips.map((trip) => <div className="trip-record-item" key={trip.id}><button onClick={() => trip.current ? onOpenCurrent() : setSelectedTrip((current) => current === trip.id ? null : trip.id)}><img src={trip.image} alt={trip.title} /><span><small>{trip.date} · {trip.count} 条{trip.pending ? ` · ${trip.pending} 条待办` : " · 已完成"}</small><b>{trip.title}</b><p>{trip.preview}</p></span><ChevronRightIcon /></button>{selectedTrip === trip.id && <div className="trip-record-detail memo"><span><CheckIcon /><b>{trip.preview}</b></span><span><CheckIcon /><b>确认集合时间与返程路线</b></span><small>这次出行的备忘均已完成</small></div>}</div>)}</div></section>;
}

function AppModal({ name, close, hotel, setHotel, expenses, setExpenses, memos, setMemos, setJoined, setCheckins, setGuides, setTab, showToast, budget, setBudget, people, setPeople, likes, setLikes, setCustomTeams, setJournalEntries, setStops, setRouteReady }: { name: ModalName; close: () => void; hotel: string; setHotel: (value: string) => void; expenses: Expense[]; setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>; memos: Memo[]; setMemos: React.Dispatch<React.SetStateAction<Memo[]>>; joined: boolean; setJoined: (value: boolean) => void; setCheckins: React.Dispatch<React.SetStateAction<number>>; setGuides: React.Dispatch<React.SetStateAction<number>>; setTab: (tab: Tab) => void; showToast: (message: string) => void; budget: number; setBudget: (value: number) => void; people: number; setPeople: (value: number) => void; likes: string[]; setLikes: React.Dispatch<React.SetStateAction<string[]>>; setCustomTeams: React.Dispatch<React.SetStateAction<CustomTeam[]>>; setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>; setStops: React.Dispatch<React.SetStateAction<Stop[]>>; setRouteReady: (value: boolean) => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!name) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusableSelector = "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const frame = window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("keydown", handleKeyDown); previous?.focus(); };
  }, [name]);
  if (!name) return null;
  const titles = { preferences: "调整推荐偏好", stay: "选择住宿", bills: "行程账单与 AA", memo: "行程备忘", team: "发起组队", checkin: "记录打卡", guide: "发布攻略", manualPlan: "手动创建计划" };
  return <div className="modal-backdrop" onMouseDown={close}><section ref={dialogRef} className="app-modal" role="dialog" aria-modal="true" aria-label={titles[name]} onMouseDown={(e) => e.stopPropagation()}><header><div className="drag-handle" /><h2>{titles[name]}</h2><button aria-label="关闭" onClick={close}><Cross2Icon /></button></header><div className="modal-body">{name === "preferences" && <PreferencesModal close={close} showToast={showToast} budget={budget} setBudget={setBudget} people={people} setPeople={setPeople} likes={likes} setLikes={setLikes} />}{name === "stay" && <StayModal hotel={hotel} setHotel={setHotel} close={close} showToast={showToast} />}{name === "bills" && <BillsModal expenses={expenses} setExpenses={setExpenses} showToast={showToast} hotel={hotel} people={people} />}{name === "memo" && <MemoModal memos={memos} setMemos={setMemos} />}{name === "team" && <TeamCreateForm close={close} onSave={({ title, note }) => { setCustomTeams((items) => [{ id: Date.now(), name: title, meta: "周六 09:40 · 龙华中路地铁站", note: note || "期待同频的周末搭子", }, ...items]); setJoined(true); setTab("team"); showToast("组队已发布，等待同伴加入"); }} />}{name === "checkin" && <CheckinForm close={close} onSave={({ title, note, activityId, image }) => { setCheckins((n) => n + 1); setJournalEntries((items) => [{ id: Date.now(), type: "checkin", title, note, activityId, image }, ...items]); setTab("journal"); showToast("打卡已同步到地点评价和现场照片"); }} />}{name === "guide" && <GuideForm close={close} onSave={({ title, note, activityId }) => { setGuides((n) => n + 1); setJournalEntries((items) => [{ id: Date.now(), type: "guide", title, note, activityId }, ...items]); setTab("journal"); showToast("攻略已发布，并同步到探索首页"); }} />}{name === "manualPlan" && <ManualPlanForm close={close} onSave={({ name, time, cost }) => { setStops([{ id: Date.now(), name, time, cost, tag: "自定义", image: "/assets/weekend/xuhui-riverside.png" }]); setRouteReady(true); setTab("itinerary"); showToast("手动计划已创建，可以继续添加地点"); }} />}</div></section></div>;
}

function ManualPlanForm({ close, onSave }: { close: () => void; onSave: (value: { name: string; time: string; cost: number }) => void }) {
  const [name, setName] = useState("");
  const [time, setTime] = useState("10:00–12:00");
  const [cost, setCost] = useState("0");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; onSave({ name: name.trim(), time: time.trim() || "时间待定", cost: Number(cost) || 0 }); close(); }}><div className="form-intro"><CalendarIcon /><span><b>从空白计划开始</b><small>先手动添加第一个地点，之后可以继续编辑时间与费用。</small></span></div><label>第一个地点<KeyboardInput value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：西岸美术馆" /></label><div className="form-two-columns"><label>游玩时间<KeyboardInput value={time} onChange={(event) => setTime(event.target.value)} /></label><label>预计花费<KeyboardInput inputMode="numeric" value={cost} onChange={(event) => setCost(event.target.value)} /></label></div><button className="primary-button" type="submit" disabled={!name.trim()}><PlusIcon /> 创建手动计划</button></form>;
}

function PreferencesModal({ close, showToast, budget, setBudget, people, setPeople, likes, setLikes }: { close: () => void; showToast: (message: string) => void; budget: number; setBudget: (value: number) => void; people: number; setPeople: (value: number) => void; likes: string[]; setLikes: React.Dispatch<React.SetStateAction<string[]>> }) {
  const options = ["展览", "市集", "演出", "城市漫步", "短途徒步", "咖啡"];
  return <form onSubmit={(e) => { e.preventDefault(); close(); showToast("偏好已更新，推荐正在变好"); }} className="form-stack"><label>同行人数<div className="segmented">{[1, 2, 3, 4].map((value) => <button type="button" className={people === value ? "active" : ""} key={value} onClick={() => setPeople(value)}>{value === 4 ? "4+" : value} 人</button>)}</div></label><label>单人预算 <b>¥{budget}</b><input type="range" min="0" max="800" step="50" value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></label><label>想去哪里<div className="select-grid">{options.map((item) => <button type="button" key={item} className={likes.includes(item) ? "active" : ""} onClick={() => setLikes((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])}>{item}</button>)}</div></label><label className="toggle-row">下雨时自动切换室内活动<input type="checkbox" defaultChecked /></label><button className="primary-button" type="submit">保存偏好</button></form>;
}

function StayModal({ hotel, setHotel, close, showToast }: { hotel: string; setHotel: (value: string) => void; close: () => void; showToast: (message: string) => void }) {
  const stays = [{ name: "徐家汇青旅", price: 129, meta: "地铁 11 号线旁 · 青年床位" }, { name: "西岸轻居酒店", price: 238, meta: "距美术馆 800m · 双床房" }];
  return <div className="stay-list">{stays.map((stay) => <button className={hotel === stay.name ? "selected" : ""} key={stay.name} onClick={() => { setHotel(stay.name); close(); showToast("住宿已加入行程与预算"); }}><HomeIcon /><span><b>{stay.name}</b><small>{stay.meta}</small></span><strong>¥{stay.price}<small>/晚</small></strong>{hotel === stay.name && <CheckIcon />}</button>)}{hotel && <button className="text-danger" onClick={() => { setHotel(""); close(); showToast("已移除住宿"); }}>移除当前住宿</button>}</div>;
}

function BillsModal({ expenses, setExpenses, showToast, hotel, people }: { expenses: Expense[]; setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>; showToast: (message: string) => void; hotel: string; people: number }) {
  const [title, setTitle] = useState(""); const [amount, setAmount] = useState(""); const total = expenses.reduce((sum, item) => sum + item.amount, 0) + (hotelPrices[hotel] ?? 0);
  return <div className="bill-modal"><div className="bill-total"><span>本次总账</span><b>¥{total}</b><small>{people} 人 AA：每人 ¥{Math.round(total / people)}</small></div><div className="bill-list">{expenses.map((item) => <div key={item.id}><span><b>{item.title}</b><small>{item.payer} 先付</small></span><strong>¥{item.amount}</strong><button aria-label="删除账单" onClick={() => setExpenses((items) => items.filter((value) => value.id !== item.id))}><Cross2Icon /></button></div>)}{hotel && <div className="lodging-expense"><span><b>{hotel}</b><small>住宿 · 已计入总账</small></span><strong>¥{hotelPrices[hotel]}</strong><HomeIcon /></div>}</div><form onSubmit={(e) => { e.preventDefault(); if (!title || !amount) return; setExpenses((items) => [...items, { id: Date.now(), title, amount: Number(amount), payer: "我" }]); setTitle(""); setAmount(""); }} className="inline-form"><input aria-label="账单名称" placeholder="新增账单，如：咖啡" value={title} onChange={(e) => setTitle(e.target.value)} /><input aria-label="金额" type="number" inputMode="decimal" placeholder="金额" value={amount} onChange={(e) => setAmount(e.target.value)} /><button className="primary-button" type="submit"><PlusIcon /> 添加</button></form><div className="aa-result"><CheckIcon /><span><b>AA 建议已算好</b><small>共 {people} 人，人均 ¥{Math.round(total / people)}</small></span><button onClick={() => { void navigator.clipboard?.writeText(`本次 AA 每人 ¥${Math.round(total / people)}`); showToast("AA 明细已复制，可发送给同行人"); }}><Share1Icon /> 发给同行人</button></div></div>;
}

function MemoModal({ memos, setMemos }: { memos: Memo[]; setMemos: React.Dispatch<React.SetStateAction<Memo[]>> }) {
  const [text, setText] = useState("");
  return <div className="memo-modal"><div className="memo-list">{memos.map((memo) => <label key={memo.id} className={memo.done ? "done" : ""}><input type="checkbox" checked={memo.done} onChange={() => setMemos((items) => items.map((item) => item.id === memo.id ? { ...item, done: !item.done } : item))} /><span>{memo.text}</span><button aria-label="删除备忘" onClick={() => setMemos((items) => items.filter((item) => item.id !== memo.id))}><Cross2Icon /></button></label>)}</div><form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; setMemos((items) => [...items, { id: Date.now(), text, done: false }]); setText(""); }}><input aria-label="新增备忘" value={text} onChange={(e) => setText(e.target.value)} placeholder="记点什么，出发前提醒我…" /><button className="primary-button"><PlusIcon /> 添加</button></form></div>;
}

function TeamCreateForm({ close, onSave }: { close: () => void; onSave: (entry: { title: string; note: string }) => void }) {
  const [title, setTitle] = useState("西岸看展搭子"); const [note, setNote] = useState("");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); onSave({ title, note }); close(); }}><label>招募标题<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label>集合时间<input type="datetime-local" defaultValue="2026-09-19T09:40" /></label><label>集合地点<input defaultValue="龙华中路地铁站 6 号口" /></label><label>队伍人数<select defaultValue="4"><option value="3">最多 3 人</option><option value="4">最多 4 人</option><option value="5">最多 5 人</option></select></label><label>招募简介<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="补充同行偏好、节奏与注意事项…" rows={4} /></label><button className="primary-button" type="submit">发布组队</button></form>;
}

function CheckinForm({ close, onSave }: { close: () => void; onSave: (entry: { title: string; note: string; activityId: number; image?: string }) => void }) {
  const [title, setTitle] = useState("徐汇滨江日落散步"); const [note, setNote] = useState(""); const [activityId, setActivityId] = useState(3); const [photoAdded, setPhotoAdded] = useState(false);
  const activity = activities.find((item) => item.id === activityId) ?? activities[2];
  return <form className="form-stack checkin-form" onSubmit={(event) => { event.preventDefault(); onSave({ title, note, activityId, image: photoAdded ? activity.image : undefined }); close(); }}><div className="form-intro"><SewingPinFilledIcon /><span><b>记录当下</b><small>保存后同步到地点评价与现场照片</small></span></div><label>打卡地点<select value={activityId} onChange={(event) => { setActivityId(Number(event.target.value)); setPhotoAdded(false); }}><option value="3">徐汇滨江日落散步</option><option value="1">西岸美术馆</option><option value="2">龙华会周末市集</option></select></label><div className="form-two-columns"><label>到达时间<input type="datetime-local" defaultValue="2026-09-17T18:10" /></label><label>本次花费<input type="number" defaultValue="68" /></label></div><label>这一刻的标题<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label>心情与现场<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="今天的天气、同行的人，或一个值得记住的瞬间…" rows={3} /></label><button type="button" className={`photo-drop ${photoAdded ? "selected" : ""}`} onClick={() => setPhotoAdded((value) => !value)}>{photoAdded ? <img src={activity.image} alt="待上传的现场照片" /> : <PlusIcon />}<span>{photoAdded ? "已添加 1 张现场照片" : "添加现场照片"}</span><small>{photoAdded ? "保存后会自动加入该地点的现场照片" : "照片会同步到对应地点详情"}</small></button><button className="primary-button" type="submit">保存本次打卡</button></form>;
}

function GuideForm({ close, onSave }: { close: () => void; onSave: (entry: { title: string; note: string; activityId: number }) => void }) {
  const [title, setTitle] = useState("学生党西岸一日路线"); const [note, setNote] = useState(""); const [activityId, setActivityId] = useState(1);
  const cover = activities.find((activity) => activity.id === activityId)?.image ?? activities[0].image;
  return <form className="form-stack guide-form" onSubmit={(event) => { event.preventDefault(); onSave({ title, note, activityId }); close(); }}><div className="form-intro guide"><Pencil2Icon /><span><b>整理成可分享的攻略</b><small>发布后会同步出现在探索首页的大卡片中</small></span></div><label className="guide-cover"><img src={cover} alt="攻略封面" /><span><b>攻略封面</b><small>跟随关联地点同步</small></span><ChevronRightIcon /></label><label>攻略标题<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label>关联地点<select value={activityId} onChange={(event) => setActivityId(Number(event.target.value))}><option value="1">西岸美术馆</option><option value="2">龙华会周末市集</option><option value="3">徐汇滨江日落散步</option></select></label><label>路线与避坑建议<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="写清路线顺序、交通、花费、推荐机位和避坑建议…" rows={6} required /></label><div className="guide-options"><button type="button">+ 人均预算</button><button type="button">+ 交通方式</button><button type="button">+ 推荐时段</button></div><button className="primary-button" type="submit">发布攻略到探索页</button></form>;
}
