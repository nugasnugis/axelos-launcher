export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const owner = "nugasnugis";
    const repo = "axtest-Web";

    // 1. Ask GitHub's API directly for real-time runner status (Bypasses all cache bugs)
    const githubStatusUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs?status=in_progress&per_page=1`;
    const workflowCheck = await fetch(githubStatusUrl, {
      headers: {
        'Authorization': `token ${process.env.GH_PAT}`,
        'User-Agent': 'DistroSea-Queue-Engine',
        'Accept': 'application.vnd.github+json'
      }
    });

    const runData = await workflowCheck.json();

    // 2. HARD LOCK TRAFFIC RULE: If a runner is already spinning up or active, block the trigger
    if (runData.workflow_runs && runData.workflow_runs.length > 0) {
      return res.status(200).json({ 
        success: false, 
        queueLocked: true,
        error: "Server occupied. Added to queue pool." 
      });
    }

    // 3. If zero runners are spinning, press the physical power switch
    const launchResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${process.env.GH_PAT}`,
        'Accept': 'application.vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'AxelOS-Vercel-Proxy'
      },
      body: JSON.stringify({ event_type: 'launch_os', client_payload: {} })
    });

    return res.status(200).json({ 
      success: launchResponse.ok, 
      queueLocked: false 
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
