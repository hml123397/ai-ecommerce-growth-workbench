const shopForm = document.querySelector("#shopForm");
const reviewForm = document.querySelector("#reviewForm");
const shopSampleBtn = document.querySelector("#shopSampleBtn");
const reviewSampleBtn = document.querySelector("#reviewSampleBtn");
const combineBtn = document.querySelector("#combineBtn");
const copyBtn = document.querySelector("#copyBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const shopOutput = document.querySelector("#shopOutput");
const reviewOutput = document.querySelector("#reviewOutput");
const combinedOutput = document.querySelector("#combinedOutput");
const aiStatus = document.querySelector("#aiStatus");
const aiOutput = document.querySelector("#aiOutput");
const toast = document.querySelector("#toast");
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".result-section");

let shopState = null;
let reviewState = null;
let currentReport = "";

const shopSample = {
  productName: "东北鲜食玉米礼盒",
  category: "农产品",
  platform: "抖音",
  topicType: "痛点型",
  videoDuration: "45",
  audience: "家庭囤货、上班族早餐、老人孩子、节日送礼人群",
  price: "59.9 元 8 根装",
  sellingPoints: "东北产地直发，甜糯口感，真空独立包装，开袋即食，低温锁鲜，早餐和夜宵都方便",
  promotion: "直播间第二件半价，下单加赠试吃装",
  concerns: "担心不甜，担心物流慢，担心和普通玉米没区别，担心收到后不新鲜"
};

const reviewSample = {
  title: "鲜食玉米礼盒测评视频",
  contentType: "测评对比",
  goal: "促进下单",
  platform: "抖音",
  accountType: "店铺账号",
  views: 3600,
  completionRate: 18,
  likes: 95,
  comments: 12,
  notes: "开头播放还可以，但评论区有人问甜不甜、怎么发货、有没有优惠。"
};

const benchmarks = {
  抖音: { completion: 30, interaction: 4 },
  快手: { completion: 28, interaction: 3.5 },
  小红书: { completion: 35, interaction: 5 },
  视频号: { completion: 32, interaction: 3 }
};

const platformProfiles = {
  抖音: { tone: "节奏快、口语强、利益点前置", focus: "前 3 秒必须给痛点、反差或利益点，商品入口要早露出。", action: "进店下单或进入直播间" },
  快手: { tone: "真实直接、强调实惠和信任", focus: "讲真实使用结果、价格机制、售后和发货，减少广告感。", action: "评论互动、直播间下单" },
  小红书: { tone: "真实体验、笔记感、细节充分", focus: "讲体验、避坑、适合谁不适合谁，强化收藏价值。", action: "收藏笔记、评论提问或进店对比" },
  视频号: { tone: "稳重可信、解释清楚", focus: "讲来源、家庭场景、信任背书和售后安心感。", action: "收藏、转发给家人或点击购买" }
};

