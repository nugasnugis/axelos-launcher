export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

  try {
    const owner = "nugasnugis";
    const repo = "axtest-Web";

    // 1. Fetch current active runs
    const runCheckUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs?status=in_progress&per_page=1&t=${Date.now()}`;
    const runResponse = await fetch(runCheckUrl, {
      headers: {
        'Authorization': `token ${process.env.GH_PAT}`,
        'User-Agent': 'DistroSea-Live-Tracker',
        'Accept': 'application.vnd.github+json'
      }
    });

    const runData = await runResponse.json();

    // FIXED: Properly check if workflow_runs array is populated
    if (!runData.workflow_runs || runData.workflow_runs.length === 0) {
      return res.status(200).json({ status: 'offline', url: '' });
    }

    // FIXED: Add [0] index accessor to extract the object parameters correctly
    const runId = runData.workflow_runs[0].id;

    // 2. Query individual job logs endpoint paths
    const jobsCheckUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs?per_page=1`;
    const jobsResponse = await fetch(jobsCheckUrl, {
      headers: {
        'Authorization': `token ${process.env.GH_PAT}`,
        'User-Agent': 'DistroSea-Live-Tracker',
        'Accept': 'application.vnd.github+json'
      }
    });
    
    const jobsData = await jobsResponse.json();
    if (!jobsData.jobs || jobsData.jobs.length === 0) {
      return res.status(200).json({ status: 'booting', url: '' });
    }

    const jobId = jobsData.jobs[0].id;

    // 3. Fetch unzipped plaintext terminal logging strings cleanly
    const logsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`;
    const logsResponse = await fetch(logsUrl, {
      headers: {
        'Authorization': `token ${process.env.GH_PAT}`,
        'User-Agent': 'DistroSea-Live-Tracker'
      }
    });

    if (!logsResponse.ok) {
      return res.status(200).json({ status: 'booting', url: '' });
    }

    const rawLogsText = await logsResponse.text();

    // 4. REGEX PARSER: Look directly inside the terminal log text for the localhost.run address string
    const match = rawLogsText.match(/https:\/\/[a-zA-Z0-9.-]+\.(lhrtunnel\.link|lhr\.life|localhost\.run)/);

    if (match && match[0]) {
      const liveTunnelUrl = match[0].trim();
      return res.status(200).json({ 
        status: 'ready', 
        url: `${liveTunnelUrl}?autoconnect=true&resize=scale` 
      });
    }

    return res.status(200).json({ status: 'booting', url: '' });

  } catch (err) {
    return res.status(200).json({ status: 'offline', url: '' });
  }
}
