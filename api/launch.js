const OWNER = "nugasnugis";
const REPO = "axtest-Web";

function githubHeaders() {
  return {
    Authorization: `Bearer ${process.env.GH_PAT}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10",
    "User-Agent": "AxelOS-Vercel-Launcher"
  };
}

async function getSession() {
  const response = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/session.json?ref=main&cacheBust=${Date.now()}`,
    {
      cache: "no-store",
      headers: githubHeaders()
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  if (!data.content) {
    return null;
  }

  const content = Buffer
    .from(data.content.replace(/\n/g, ""), "base64")
    .toString("utf8");

  return JSON.parse(content);
}

async function getRunningRuns() {
  const response = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs?status=in_progress&per_page=10&cacheBust=${Date.now()}`,
    {
      cache: "no-store",
      headers: githubHeaders()
    }
  );

  if (!response.ok) {
    throw new Error(
      `GitHub Actions API returned ${response.status}`
    );
  }

  return response.json();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    if (!process.env.GH_PAT) {
      return res.status(500).json({
        success: false,
        error: "GH_PAT is not configured in Vercel."
      });
    }

    /*
     * First check the authoritative session state.
     */

    const session = await getSession();

    if (session) {

      if (
        session.status === "ready" &&
        session.url
      ) {
        return res.status(200).json({
          success: true,
          queueLocked: true,
          status: "ready",
          url: session.url,
          existing: true
        });
      }

      if (session.status === "active") {
        return res.status(200).json({
          success: false,
          queueLocked: true,
          status: "active",
          error: "AxelOS is currently in use."
        });
      }

      if (session.status === "booting") {
        return res.status(200).json({
          success: false,
          queueLocked: true,
          status: "booting",
          error: "AxelOS is already starting."
        });
      }
    }

    /*
     * Secondary lock: check GitHub Actions.
     */

    const runs = await getRunningRuns();

    if (
      Array.isArray(runs.workflow_runs) &&
      runs.workflow_runs.length > 0
    ) {
      return res.status(200).json({
        success: false,
        queueLocked: true,
        status: "booting",
        error: "AxelOS is already being provisioned."
      });
    }

    /*
     * Trigger repository_dispatch.
     */

    const dispatchResponse = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/dispatches`,
      {
        method: "POST",

        headers: {
          ...githubHeaders(),
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          event_type: "launch_os",

          client_payload: {
            source: "axelos-launcher",
            requested_at: new Date().toISOString()
          }
        })
      }
    );

    if (!dispatchResponse.ok) {
      const errorText =
        await dispatchResponse.text();

      throw new Error(
        `GitHub dispatch failed: ${dispatchResponse.status} ${errorText}`
      );
    }

    return res.status(200).json({
      success: true,
      queueLocked: true,
      status: "booting"
    });

  } catch (error) {
    console.error("AxelOS launch error:", error);

    return res.status(500).json({
      success: false,
      queueLocked: false,
      status: "offline",
      error: error.message
    });
  }
}
