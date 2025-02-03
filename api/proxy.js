export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const { host, pathname } = url;

  if (pathname === '/robots.txt') {
    const robots = `User-agent: *
Disallow: /`;
    return res.status(200).send(robots);
  }

  const targetDomains = ['castopia-wiki.wikidot.com', 'www.wikidot.com', 'castopia-wiki.wdfiles.com', 'd3g0gp89917ko0.cloudfront.net'];
  let targetDomain = 'castopia-wiki.wikidot.com';

  if (targetDomains.some(domain => host.endsWith(domain))) {
    targetDomain = host;
  }

  const origin = `https://${targetDomain}`;
  const actualUrl = new URL(`${origin}${pathname}${url.search}${url.hash}`);

  const modifiedRequestInit = {
    method: req.method,
    headers: req.headers,
    redirect: 'follow',
  };

  if (!['GET', 'HEAD'].includes(req.method)) {
    const requestBody = await req.arrayBuffer();
    modifiedRequestInit.body = requestBody;
  }

  const response = await fetch(actualUrl, modifiedRequestInit);
  let body = await response.arrayBuffer();
  const contentType = response.headers.get('content-type');

  if (contentType && /^(application\/x-javascript|text\/)/i.test(contentType)) {
    let text = new TextDecoder('utf-8').decode(body);

    text = text.replace(new RegExp(`(//|https?://)(${targetDomains.join('|')})`, 'g'), `$1${host}`);

    text = text.replace(/http:\/\/(?!localhost|127\.0\.0\.1)([^"']+)/g, 'https://$1');

    text = removeAdScripts(text);

    text = replaceLoginStatus(text);

    body = new TextEncoder().encode(text).buffer;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', contentType);
  res.status(response.status).send(Buffer.from(body));
}

function removeAdScripts(text) {
  return text.replace(/<script[^>]*>(.*?)<\/script>/gs, (match, scriptContent) => {
    if (/\"wording\"\s*:\s*\"Report Ad\"/.test(scriptContent) ||
        /(floors\.nitropay\.com|id5-sync\.com)/.test(scriptContent)) {
      return '';
    }
    return match;
  });
}

function replaceLoginStatus(text) {
  const loginStatusRegex = /<div id="login-status">.*?<\/div>/s;
  const newContent = '<div id="login-status"><a href="http://castopia.ct.ws" class="login-status-create-account btn">Прокси-зеркало</a> <span>|</span> <a href="http://wd.castopia.ct.ws" class="login-status-sign-in btn btn-primary">Wikidot</a></div>';
  return text.replace(loginStatusRegex, newContent);
}
