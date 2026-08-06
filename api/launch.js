export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch('https://api.github.com/repos/nugasnugis/axtest-Web/dispatches', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GH_PAT}`,
        'Accept': 'application.vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'DistroSea-Clone'
      },
      body: JSON.stringify({ event_type: 'launch_os', client_payload: {} })
    });
    return res.status(200).json({ success: response.ok });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
