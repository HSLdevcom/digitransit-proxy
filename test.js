let chai = require('chai');
let chaiHttp = require('chai-http');
const expect=chai.expect;
const assert = chai.assert;

chai.use(chaiHttp);

function get(host, path) {
  const req = chai.request('http://127.0.0.1:9000')
  .get(path)
  .redirects(0)
  if (host) {
    req.set('host', host)
  }
  return req
}

function httpsGet(host, path) {
  return get(host, path)
    .set('X-Forwarded-Proto','https')
}

function parse(json) {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.log(json + ' did not parse to JSON', error)
  }
}

function verifyHost(host, res) {
  let content = parse(res.text);
  expect(content.host).to.be.equal(host);
}

function verifyForwardedHost(host, res) {
  let content = parse(res.text);
  expect(content['x-forwarded-host']).to.be.equal(host);
}

function testProxying(host, path, proxyTo, secure) {
  it(host + path + ' should be proxied to container at ' + proxyTo, function(done) {
    const verify = (err,res) => {
      expect(err).to.be.null;
      verifyHost(proxyTo, res);
      // verifyForwardedHost(host, res);
      done();
    };
    let fn = secure?httpsGet:get;

    fn(host, path).end(verify);
  });
}

function testCaching(host, path, secure) {
  it(host + path + ' should be proxied and cached', function(done) {
    const verifyCacheMiss = (res) => {
      expect(res.headers['x-proxy-cache']).to.be.equal('MISS');
    }

    const verifyCacheHit = (res) => {
      expect(res.headers['x-proxy-cache']).to.be.equal('HIT');
    }

    let fn = secure?httpsGet:get;

    fn(host, path)
      .then(verifyCacheMiss)
      .then(()=>{
        return fn(host, path).then(verifyCacheHit);
      })
      .then(done)
      .catch((e)=>{done(e)})
  });
}

function testRedirect(host, path, expectedUrl, secure=false) {
  let fn = secure?httpsGet:get;
  it('request to ' + host + path + ' should redirect to ' + expectedUrl, function(done) {
    fn(host,path).end((err,res)=>{
      expect(res).to.redirect;
      expect(res).to.redirectTo(expectedUrl);
      done();
    });
  });
}

function testCallingWithoutCredentials(host, path, secure=false) {
  let fn = secure?httpsGet:get;
  it('request to ' + host + path + ' 401 Unauthorized without credentials ', function(done) {
    fn(host,path).end((err,res)=>{
      expect(res).to.have.status(401);
      done();
    });
  });
}

function testWithCorrectCredentials(host, path, username, password, expectedUrl, secure=true) {
  let fn = secure ? httpsGet : get;
  
  it('request to ' + host + path + ' should return 200 OK with correct credentials ', function(done) {
    fn(host, path)
      .set('Authorization', 'Basic ' + Buffer.from(username + ':' + password).toString('base64'))
      .end((err, res) => {
        expect(res).to.have.status(200);
        done();
      });
  });
}

function testResponseCode(host, path, code, secure=true) {
  let fn = secure ? httpsGet : get;

  it('request to ' + host + path + ' should return ' + code, function(done) {
    fn(host, path).end((err, res) => {
        expect(res).to.have.status(code);
        done();
      });
  });
}

function testResponseHeader(host, path, header, headerValue) {
  it('http request to ' + host + path + ' should have response header: ' + header + ' should have value: ' + headerValue, function(done) {
    get(host,path).end((err,res)=>{
      expect(res.headers[header]).to.be.equal(headerValue);
      done();
    });
  });
}

function testResponseHeaderHttps(host, path, header, headerValue) {
  it('http request to ' + host + path + ' should have response header: ' + header + ' should have value: ' + headerValue, function(done) {
    httpsGet(host,path).end((err,res)=>{
      expect(res.headers[header]).to.be.equal(headerValue);
      done();
    });
  });
}

