import axios from 'axios';
import cheerio from 'cheerio';

const COOKIES = {
  ndus: "Yqd-qvxteHuigE8m6i_1sEgTad5vngX9GwOIikPn",
  ndut_fmt: "8BEDC2A50D775C049067A46C41A0DA4361937F47F93593432982EA62AB8F7F95",
  csrfToken: "jatzUDpac52v8nLyA5hhWegj",
  browserid: "dh20y9KBRIRHefdo77AIeybVRddJnvWR0uRIm0RVmVpVmzfYN4si2-XoNVE=",
  lang: "en"
};

export default async function handler(req, res) {
  const { link } = req.query;

  if (!link || !link.includes('terabox')) {
    return res.status(400).json({ error: 'Invalid or missing TeraBox link' });
  }

  try {
    const page = await axios.get(link, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      withCredentials: true,
      headersCookie: Object.entries(COOKIES).map(([k, v]) => `${k}=${v}`).join('; ')
    });

    const $ = cheerio.load(page.data);
    const script = $('script').filter((i, el) => $(el).html().includes('window.viewData')).first().html();
    const jsonText = script.match(/window\.viewData\s*=\s*(\{.*?\});/s)[1];
    const data = JSON.parse(jsonText);

    const { sign, timestamp, shareid, share_uk: uk, sekey, file_list } = data;
    const fs_id = file_list[0].fs_id;

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
      sekey
    };

    const dlRes = await axios.get('https://data.terabox.com/rest/2.0/share/download', {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Cookie': Object.entries(COOKIES).map(([k, v]) => `${k}=${v}`).join('; ')
      }
    });

    if (dlRes.data.errno !== 0) {
      return res.status(500).json({ error: 'Failed to get download link', detail: dlRes.data });
    }

    return res.json({
      filename: file_list[0].server_filename,
      download_url: dlRes.data.list[0].dlink
    });

  } catch (err) {
    return res.status(500).json({ error: 'Error occurred', detail: err.message });
  }
}
