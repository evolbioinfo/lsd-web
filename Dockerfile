FROM centos:6.7

MAINTAINER Frederic Lemoine

RUN yum -y install \
    python27 \
    libjpeg-devel \
    libxml2-devel \
    httpd \
    tcl \
    freetype-devel \
    wget

RUN rpm --import http://ftp.scientificlinux.org/linux/scientific/5x/x86_64/RPM-GPG-KEYs/RPM-GPG-KEY-cern \
 && wget -O /etc/yum.repos.d/slc6-scl.repo http://linuxsoft.cern.ch/cern/scl/slc6-scl.repo \
 && yum -y install devtoolset-3-gcc-c++ \
 && scl enable devtoolset-3  bash

RUN yum -y install postgresql postgresql-contrib postgresql-server postgresql-devel
RUN service postgresql initdb
#
COPY docker_files/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf
COPY docker_files/postgresql.conf /var/lib/pgsql/data/postgresql.conf
RUN chown postgres:postgres  /var/lib/pgsql/data/pg_hba.conf  /var/lib/pgsql/data/postgresql.conf
RUN service postgresql start

COPY  docker_files/sql_init_script.sql .
RUN service postgresql start \
    && psql -U postgres -a  -f sql_init_script.sql \
    && rm sql_init_script.sql 

RUN yum -y install tar
RUN wget http://download.redis.io/releases/redis-3.0.7.tar.gz \
    && source scl_source enable devtoolset-3 \
    && tar -xzvf redis-3.0.7.tar.gz \
    && cd redis-3.0.7 \
    && make \
    && make install \
    && utils/install_server.sh \
    && cd .. \
    && rm -rf redis-3.0.7.tar.gz

RUN yum -y install python27
# Install pip / virtualenvwrapper
#
# add to .bashrc 
RUN echo ". /opt/rh/python27/enable" >> /root/.bashrc
RUN source scl_source enable python27 \
    && easy_install pip \
    && pip install virtualenvwrapper

##### New virtualenv
#####
##### add in .bashrc
RUN echo "source /opt/rh/python27/root/usr/bin/virtualenvwrapper.sh" >> /root/.bashrc
RUN yum -y install which httpd-devel
RUN source scl_source enable python27 \
    && source scl_source enable devtoolset-3 \
    && source /opt/rh/python27/root/usr/bin/virtualenvwrapper.sh \
    && mkvirtualenv django \
    && workon django \
    && pip install --upgrade pip \
    && pip install Django \
    && pip install celery[redis]==3.1.20 \
    && pip install six \
    && pip install numpy \
    && pip install Pillow \
    && pip install biopython \
    && pip install mod_wsgi \
    && pip install psycopg2

RUN echo "LoadModule wsgi_module /root/.virtualenvs/django/lib/python2.7/site-packages/mod_wsgi/server/mod_wsgi-py27.so" >>  /etc/httpd/conf/httpd.conf

COPY lsd_web/ /root/lsd_web/

RUN \
    service postgresql start \
    && source scl_source enable python27 \
    && source /opt/rh/python27/root/usr/bin/virtualenvwrapper.sh \
    && source scl_source enable devtoolset-3 \
    && workon django \
    && cd /root/lsd_web/ \
    && mv lsd_web/settings_deployed.py lsd_web/settings.py \
    && python manage.py makemigrations lsd \
    && python manage.py migrate \
    && python manage.py createsuperuser \
    && echo "yes" | python manage.py collectstatic \
    && chown :apache /root/ \
    && chown :apache /root/lsd_web/ \
    && chown :apache /root/lsd_web/lsd_web/ \
    && chown -R :apache /root/lsd_web/static/

RUN yum -y install git \
    && git clone https://github.com/tothuhien/lsd-0.3beta.git /root/lsd-0.3beta \
    && cd /root/lsd-0.3beta/src/ \
    && source scl_source enable devtoolset-3  \
    && make

ENV LSDPATH /root/lsd-0.3beta/src/lsd

RUN yum -y history undo `yum history list git | head -n 4 | tail -n 1 | cut -f 1 -d '|'`

COPY docker_files/django.conf /etc/httpd/conf.d/django.conf
COPY docker_files/default_celeryd /etc/default/celeryd
COPY docker_files/celeryd /etc/init.d/celeryd

RUN chmod 644 /etc/default/celeryd

COPY docker_files/init_docker.sh /root/init_docker.sh
RUN chmod +x  /root/init_docker.sh

CMD ["/root/init_docker.sh"]
