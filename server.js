const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const ROOT = __dirname;
loadEnvFile(path.join(ROOT, ".env"));

const PORT = Number(process.env.PORT || 8787);
const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "";
const DOUBAO_MODEL = process.env.DOUBAO_MODEL || process.env.ARK_MODEL || process.env.DOUBAO_ENDPOINT_ID || "doubao-seed-1-6-250615";
const DOUBAO_BASE_URL = process.env.DOUBAO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestPath = decodeURIComponent(url.pathname);
  const normalized = path
    .normalize(requestPath)
    .replace(/^[/\\]+/, "")
    .replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, normalized === "" ? "index.html" : normalized);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store"
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    res.end(data);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("请求内容过大"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("JSON 格式不正确"));
      }
    });
    req.on("error", reject);
  });
}

function buildDoubaoMessages(payload) {
  return [
    {
      role: "system",
      content:
        "你是一个资深抖音电商内容增长顾问。请用中文输出，内容要具体、可执行，避免空泛建议。必须围绕商品运营、短视频脚本、直播话术、店铺承接和数据复盘形成闭环。"
    },
    {
      role: "user",
      content: `请基于以下网页工具生成的基础数据，进一步输出更像真实业务顾问的方案。

要求：
1. 先给一句整体判断。
2. 输出 45 秒短视频完整分镜，包含时间、画面、口播、字幕。
3. 输出直播间 5 分钟循环话术。
4. 输出详情页首屏文案和客服快捷回复。
5. 输出下一轮需要追踪的 5 个指标。
6. 不要解释你是 AI，不要写“作为模型”。

输入数据：
${JSON.stringify(payload, null, 2)}`
    }
  ];
}

async function handleDoubao(req, res) {
  if (!DOUBAO_API_KEY) {
    sendJson(res, 503, {
      error: "未配置豆包 API Key",
      detail: "请在启动服务前设置 DOUBAO_API_KEY 或 ARK_API_KEY。"
    });
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const response = await fetch(DOUBAO_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DOUBAO_API_KEY}`
      },
      body: JSON.stringify({
        model: DOUBAO_MODEL,
        messages: buildDoubaoMessages(payload),
        temperature: 0.65,
        max_tokens: 1800
      })
    });

    const resultText = await response.text();
    let result;
    try {
      result = JSON.parse(resultText);
    } catch (error) {
      result = { raw: resultText };
    }

    if (!response.ok) {
      sendJson(res, response.status, {
        error: "豆包接口调用失败",
        detail: result.error?.message || result.message || resultText || `HTTP ${response.status}`
      });
      return;
    }

    const content = result.choices?.[0]?.message?.content || "";
    sendJson(res, 200, {
      content,
      model: DOUBAO_MODEL,
      usage: result.usage || null
    });
  } catch (error) {
    sendJson(res, 500, {
      error: "豆包生成失败",
      detail: error.message
    });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/config") {
    sendJson(res, 200, {
      doubaoEnabled: Boolean(DOUBAO_API_KEY),
      model: DOUBAO_MODEL,
      baseUrl: DOUBAO_BASE_URL
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/doubao") {
    handleDoubao(req, res);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(PORT, () => {
  console.log(`AI 电商内容增长工作台已启动：http://127.0.0.1:${PORT}`);
  console.log(DOUBAO_API_KEY ? `豆包模型已启用：${DOUBAO_MODEL}` : "豆包模型未启用：请设置 DOUBAO_API_KEY 或 ARK_API_KEY");
});
