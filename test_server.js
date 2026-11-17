let http=require('http');

let server = http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "application/json"});
  const body = {...request.headers, url: request.url};
  if (request.url.startsWith('/data/openmaptiles.json')) {
    body.tiles = [`https://${request.headers.host}/data/openmaptiles/{z}/{x}/{y}.pbf`];
  }
  response.write(JSON.stringify(body));
  response.end();
});

server.listen(8080);
