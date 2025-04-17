import axios from 'axios';
import cheerio from 'cheerio';

export default async function handler(req, res) {
  const { link } = req.query;

  if (!link || !link.includes('terabox')) {
    return res.status(400).json({ error: 'Invalid or missing TeraBox link' });
  }

  try {
    // Fetch the share page
    const response = await axios.get(link, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    // Load the HTML into cheerio
    const $ = cheerio.load(response.data);

    // Extract the script containing window.viewData
    const scriptContent = $('script')
      .filter((i, el) => $(el).html().includes('window.viewData'))
      .html();

    if (!scriptContent) {
      return res.status(500).json({ error: 'Failed to extract viewData' });
    }

    // Extract the JSON data from the script
    const jsonText = scriptContent.match(/window\.viewData\s*=\s*(\{.*?\});/s)[1];
    const data = JSON.parse(jsonText);

    const { sign, timestamp, shareid, share_uk: uk, sekey, file_list } = data;
    const fs_id = file_list[0].fs_id;

    // Construct the API request to get the direct download link
    const params = {
      app_id: '250528',
      channel: 'chunlei',
      clienttype: '0',
      web: '1',
      sign,
      timestamp,
      shareid,
      uk,
      fid_list: `["${fs_id}"]`,
      primaryid: shareid,
      sekey,
    };

    const apiResponse = await axios.get('https://data.terabox.com/rest/2.0/share/download', {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (apiResponse.data.errno !== 0) {
      return res.status(500).json({ error: 'Failed to get download link', detail: apiResponse.data });
    }

    const downloadLink = apiResponse.data.list[0].dlink;

    return res.json({
      filename: file_list[0].server_filename,
      download_url: downloadLink,
    });
  } catch (error) {
    return res.status(500).json({ error: 'An error occurred', detail: error.message });
  }
}
