#!/bin/sh

rm -rf /usr/lib/ssdp-service

systemctl stop ssdp
systemctl disable ssdp
rm /lib/systemd/system/ssdp.service

systemctl daemon-reload
