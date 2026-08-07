export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

  try {
    const owner = "nugasnugis";
    const repo = "axtest-Web";

    // 1. Get the ID of the currently running workflow run directly from GitHub's live database
    const runCheckUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs?status=in_progress&per_page=1&t=${Date.now()}`;
    const runResponse = await fetch(runCheckUrl, {
      headers: {
        'Authorization': `token ${process.env.GH_PAT}`,
        'User-Agent': 'DistroSea-Live-Tracker',
        'Accept': 'application.vnd.github+json'
      }
    });

    const runData = await runResponse.json();

    // If no workflow is actively spinning, tell the frontend the cluster is dead
    if (!runData.workflow_runs || runData.workflow_runs.length === 0) {
      return res.status(200).json({ status: 'offline', url: '' });
    }

    const runId = runData.workflow_runs[0].id;

    // 2. Fetch the raw console logs of the running machine live from GitHub's server memory heap
    const logsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/logs`;
    const logsResponse = await fetch(logsUrl, {
      headers: {
        'Authorization': `token ${process.env.GH_PAT}`,
        'User-Agent': 'DistroSea-Live-Tracker'
      }
    });

    // If logs aren't ready yet, keep waiting
    if (!logsResponse.ok) {
      return res.status(200).json({ status: 'booting', url: '' });
    }

    const rawLogsText = await logsResponse.text();

    // 3. REGEX PARSER: Look directly inside the terminal log text for the localhost.run address string
    const match = rawLogsText.match(/https:\/\/[a-zA-Z0-9.-]+\.(lhrtunnel\.link|lhr\.life|localhost\.run)/);

    if (match && match[0]) {
      const liveTunnelUrl = match[0].trim();
      // Instantly return the link to the website frontend, bypassing all CDN file lag!
      return res.status(200).json({ 
        status: 'ready', 
        url: `${liveTunnelUrl}?autoconnect=true&resize=scale` 
      });
    }

    // If the tunnel text hasn't printed yet, keep the loader spinning
    return res.status(200).json({ status: 'booting', url: '' });

  } catch (err) {
    return res.status(200).json({ status: 'offline', url: '' });
  }
}
