let chai = require('chai');
let chaiHttp = require('chai-http');
const expect=chai.expect;
const assert = chai.assert;

chai.use(chaiHttp);

function get(host, path) {
  return chai.request('http://127.0.0.1:9000')
    .get(path)
    .redirects(0)
    .set('host', host)
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
      verifyForwardedHost(host, res);
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

function testRedirect(host, path, expectedUrl) {
  it('http request to ' + host + path + ' should redirect to ' + expectedUrl, function(done) {
    get(host,path).end((err,res)=>{
      expect(err.status).to.be.equal(301);
      expect(err.response.header.location).to.be.equal(expectedUrl);
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

  testProxying('api.digitransit.fi','/geocoding/v1/','pelias-api:8080');
  testCaching('api.digitransit.fi','/geocoding/v1/foo', true);
  testProxying('api.digitransit.fi','/graphiql/hsl','graphiql:8080');
  testProxying('api.digitransit.fi','/realtime/siri2gtfsrt/v1/','siri2gtfsrt:8080');
  testCaching('api.digitransit.fi','/realtime/siri2gtfsrt/v1/foo', false)
  testProxying('api.digitransit.fi','/realtime/trip-updates/v1/','siri2gtfsrt:8080');
  testCaching('api.digitransit.fi','/realtime/trip-updates/v1/foo', false)
  testProxying('api.digitransit.fi','/realtime/hslalert/v1/','hslalert:8080');
  testCaching('api.digitransit.fi','/realtime/hslalert/v1/foo', false);
  testProxying('api.digitransit.fi','/realtime/service-alerts/v1/','hslalert:8080');
  testCaching('api.digitransit.fi','/realtime/service-alerts/v1/foo',false);
  testProxying('api.digitransit.fi','/realtime/navigator-server/v1/','navigator-server:8080');
  testCaching('api.digitransit.fi','/realtime/navigator-server/v1/foo',false);
  testProxying('api.digitransit.fi','/realtime/vehicle-positions/v1/','navigator-server:8080');
  testCaching('api.digitransit.fi','/realtime/vehicle-positions/v1/foo',false);
  testProxying('api.digitransit.fi','/realtime/mqtt-cache/v1/','navigator-server:8080');
  testCaching('api.digitransit.fi','/realtime/mqtt-cache/v1/foo',false);
  testProxying('api.digitransit.fi','/realtime/raildigitraffic2gtfsrt/v1/','raildigitraffic2gtfsrt:8080');
  testCaching('api.digitransit.fi','/realtime/raildigitraffic2gtfsrt/v1/foo',true);
  testProxying('api.digitransit.fi','/map/v1/','hsl-map-server:8080');
  testProxying('api.digitransit.fi','/routing/v1/routers/finland','opentripplanner-finland:8080');
  testProxying('api.digitransit.fi','/routing/v1/routers/hsl','opentripplanner-hsl:8080');
  testProxying('api.digitransit.fi','/routing/v1/routers/waltti','opentripplanner-waltti:8080');
  testProxying('api.digitransit.fi','/routing-data/v2/hsl/router-hsl.zip','opentripplanner-data-con-hsl:8080');
  testProxying('api.digitransit.fi','/routing-data/v2/waltti/router-waltti.zip','opentripplanner-data-con-waltti:8080');
  testProxying('api.digitransit.fi','/routing-data/v2/finland/router-finland.zip','opentripplanner-data-con-finland:8080');
});

describe('hsl ui', function() {
  testRedirect('www.beta.reittiopas.fi','/kissa','http://beta.reittiopas.fi/kissa');

  testRedirect('beta.reittiopas.fi','/kissa','https://beta.reittiopas.fi/kissa');
  testRedirect('dev.reittiopas.fi','/kissa','https://dev.reittiopas.fi/kissa');

  it('https should not redirect', function(done) {
    httpsGet('beta.digitransit.fi','/kissa').end((err,res)=>{
      expect(err).to.be.null;
      done();
    });
  });

  testProxying('beta.reittiopas.fi','/','digitransit-ui-hsl:8080', true);
  testProxying('dev.reittiopas.fi','/','digitransit-ui-hsl:8080', true);

  //next-dev site
  testRedirect('www.next-dev.digitransit.fi','/kissa','http://next-dev.digitransit.fi/kissa');
  testRedirect('next-dev.digitransit.fi','/kissa','https://next-dev.digitransit.fi/kissa');
  testProxying('next-dev.digitransit.fi','/','digitransit-ui-hsl-next:8080', true);
});

describe('matka ui', function() {
  testRedirect('www.opas.matka.fi','/kissa','http://opas.matka.fi/kissa');
  testRedirect('opas.matka.fi','/kissa','https://opas.matka.fi/kissa');
  testRedirect('www.beta.matka.fi','/kissa','http://beta.matka.fi/kissa');
  testRedirect('beta.matka.fi','/kissa','https://beta.matka.fi/kissa');

  testProxying('beta.matka.fi','/','digitransit-ui-default:8080', true);
  testProxying('opas.matka.fi','/','digitransit-ui-default:8080', true);

  it('https should not redirect', function(done) {
    httpsGet('opas.matka.fi','/kissa').end((err,res)=>{
      expect(err).to.be.null;
      done();
    });
  });
});

describe('waltti ui', function() {
  const cities = ['hameenlinna', 'jyvaskyla', 'joensuu', 'kotka', 'kuopio', 'lahti',
                  'lappeenranta', 'mikkeli', 'oulu', 'turku', 'tampere'];

  cities.forEach(function(city) {
    testRedirect('dev-'+city+'.digitransit.fi','/kissa','https://dev-'+city+'.digitransit.fi/kissa');
    testProxying('dev-'+city+'.digitransit.fi','/','digitransit-ui-waltti:8080', true);
    testRedirect(city+'.digitransit.fi','/kissa','https://'+city+'.digitransit.fi/kissa');
    testProxying(city+'.digitransit.fi','/','digitransit-ui-waltti:8080', true);
  });

  testRedirect('reittiopas.foli.fi','/kissa','https://reittiopas.foli.fi/kissa');
  testProxying('reittiopas.foli.fi','/','digitransit-ui-waltti:8080', true);

  testRedirect('reittiopas.hameenlinna.fi','/kissa','https://reittiopas.hameenlinna.fi/kissa');
  testProxying('reittiopas.hameenlinna.fi','/','digitransit-ui-waltti:8080', true);

  testRedirect('pilottirepa.tampere.fi','/kissa','https://pilottirepa.tampere.fi/kissa');
  testProxying('pilottirepa.tampere.fi','/','digitransit-ui-waltti:8080', true);

  it('https should not redirect', function(done) {
    httpsGet('turku.digitransit.fi','/kissa').end((err,res)=>{
      expect(err).to.be.null;
      done();
    });
  });
});

describe('digitransit', function() {
  testRedirect('www.digitransit.com','/kissa','http://digitransit.fi/kissa');
});

describe('ext-proxy', function() {
  this.timeout(5000);
  testCaching('api.digitransit.fi','/out/helsinki-fi.smoove.pro/api-public/stations',false);
  testCaching('api.digitransit.fi','/out/p.hsl.fi/api/v1/facilities.json?limit=-1',false);
  testCaching('api.digitransit.fi','/out/92.62.36.215/RTIX/trip-updates',false);
  testCaching('api.digitransit.fi','/out/beta.liikennevirasto.fi/joukkoliikenne/manual_gtfsrt/api/gtfsrt/alerts',false);
});