describe('api.digitransit.fi', function() {

  it('https should not redirect', function(done) {
    httpsGet('api.digitransit.fi','/geocoding/v1/').end((err,res)=>{
      expect(err).to.be.null;
      done();
    });
  });

  it('/ should contain static content', function(done) {
    get('api.digitransit.fi','/').end((err,res)=>{
      expect(err).to.be.null;
      expect(res.statusCode).to.be.equal(200);
      expect(res.text).to.contain('Digitransit APIs');
      done();
    });
  });

  const v2routers = ['finland', 'hsl', 'waltti', 'waltti-alt', 'varely'];

  v2routers.forEach(function(router) {
    testProxying('api.digitransit.fi',`/routing/v2/routers/${router}/index/graphql`, `opentripplanner-${router}-v2:8080`);
    testProxying('api.digitransit.fi',`/routing/v2/${router}/gtfs/v1`, `opentripplanner-${router}-v2:8080`);
    testProxying('api.digitransit.fi',`/routing/v2/${router}/health`, `opentripplanner-${router}-v2:8080`);
    testResponseHeader('api.digitransit.fi',`/routing-data/v3/${router}/router-config.json`, 'access-control-allow-origin', '*');
    testProxying('api.digitransit.fi',`/routing-data/v3/${router}/router-config.json`,`opentripplanner-data-server-${router}-v3:8080`);
    testProxying('api.digitransit.fi',`/map/v3/${router}/en/rental-stations/`, `opentripplanner-${router}-v2:8080`);
  });

  testProxying('api.digitransit.fi','/geocoding/v1/','pelias-api:8080');
  testCaching('api.digitransit.fi','/geocoding/v1/search?digitransit-subscription-key=1234567890&text=porin%20tori', true);
  testCaching('api.digitransit.fi', '/geocoding/v1/reverse?digitransit-subscription-key=1234567890&point.lat=60.199284&point.lon=24.940540&size=1', true)
  testCaching('api.digitransit.fi', '/geocoding/v1/autocomplete?digitransit-subscription-key=1234567890&text=kamp&layers=address', true)
  testProxying('api.digitransit.fi','/graphiql/hsl','graphiql:8080');
  testProxying('api.digitransit.fi','/realtime/trip-updates/v1/FOLI','siri2gtfsrt:8080');
  //testCaching('api.digitransit.fi','/realtime/trip-updates/v1/foo', false)
  testProxying('api.digitransit.fi','/map/v2/','hsl-map-server:8080');
  testProxying('api.digitransit.fi','/map/v3/hsl-map/','hsl-map-server:8080');
  testProxying('api.digitransit.fi','/map/v3-kela/kela/en/rental-stations/','opentripplanner-kela-v2:8080');
  testProxying('dev-api.digitransit.fi','/routing/v2-kela/routers/kela/index/graphql','opentripplanner-kela-v2:8080');
  testProxying('api.digitransit.fi','/ui/v3/matka/sw.js','digitransit-ui-matka-v3:8080');
  testProxying('api.digitransit.fi','/ui/v3/hsl/sw.js','digitransit-ui-hsl-v3:8080');
  testProxying('api.digitransit.fi','/ui/v3/waltti/sw.js','digitransit-ui-waltti-v3:8080');
  testProxying('api.digitransit.fi','/ui/v3/matka/sw.js','digitransit-ui-matka-v3:8080');
  testProxying('api.digitransit.fi','/ui/v3/hsl/sw.js','digitransit-ui-hsl-v3:8080');
  testProxying('api.digitransit.fi','/ui/v3/waltti/sw.js','digitransit-ui-waltti-v3:8080');
});

describe('hsl ui', function() {
  testRedirect('reittiopas.fi','/kissa','https://reittiopas.hsl.fi/kissa');
  testRedirect('reittiopas.fi','/','https://hsl.fi/?fromJourneyPlanner=true');
  testRedirect('www.reittiopas.fi','/kissa','https://reittiopas.hsl.fi/kissa', true);
  testResponseHeader('www.reittiopas.fi','/', 'x-robots-tag', 'noindex, nofollow, nosnippet, noarchive');
  testRedirect('reittiopas.fi','/haku','https://reittiopas.hsl.fi/haku');
  testResponseHeader('www.reittiopas.fi','/haku', 'X-Frame-Options', undefined);
  testRedirect('dev.reittiopas.fi','/kissa','https://dev.reittiopas.fi/kissa');

  it('https should not redirect', function(done) {
    httpsGet('reittiopas.hsl.fi','/kissa').end((err,res)=>{
      expect(err).to.be.null;
      done();
    });
  });

  testProxying('dev.reittiopas.fi','/etusivu','digitransit-ui-hsl-v3:8080', true);

  testRedirect('reittiopas.hsl.fi','/','https://hsl.fi/?fromJourneyPlanner=true', true);
  testProxying('reittiopas.hsl.fi','/kissa','digitransit-ui-hsl-v3:8080', true);

  testCaching('reittiopas.hsl.fi','/sw.js', true);

  //next-dev site
  testRedirect('www.next-dev-hsl.digitransit.fi','/kissa','http://next-dev-hsl.digitransit.fi/kissa');
  testRedirect('next-dev-hsl.digitransit.fi','/kissa','https://next-dev-hsl.digitransit.fi/kissa');
  testProxying('next-dev-hsl.digitransit.fi','/kissa','digitransit-ui-hsl-test:8080', true);
  testCaching('next-dev-hsl.digitransit.fi','/sw.js', true);
});

