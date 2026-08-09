const OWNER = "nugasnugis";
const REPO = "axtest-Web";
const BRANCH = "main";

function githubHeaders() {
  return {
    Authorization: `Bearer ${process.env.GH_PAT}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10",
    "User-Agent": "AxelOS-Launcher"
  };
}

async function getSession() {
  const url =
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/session.json` +
    `?ref=${encodeURIComponent(BRANCH)}&cacheBust=${Date.now()}`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: githubHeaders()
  });

  if (!response.ok) {
    throw new Error(`session.json request failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.encoding !== "base64" || !data.content) {
    throw new Error("Invalid session.json response");
  }

  const content = Buffer
    .from(data.content.replace(/\n/g, ""), "base64")
    .toString("utf8");

  return JSON.parse(content);
}

async function getRunningWorkflow() {
  const url =
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs` +
    `?status=in_progress&per_page=10&cacheBust=${Date.now()}`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: githubHeaders()
  });

  if (!response.ok) {
    throw new Error(`Actions request failed: ${response.status}`);
  }

  return response.json();
}

function validCloudflareUrl(url) {
  if (typeof url !== "string" || !url) {
    return false;
  }

  return /^https:\/\/[a-zA-Z0-9.-]+\.trycloudflare\.com\/vnc\.html/.test(url);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Cache-Control");

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      status: "offline",
      url: "",
      error: "Method not allowed"
    });
  }

  try {
    if (!process.env.GH_PAT) {
      throw new Error("GH_PAT is not configured");
    }

    const [session, runs] = await Promise.all([
      getSession(),
      getRunningWorkflow()
    ]);

    const workflowRunning =
      Array.isArray(runs.workflow_runs) &&
      runs.workflow_runs.length > 0;

    const status = session?.status || "offline";
    const url = session?.url || "";

    /*
     * If the Actions run disappeared, the VM is no longer
     * considered live even if session.json is stale.
     */
    if (!workflowRunning) {
      return res.status(200).json({
        status: "offline",
        url: ""
      });
    }

    if (
      (status === "ready" || status === "active") &&
      validCloudflareUrl(url)
    ) {
      return res.status(200).json({
        status,
        url,
        session_id: session.session_id || ""
      });
    }

    if (status === "booting") {
      return res.status(200).json({
        status: "booting",
        url: "",
        session_id: session.session_id || ""
      });
    }

    return res.status(200).json({
      status: "booting",
      url: "",
      session_id: session.session_id || ""
    });

  } catch (error) {
    console.error("AxelOS status error:", error);

    return res.status(200).json({
      status: "offline",
      url: "",
      error: "Unable to read AxelOS session state"
    });
  }
}
