#!/bin/bash
set +e
#set -x
docker build -t hsldevcom/digitransit-proxy:integrationtest .

PROXIED_HOSTS=`grep proxy_pass *.conf|cut -d'/' -f3|cut -d':' -f1|grep -v "\."|uniq`

TARGETHOST=`/sbin/ifconfig|grep inet|grep -v inet6|grep -v 127.0.0.1|grep -oE "([0-9.])+"|head -1`

echo $PROXIED_HOSTS

#construct --add-host parameters
for HOST in $PROXIED_HOSTS;do ADDHOSTS="--add-host $HOST:$TARGETHOST $ADDHOSTS";done;

echo $ADDHOSTS

cd test

npm install


CONTAINER_ID=`docker run -d -p 9000:8080 $ADDHOSTS hsldevcom/digitransit-proxy:integrationtest`

curl -v http://127.0.0.1:9000


echo started proxy-container $CONTAINER_ID
echo starting echo server...
node server.js &
PID=$!

sleep 5

npm test
STATUS=$?

echo stopping proxy-container $CONTAINER_ID
docker kill $CONTAINER_ID
docker rm $CONTAINER_ID
kill -9 $PID


exit $STATUS