describe('matka ui', function() {
  testRedirect('www.opas.matka.fi','/kissa','http://opas.matka.fi/kissa');
  testRedirect('opas.matka.fi','/kissa','https://opas.matka.fi/kissa');

  testProxying('opas.matka.fi','/','digitransit-ui-matka-v3:8080', true);

  testCaching('opas.matka.fi','/sw.js', true);

  it('https should not redirect', function(done) {
    httpsGet('opas.matka.fi','/kissa').end((err,res)=>{
      expect(err).to.be.null;
      done();
    });
  });
});

describe('fintraffic ui', function() {
  testRedirect('www.matka.fintraffic.fi','/kissa','http://matka.fintraffic.fi/kissa');
  testRedirect('matka.fintraffic.fi','/kissa','https://matka.fintraffic.fi/kissa');

  testProxying('matka.fintraffic.fi','/','digitransit-ui-matka-v3:8080', true);

  testCaching('matka.fintraffic.fi','/sw.js', true);

  it('https should not redirect', function(done) {
    httpsGet('matka.fintraffic.fi','/kissa').end((err,res)=>{
      expect(err).to.be.null;
      done();
    });
  });
});

describe('waltti ui', function() {
  const walttiCities = [
    'hameenlinna', 'joensuu', 'jyvaskyla', 'kotka', 'lahti', 'lappeenranta',
    'mikkeli', 'turku', 'tampere','kouvola', 'rovaniemi','vaasa'
  ];

  walttiCities.forEach(function(city) {
    testRedirect(city+'.digitransit.fi','/kissa','https://'+city+'.digitransit.fi/kissa');
    testProxying(city+'.digitransit.fi','/','digitransit-ui-waltti-v3:8080', true);
  });

  testRedirect('reittiopas.foli.fi','/kissa','https://reittiopas.foli.fi/kissa');
  testProxying('reittiopas.foli.fi','/','digitransit-ui-waltti-v3:8080', true);

  testRedirect('reittiopas.hameenlinna.fi','/kissa','https://reittiopas.hameenlinna.fi/kissa');
  testProxying('reittiopas.hameenlinna.fi','/','digitransit-ui-waltti-v3:8080', true);

  testRedirect('repa.tampere.fi','/kissa','https://repa.tampere.fi/kissa');
  testProxying('repa.tampere.fi','/','digitransit-ui-waltti-v3:8080', true);

  testRedirect('reittiopas.tampere.fi','/kissa','https://reittiopas.tampere.fi/kissa');
  testProxying('reittiopas.tampere.fi','/','digitransit-ui-waltti-v3:8080', true);
  testCaching('reittiopas.tampere.fi','/sw.js', true);

  testRedirect('oulu.digitransit.fi','/kissa','https://reittiopas.osl.fi/kissa');
  testProxying('reittiopas.osl.fi','/','digitransit-ui-waltti-v3:8080', true);

  testRedirect('opas.waltti.fi','/kissa','https://opas.waltti.fi/kissa');
  testProxying('opas.waltti.fi','/','digitransit-ui-waltti-v3:8080', true);

  testRedirect('opas.waltti.fi','/haku','https://opas.waltti.fi/haku');
  testResponseHeaderHttps('opas.waltti.fi','/haku', 'X-Frame-Options', undefined);
  testResponseHeaderHttps('opas.waltti.fi','/haku', 'x-robots-tag', 'noindex, nofollow, nosnippet, noarchive');

  testRedirect('dev-waltti.digitransit.fi','/kissa','https://dev-waltti.digitransit.fi/kissa');
  testProxying('dev-waltti.digitransit.fi','/','digitransit-ui-waltti-v3:8080', true);

  testRedirect('dev-raasepori.digitransit.fi','/kissa','https://dev-raasepori.digitransit.fi/kissa');
  testProxying('dev-raasepori.digitransit.fi','/','digitransit-ui-waltti-v3:8080', true);
  testRedirect('bosse.digitransit.fi','/kissa','https://bosse.digitransit.fi/kissa');
  testProxying('bosse.digitransit.fi','/','digitransit-ui-waltti-v3:8080', true);

  testRedirect('reittiopas.kuopio.fi','/kissa','https://reittiopas.kuopio.fi/kissa');
  testProxying('reittiopas.kuopio.fi','/','digitransit-ui-waltti-v3:8080', true);
  testRedirect('kuopio.digitransit.fi','/kissa','https://reittiopas.kuopio.fi/kissa');
  
  it('https should not redirect', function(done) {
    httpsGet('turku.digitransit.fi','/kissa').end((err,res)=>{
      expect(err).to.be.null;
      done();
    });
  });
});
describe('yleisviestipalvelu', function() {
  testCaching('matka-yleisviesti.digitransit.fi','/', true);
  testProxying('matka-yleisviesti.digitransit.fi','/','yleisviestipalvelu:8080', true);
  testRedirect('matka-yleisviesti.digitransit.fi','/kissa','https://matka-yleisviesti.digitransit.fi/kissa');
  testCaching('dev-matka-yleisviesti.digitransit.fi','/', true);
  testProxying('dev-matka-yleisviesti.digitransit.fi','/','yleisviestipalvelu:8080', true);
  testRedirect('dev-matka-yleisviesti.digitransit.fi','/kissa','https://dev-matka-yleisviesti.digitransit.fi/kissa');
});

