#!/bin/bash
set +e
#set -x
docker build --no-cache -t hsldevcom/digitransit-proxy:integrationtest .

PROXIED_HOSTS=`grep proxy_pass *.conf|cut -d'/' -f3|cut -d':' -f1|grep -v "\."|sort|uniq`

TARGETHOST=`/sbin/ip addr|grep inet|grep -v inet6|grep -v 127.0.0.1|grep -oE "([0-9.])+"|head -1`

echo $PROXIED_HOSTS

#construct --add-host parameters
for HOST in $PROXIED_HOSTS;do ADDHOSTS="--add-host $HOST:$TARGETHOST $ADDHOSTS";done;

echo $ADDHOSTS

CONTAINER_ID=`docker run -d -p 9000:8080 $ADDHOSTS -e VILKKU_BASIC_AUTH="\"test\"" \
  -e JOJO_BASIC_AUTH="\"test\"" -e LAPPEENRANTA_BASIC_AUTH="\"test\"" -e LINKKI_BASIC_AUTH="\"test\"" \
  -e NEW_LISSU_BASIC_AUTH="\"test\"" -e LAHTI_BASIC_AUTH="\"test\"" -e HSL_RT_STORAGE_NAME=transitdataprod \
  -e MATKAHUOLTO_KAINUU_BASIC_AUTH="\"test\"" -e MATKAHUOLTO_SAVO_BASIC_AUTH="\"test\"" \
  -e MATKAHUOLTO_KANTA_BASIC_AUTH="\"test\"" -e MATKAHUOLTO_KARJALA_BASIC_AUTH="\"test\"" \
  -e MATKAHUOLTO_KESKI_BASIC_AUTH="\"test\"" -e MATKAHUOLTO_KYME_BASIC_AUTH="\"test\"" \
  -e MATKAHUOLTO_LAPPI_BASIC_AUTH="\"test\"" -e MATKAHUOLTO_POHJANMAA_BASIC_AUTH="\"test\"" \
  -e MATKAHUOLTO_SATAKUNTA_BASIC_AUTH="\"test\"" -e MATKAHUOLTO_VAKKA_BASIC_AUTH="\"test\"" \
  -e MATKAHUOLTO_VANTAA_BASIC_AUTH="\"test\"" -e MATKAHUOLTO_VARSINAIS_BASIC_AUTH="\"test\"" \
  -e HAMEENLINNA_BASIC_AUTH="\"test\"" -e NEW_HSL_FI_URL=uusi.hsl.fi \
  -e LMJ_BASIC_AUTH="\"test\"" hsldevcom/digitransit-proxy:integrationtest`

curl -v http://127.0.0.1:9000


echo started proxy-container $CONTAINER_ID
echo starting echo server...
node test_server.js &
PID=$!

sleep 5

mocha
STATUS=$?

echo stopping proxy-container $CONTAINER_ID
docker stop $CONTAINER_ID
docker rm $CONTAINER_ID

kill -9 $PID

exit $STATUS