const fmt = {
  num: (value) => Number(value || 0).toLocaleString("zh-CN"),
  pct: (value) => `${Number(value || 0).toFixed(value >= 10 ? 1 : 2)}%`,
  money: (value) => `¥${Number(value || 0).toFixed(2)}`
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitItems(value) {
  return String(value || "")
    .split(/[，,、；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function fillForm(form, data) {
  Object.entries(data).forEach(([key, value]) => {
    if (form.elements[key] && form.elements[key].type !== "file") form.elements[key].value = value;
  });
}

function switchTab(name) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name));
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderCard(title, items, text = "") {
  return `<article class="item-card"><h3>${escapeHtml(title)}</h3>${text ? `<p>${escapeHtml(text)}</p>` : ""}${renderList(items)}</article>`;
}

function buildShopPlan(input) {
  const points = splitItems(input.sellingPoints);
  const concerns = splitItems(input.concerns);
  const audience = splitItems(input.audience);
  const profile = platformProfiles[input.platform] || platformProfiles.抖音;
  const mainPoint = points[0] || "核心卖点清晰";
  const secondPoint = points[1] || "使用方便";
  const thirdPoint = points[2] || "适合日常复购";
  const mainConcern = concerns[0] || "用户顾虑";
  const hookConcern = mainConcern.replace(/^担心/, "");
  const mainAudience = audience[0] || "目标用户";
  const hook = `担心${hookConcern}？这款${input.productName}先看这 3 个真实细节。`;
  const duration = Number(input.videoDuration || 45);
  const videoScripts = {
    30: [
      `0-3 秒：${hook}`,
      `4-8 秒：展示${mainConcern}对应的真实场景。`,
      `9-18 秒：用细节镜头证明${mainPoint}和${secondPoint}。`,
      `19-25 秒：说清${input.price}和${input.promotion || "当前活动"}。`,
      `26-30 秒：提醒用户${profile.action}，并抛出一个具体评论问题。`
    ],
    45: [
      `0-3 秒：${hook}`,
      `4-10 秒：展示${mainConcern}对应的真实场景。`,
      `11-25 秒：用细节镜头证明${mainPoint}、${secondPoint}、${thirdPoint}。`,
      `26-35 秒：说清${input.price}和${input.promotion || "当前活动"}。`,
      `36-45 秒：提醒用户${profile.action}，并抛出一个具体评论问题。`
    ],
    60: [
      `0-3 秒：${hook}`,
      `4-12 秒：展示${mainConcern}对应的真实场景，并给出对比反差。`,
      `13-32 秒：用细节镜头证明${mainPoint}、${secondPoint}、${thirdPoint}。`,
      `33-45 秒：补充适合${mainAudience}的使用场景和购买理由。`,
      `46-55 秒：说清${input.price}和${input.promotion || "当前活动"}。`,
      `56-60 秒：提醒用户${profile.action}，并抛出一个具体评论问题。`
    ]
  };

  return {
    titles: [
      `${input.platform}好物｜${input.productName}解决${mainConcern}`,
      `${mainAudience}常备的${input.productName}，重点是${mainPoint}`,
      `${input.productName}真实测评：${secondPoint}到底值不值`,
      `${input.category}优选 ${input.productName} ${input.price}`,
      `别只看价格，${input.productName}真正要看这几点`,
      `${input.topicType}脚本：${input.productName}为什么值得买`
    ],
    detail: [
      `首屏短句：${input.productName}，${mainPoint}，当前${input.price}。`,
      `卖点区：${points.slice(0, 5).join("、") || input.sellingPoints}。`,
      `人群区：适合${input.audience}，直接说明谁适合买。`,
      `活动区：${input.promotion || "暂无固定活动，可按直播间限时福利设计"}。`,
      `顾虑区：针对“${mainConcern}”补实拍证明、发货说明和售后承诺。`
    ],
    service: [
      `问：适合哪些人？答：适合${input.audience}，尤其重视${mainPoint}的人。`,
      `问：为什么比普通款更值得买？答：重点看${points.slice(0, 3).join("、") || input.sellingPoints}。`,
      `问：现在有什么优惠？答：${input.promotion || input.price}，下单前可以确认活动和库存。`,
      "问：收到后有问题怎么办？答：先安抚，再引导提供订单号和问题照片，按店铺售后规则处理。"
    ],
    video: videoScripts[duration] || videoScripts[45],
    summary: `${input.platform}建议${profile.tone}；${profile.focus}`,
    hook
  };
}

function buildMetrics(input) {
  return {
    interactionRate: input.views ? ((input.likes + input.comments) / input.views) * 100 : 0,
    materialRate: input.videoUploaded ? 100 : 0
  };
}

function statusOf(value, good, warn) {
  if (value >= good) return "good";
  if (value >= warn) return "warn";
  return "bad";
}

function buildReview(input) {
  const metrics = buildMetrics(input);
  const target = benchmarks[input.platform] || benchmarks.抖音;
  const diagnosis = [
    {
      key: "内容留存",
      value: input.completionRate,
      target: target.completion,
      status: statusOf(input.completionRate, target.completion, target.completion * 0.6),
      cause: input.completionRate < 12 ? "开头没有立即出现痛点、反差或核心卖点。" : "中段卖点出现偏晚，信息递进不够。",
      actions: ["8 秒内讲出最强购买理由。", "每 3 到 4 秒切换一次有效画面。", "把价格、规格、核心利益提前。"]
    },
    {
      key: "互动吸引",
      value: metrics.interactionRate,
      target: target.interaction,
      status: statusOf(metrics.interactionRate, target.interaction, target.interaction * 0.5),
      cause: input.comments <= 3 ? "结尾缺少明确问题和置顶评论引导。" : "用户有疑问，但没有沉淀成下一条选题。",
      actions: ["结尾只问一个具体问题。", "把评论区高频问题做成下一条视频开头。", "发布后置顶答疑评论。"]
    },
    {
      key: "卖点承接",
      value: Math.min((input.completionRate + metrics.interactionRate * 4) / 2, 100),
      target: 45,
      status: statusOf(Math.min((input.completionRate + metrics.interactionRate * 4) / 2, 100), 45, 25),
      cause: "视频里能被用户记住的购买理由还需要更集中，评论问题也要反哺详情页和客服话术。",
      actions: ["中段集中展示价格、规格、优惠和适用场景。", "一句话讲清谁最适合买。", "把评论区高频问题补进详情页首屏和客服快捷回复。"]
    },
    {
      key: "视频复盘",
      value: metrics.materialRate,
      target: 100,
      status: input.videoUploaded ? "good" : "warn",
      cause: input.videoUploaded ? `已上传「${input.videoName}」，可以结合画面节奏做更细复盘。` : "还没有上传原视频，只能根据数据和文字观察做基础诊断。",
      actions: ["上传原视频后重点检查前 3 秒、卖点出现时间和结尾引导。", "记录哪一秒出现跳出或评论疑问。", "把有效镜头整理成下一条视频的开头素材。"]
    }
  ];
  const score = Math.round(
    Math.min(input.completionRate / 35, 1) * 45 +
      Math.min(metrics.interactionRate / 5, 1) * 35 +
      (input.videoUploaded ? 20 : 10)
  );
  const weakest = diagnosis.find((item) => item.status === "bad") || diagnosis.find((item) => item.status === "warn") || diagnosis[0];
  return {
    metrics,
    diagnosis,
    score,
    verdict: score >= 80 ? "可以放大复用" : score >= 60 ? "值得二次优化" : "需要重做关键链路",
    next: [
      `下一条围绕「${weakest.key}」优化，主题继续聚焦「${input.title}」。`,
      "0-3 秒直接展示痛点或对比结果，字幕不超过 14 个字。",
      "11-25 秒用场景、测评或用户疑问证明卖点。",
      "结尾引导进店、进直播间或评论提问。",
      "详情页首屏同步补齐卖点、规格、优惠、发货和售后。",
      input.videoUploaded ? `复盘上传视频「${input.videoName}」的前 5 秒节奏。` : "补充上传原视频后再做画面级复盘。"
    ]
  };
}

function renderShop() {
  const { input, plan } = shopState;
  shopOutput.innerHTML = `
    <div class="summary-card"><strong>1 号模块已生成</strong><span>${escapeHtml(plan.summary)}</span></div>
    <div class="stack-list">
      ${renderCard("商品标题", plan.titles)}
      ${renderCard("详情页承接", plan.detail)}
      ${renderCard("客服问答", plan.service)}
      ${renderCard("短视频脚本", plan.video, `商品：${input.productName}`)}
    </div>
  `;
}

function renderReview() {
  const { input, review } = reviewState;
  const metricCards = [
    ["增长评分", review.score, review.verdict],
    ["播放量", fmt.num(input.views), "曝光基础"],
    ["完播率", fmt.pct(input.completionRate), "内容留存"],
    ["互动率", fmt.pct(review.metrics.interactionRate), "点赞+评论"],
    ["上传视频", input.videoUploaded ? "已上传" : "未上传", input.videoUploaded ? input.videoName : "可补充原视频"]
  ];
  reviewOutput.innerHTML = `
    <div class="metric-cards">${metricCards
      .map(([name, value, note]) => `<article class="metric-card"><span>${escapeHtml(name)}</span><strong>${escapeHtml(value)}</strong><em>${escapeHtml(note)}</em></article>`)
      .join("")}</div>
    <div class="diagnosis-list">${review.diagnosis
      .map((item) => `<article class="diagnosis-card status-${item.status}"><h3>${escapeHtml(item.key)}</h3><p>当前 ${fmt.pct(item.value)} / 参考线 ${fmt.pct(item.target)}</p><p>可能原因：${escapeHtml(item.cause)}</p>${renderList(item.actions)}</article>`)
      .join("")}</div>
    ${renderCard("下一轮执行方向", review.next, `内容：${input.title}`)}
  `;
}

function buildCombinedReport() {
  if (!shopState || !reviewState) {
    return "请先分别生成 1 号商品运营方案和 4 号复盘诊断。";
  }
  const { input: shop, plan } = shopState;
  const { input: reviewInput, review } = reviewState;
  return `1 + 4 合并报告

一、模块来源
1 号：商品运营助手
4 号：短视频/直播增长复盘诊断台

二、商品信息
商品：${shop.productName}
类目：${shop.category}
平台：${shop.platform}
人群：${shop.audience}
价格：${shop.price}
卖点：${shop.sellingPoints}
顾虑：${shop.concerns || "暂无"}

三、1 号商品运营输出
商品标题：
${plan.titles.map((item) => `- ${item}`).join("\n")}

详情页承接：
${plan.detail.map((item) => `- ${item}`).join("\n")}

客服问答：
${plan.service.map((item) => `- ${item}`).join("\n")}

短视频脚本：
${plan.video.map((item) => `- ${item}`).join("\n")}

四、4 号复盘诊断
内容：${reviewInput.title}
增长评分：${review.score}（${review.verdict}）
播放量：${fmt.num(reviewInput.views)}
完播率：${fmt.pct(reviewInput.completionRate)}
互动率：${fmt.pct(review.metrics.interactionRate)}
上传视频：${reviewInput.videoUploaded ? reviewInput.videoName : "未上传"}

诊断：
${review.diagnosis.map((item) => `- ${item.key}：当前 ${fmt.pct(item.value)}，参考线 ${fmt.pct(item.target)}；${item.cause}`).join("\n")}

五、合并后的下一轮动作
${review.next.map((item) => `- ${item}`).join("\n")}
- 用 1 号模块生成的标题、客服和详情页素材，补齐 4 号诊断发现的留存、互动和卖点承接问题。
- 下一条内容只优先改一个最弱环节，避免同时改太多导致无法判断效果。`;
}

async function requestDoubao(report) {
  const response = await fetch("/api/doubao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report, shop: shopState, review: reviewState })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.detail || result.error || "豆包接口调用失败");
  return result;
}

shopSampleBtn.addEventListener("click", () => {
  fillForm(shopForm, shopSample);
  showToast("1 示例已填入");
});

reviewSampleBtn.addEventListener("click", () => {
  fillForm(reviewForm, reviewSample);
  showToast("4 示例已填入");
});

shopForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = formData(shopForm);
  const plan = buildShopPlan(input);
  shopState = { input, plan };
  renderShop();
  switchTab("shop");
  showToast("1 运营方案已生成");
});

reviewForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const raw = formData(reviewForm);
  const videoFile = reviewForm.elements.videoFile?.files?.[0];
  delete raw.videoFile;
  const input = {
    ...raw,
    views: Number(raw.views || 0),
    completionRate: Number(raw.completionRate || 0),
    likes: Number(raw.likes || 0),
    comments: Number(raw.comments || 0),
    videoUploaded: Boolean(videoFile),
    videoName: videoFile?.name || "未上传",
    notes: raw.notes || "暂无额外观察。"
  };
  const review = buildReview(input);
  reviewState = { input, review };
  renderReview();
  switchTab("review");
  showToast("4 复盘诊断已生成");
});