describe('digitransit', function() {
  testProxying('digitransit.fi','/','digitransit-site:8080', true);
});

describe('otp debug uis without authentication', function() {
  testProxying('dev-hsl-debug.digitransit.fi','/','opentripplanner-hsl-v2:8080', true);
  testProxying('dev-waltti-debug.digitransit.fi','/','opentripplanner-waltti-v2:8080', true);
  testProxying('dev-finland-debug.digitransit.fi','/','opentripplanner-finland-v2:8080', true);
  testProxying('dev-varely-debug.digitransit.fi','/','opentripplanner-varely-v2:8080', true);
  testProxying('waltti-alt-debug.digitransit.fi','/','opentripplanner-waltti-alt-v2:8080', true);
});

describe('tampere salespoints endpoint', function() {
  it('should return GeoJSON with CORS headers', function(done) {
    get('api.digitransit.fi', '/waltti-assets/v1/salespoints/salespoints_tampere.geojson')
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res).to.have.header('access-control-allow-origin', '*');

        const json = parse(res.text);
        expect(json).to.be.an('object');
        expect(json).to.have.property('type', 'FeatureCollection');
        done();
      });
  });
});

describe('oulu salespoints endpoint', function() {
  it('should return GeoJSON with CORS headers', function(done) {
    get('api.digitransit.fi', '/oulu-assets/v1/lipunmyyntipisteet')
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res).to.have.header('access-control-allow-origin', '*');

        const json = parse(res.text);
        expect(json).to.be.an('object');
        expect(json).to.have.property('type', 'FeatureCollection');
        done();
      });
  });
});

describe('kotka salespoints endpoint', function() {
  it('should return GeoJSON with CORS headers', function(done) {
    get('api.digitransit.fi', '/waltti-assets/v1/salespoints/salespoints_kotka.json')
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res).to.have.header('access-control-allow-origin', '*');
        const json = parse(res.text);
        expect(json).to.be.an('object');
        expect(json).to.have.property('type', 'FeatureCollection');
        done();
      });
  });
});

