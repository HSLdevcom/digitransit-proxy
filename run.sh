#!/bin/ash

set -e
#workaround for azure DNS issue
if [ -n "$MESOS_CONTAINER_NAME"  ]; then 
  echo "search marathon.l4lb.thisdcos.directory" >> /etc/resolv.conf;
fi
sed -i "s/VILKKU_BASIC_AUTH/${VILKKU_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/JOJO_BASIC_AUTH/${JOJO_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/LAPPEENRANTA_BASIC_AUTH/${LAPPEENRANTA_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/LINKKI_BASIC_AUTH/${LINKKI_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/NEW_LISSU_BASIC_AUTH/${NEW_LISSU_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/SAMOCAT_TOKEN_AUTH/${SAMOCAT_TOKEN_AUTH}/" /etc/nginx/external.conf
sed -i "s/hslgtfsrealtimetest/${HSL_RT_STORAGE_NAME}/" /etc/nginx/common.conf
sed -i "s/LAHTI_BASIC_AUTH/${LAHTI_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/MATKAHUOLTO_BASIC_AUTH/${MATKAHUOLTO_BASIC_AUTH}/" /etc/nginx/external.conf

#start nginx
nginx
