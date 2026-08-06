export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  try {
    const response = await fetch(`https://github.io{Date.now()}`);
    if (!response.ok) return res.status(200).json({ status: 'offline', url: '' });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(200).json({ status: 'offline', url: '' });
  }
}
