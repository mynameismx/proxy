export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const { host, pathname } = url;

  if (pathname === '/robots.txt') {
    const robots = `User-agent: *\nDisallow: /`;
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

    text = text.replace(new RegExp(`(//|https?://)(?!www\.w3\.org/2000/svg)(${targetDomains.join('|')})`, 'g'), `$1${host}`);
    text = text.replace(/http:\/\/(?!localhost|127\.0\.0\.1|www\.w3\.org\/2000\/svg)([^"']+)/g, 'https://$1');

    const formActionRegex = /<form.*?action="([^"]+)"/g;
    text = text.replace(formActionRegex, (match, action) => {
      const proxyAction = `https://${host}${action}`;
      return match.replace(action, proxyAction);
    });

    text = replaceLoginStatus(text);

    text = addJquery(text);
    
    text = addScript(text);

    body = new TextEncoder().encode(text).buffer;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', contentType);
  res.status(response.status).send(Buffer.from(body));
}

function replaceLoginStatus(text) {
  const loginStatusRegex = /<div id="login-status">.*?<\/div>/s;
  const newContent = '<div id="login-status"><a href="http://castopia.ct.ws" class="login-status-create-account btn">Прокси-зеркало</a> <span>|</span> <a href="http://wd.castopia.ct.ws" class="login-status-sign-in btn btn-primary">Wikidot</a></div>';
  return text.replace(loginStatusRegex, newContent);
}

function addJquery(text) {
  const jquery = `
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
  `;
  return text.replace(/<\/head>/i, `${script}</head>`);
}

function addScript(text) {
  const script = `
<script>
$(function() {
   $('.frame').load(function(){
		var target = this;
		var content = $(target).contents().find('body');
		$(target).height($(content).outerHeight(true));
 
		$(content).on("DOMSubtreeModified click", function (event){
			setTimeout(function(){
				$(target).stop().animate({height: $(content).outerHeight(true)}, 200);
			}, 400);
		});
	});
});
</script> 
  `;
  return text.replace(/<\/body>/i, `${script}</body>`);
}
