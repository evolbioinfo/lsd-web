#!/bin/bash

service postgresql start
service celeryd start
rm -f /var/run/redis_6379.pid
service redis_6379 start
#service httpd start
/usr/sbin/apachectl -D FOREGROUND