describe('otp debug UIs with authentication', function() {
  testCallingWithoutCredentials('hsl-debug.digitransit.fi','/',true);
  testWithCorrectCredentials('hsl-debug.digitransit.fi','/','test','test','https://hsl-debug.digitransit.fi/',true);
  testCallingWithoutCredentials('waltti-debug.digitransit.fi','/',true);
  testWithCorrectCredentials('waltti-debug.digitransit.fi','/','walttitest','walttitest','https://waltti-debug.digitransit.fi/',true);
  testCallingWithoutCredentials('finland-debug.digitransit.fi','/',true);
  testWithCorrectCredentials('finland-debug.digitransit.fi','/','test','test','https://finland-debug.digitransit.fi/',true);
  testCallingWithoutCredentials('varely-debug.digitransit.fi','/',true);
  testWithCorrectCredentials('varely-debug.digitransit.fi','/','test','test','https://varely-debug.digitransit.fi/',true);
  testCallingWithoutCredentials('kela-debug.digitransit.fi','/',true);
  testWithCorrectCredentials('kela-debug.digitransit.fi','/','test','test','https://kela-debug.digitransit.fi/',true);
  testCallingWithoutCredentials('dev-kela-debug.digitransit.fi','/',true);
  testWithCorrectCredentials('dev-kela-debug.digitransit.fi','/','test','test','https://dev-kela-debug.digitransit.fi/',true);
});

describe('monitoring setup', function() {
  testRedirect('monitoring.digitransit.fi','/kissa','https://monitoring.digitransit.fi/kissa');
  testProxying('monitoring.digitransit.fi','/','monitoring-setup-grafana.monitoring.svc.cluster.local:8080', true);
  testRedirect('dev-monitoring.digitransit.fi','/kissa','https://dev-monitoring.digitransit.fi/kissa');
  testProxying('dev-monitoring.digitransit.fi','/','monitoring-setup-grafana.monitoring.svc.cluster.local:8080', true);
});

describe('otp debug UIs with path beginning with "/otp/actuators" should return 404', function() {
  testResponseCode('hsl-debug.digitransit.fi','/otp/actuators', 404, true);
  testResponseCode('waltti-debug.digitransit.fi','/otp/actuators', 404, true);
  testResponseCode('finland-debug.digitransit.fi','/otp/actuators', 404, true);
  testResponseCode('varely-debug.digitransit.fi','/otp/actuators', 404, true);
  testResponseCode('kela-debug.digitransit.fi','/otp/actuators', 404, true);
  testResponseCode('dev-kela-debug.digitransit.fi','/otp/actuators', 404, true);
  testResponseCode('dev-hsl-debug.digitransit.fi','/otp/actuators', 404, true);
  testResponseCode('dev-waltti-debug.digitransit.fi','/otp/actuators', 404, true);
  testResponseCode('dev-finland-debug.digitransit.fi','/otp/actuators', 404, true);
  testResponseCode('dev-varely-debug.digitransit.fi','/otp/actuators', 404, true);
  testResponseCode('waltti-alt-debug.digitransit.fi','/otp/actuators', 404, true);
  testResponseCode('hsl-debug.digitransit.fi','/otp/actuators/prometheus', 404, true);
  testResponseCode('waltti-debug.digitransit.fi','/otp/actuators/prometheus', 404, true);
  testResponseCode('finland-debug.digitransit.fi','/otp/actuators/prometheus', 404, true);
  testResponseCode('varely-debug.digitransit.fi','/otp/actuators/prometheus', 404, true);
  testResponseCode('kela-debug.digitransit.fi','/otp/actuators/prometheus', 404, true);
  testResponseCode('dev-kela-debug.digitransit.fi','/otp/actuators/prometheus', 404, true);
  testResponseCode('dev-hsl-debug.digitransit.fi','/otp/actuators/prometheus', 404, true);
  testResponseCode('dev-waltti-debug.digitransit.fi','/otp/actuators/prometheus', 404, true);
  testResponseCode('dev-finland-debug.digitransit.fi','/otp/actuators/prometheus', 404, true);
  testResponseCode('dev-varely-debug.digitransit.fi','/otp/actuators/prometheus', 404, true);
  testResponseCode('waltti-alt-debug.digitransit.fi','/otp/actuators/prometheus', 404, true);
});

describe('ext-proxy', function() {
  this.timeout(5000);
  testCaching(null,'/out/helsinki-fi.smoove.pro/api-public/stations',false);
  testCaching(null,'/out/data.foli.fi/gtfs-rt/reittiopas',false);
  testCaching(null,'/out/stables.donkey.bike/api/public/gbfs/2/donkey_lappeenranta/en/station_status.json',false);
});

describe('waltti-test ui', function() {
  testRedirect('waltti-test.digitransit.fi','/kissa','https://waltti-test.digitransit.fi/kissa');
  testProxying('waltti-test.digitransit.fi','/','digitransit-ui-waltti-test:8080', true);
});
