export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  try {
    // Appending timestamp to the fetch URL bypasses GitHub Pages CDN static asset caching entirely
    const response = await fetch(`https://github.io${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) return res.status(200).json({ status: 'offline', url: '' });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(200).json({ status: 'offline', url: '' });
  }
}
