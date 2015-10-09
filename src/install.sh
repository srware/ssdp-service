#!/bin/sh

mkdir -p /usr/lib/ssdp-service
cp ssdp-service.js /usr/lib/ssdp-service/ssdp-service.js

cp ssdp.service /lib/systemd/system
systemctl daemon-reload
systemctl enable ssdp
