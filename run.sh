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
sed -i "s/LAHTI_BASIC_AUTH/${LAHTI_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/HAMEENLINNA_BASIC_AUTH/${HAMEENLINNA_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/test.hslfi.hsldev.com/${NEW_HSL_FI_URL}/" /etc/nginx/nginx.conf
sed -i "s/LMJ_BASIC_AUTH/${LMJ_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/MIKKELI_BASIC_AUTH/${MIKKELI_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/VAASA_BASIC_AUTH/${VAASA_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/SALO_BASIC_AUTH/${SALO_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/KOUVOLA_BASIC_AUTH/${KOUVOLA_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/GIRAVOLTA_TAMPERE_AUTH/${GIRAVOLTA_TAMPERE_AUTH}/" /etc/nginx/external.conf
sed -i "s/KOTKA_BASIC_AUTH/${KOTKA_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/ROVANIEMI_BASIC_AUTH/${ROVANIEMI_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/KAJAANI_BASIC_AUTH/${KAJAANI_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/GIRAVOLTA_VANTAA_AUTH/${GIRAVOLTA_VANTAA_AUTH}/" /etc/nginx/external.conf
sed -i "s/VARELY_BASIC_AUTH/${VARELY_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/VARELY_RT_BASIC_AUTH/${VARELY_RT_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/RAUMA_RT_BASIC_AUTH/${RAUMA_RT_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/RAUMA_STATIC_BASIC_AUTH/${RAUMA_STATIC_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/OULU_RT_BASIC_AUTH/${OULU_RT_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/RAASEPORI_RT_BASIC_AUTH/${RAASEPORI_RT_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/PORI_RT_BASIC_AUTH/${PORI_RT_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/MH_BASIC_AUTH/${MH_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/NYSSE_BASIC_AUTH/${NYSSE_BASIC_AUTH}/" /etc/nginx/external.conf
sed -i "s/WALTTI_TEST_STATIC_BASIC_AUTH/${WALTTI_TEST_STATIC_BASIC_AUTH}/" /etc/nginx/external.conf

#set basic auth
htpasswd -c -B -b .htpasswd $WALTTI_TEST_CREDENTIALS_USER $WALTTI_TEST_CREDENTIALS_PASS &>/dev/null

#start nginx
nginx
