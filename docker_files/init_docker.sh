#!/bin/bash

service postgresql start
service celeryd start
service redis_6379 start
#service httpd start
/usr/sbin/apachectl -D FOREGROUND