combineBtn.addEventListener("click", async () => {
  currentReport = buildCombinedReport();
  combinedOutput.textContent = currentReport;
  switchTab("combined");
  if (!shopState || !reviewState) {
    showToast("请先生成 1 和 4");
    return;
  }
  aiStatus.textContent = "正在请求豆包大模型深化合并报告。";
  aiOutput.textContent = "豆包生成中...";
  try {
    const result = await requestDoubao(currentReport);
    aiStatus.textContent = `豆包生成完成，模型：${result.model || "Doubao"}`;
    aiOutput.textContent = result.content || "豆包没有返回内容。";
    currentReport += `\n\n六、豆包深化方案\n${aiOutput.textContent}`;
  } catch (error) {
    aiStatus.textContent = `豆包暂未启用：${error.message}`;
    aiOutput.textContent = "本地合并报告已经生成。若要启用豆包，请在服务器启动前配置 DOUBAO_API_KEY 或 ARK_API_KEY，并设置 DOUBAO_MODEL。";
  }
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

async function loadConfigStatus() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    aiStatus.textContent = config.doubaoEnabled
      ? `豆包接口已启用，模型：${config.model}`
      : `豆包接口已配置，等待填写 DOUBAO_API_KEY；当前模型：${config.model}`;
  } catch (error) {
    aiStatus.textContent = "豆包配置状态读取失败，请确认本地服务已启动。";
  }
}

copyBtn.addEventListener("click", () => {
  const text = currentReport || combinedOutput.textContent;
  if (!text.trim()) {
    showToast("暂无可复制内容");
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  showToast("已复制");
});

downloadBtn.addEventListener("click", () => {
  const text = currentReport || combinedOutput.textContent;
  if (!text.trim()) {
    showToast("暂无可下载内容");
    return;
  }
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "1和4合并报告.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("已下载");
});

loadConfigStatus();
