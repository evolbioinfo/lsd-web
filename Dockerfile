FROM ubuntu:16.04

MAINTAINER Frederic Lemoine

RUN apt-get update --fix-missing  \
    && apt-get install -y \
    python2.7 \
    libjpeg8-dev \
    libxml2-dev \
    apache2 \
    apache2-dev \
    tcl \
    libfreetype6-dev \
    libfreetype6 \
    wget \
    make \
    g++\
    gcc \
    postgresql \
    postgresql-contrib \
    tar \
    python-pip \
    git


COPY docker_files/pg_hba.conf /etc/postgresql/9.5/main/pg_hba.conf
COPY docker_files/postgresql.conf /etc/postgresql/9.5/main/postgresql.conf
COPY  docker_files/sql_init_script.sql .

RUN chown postgres:postgres   /etc/postgresql/9.5/main/pg_hba.conf \
    && chown postgres:postgres /etc/postgresql/9.5/main/postgresql.conf \
    && service postgresql start \
    && psql -U postgres -a  -f sql_init_script.sql \
    && rm sql_init_script.sql 

RUN wget http://download.redis.io/releases/redis-3.0.7.tar.gz \
    && tar -xzvf redis-3.0.7.tar.gz \
    && cd redis-3.0.7 \
    && make \
    && make install \
    && utils/install_server.sh \
    && cd .. \
    && rm -rf redis-3.0.7.tar.gz


COPY lsd_web/ /root/lsd_web/

WORKDIR /root/lsd_web/
COPY docker_files/wait_for_postgres.sh .
RUN chmod +x wait_for_postgres.sh \
    && pip install -r requirements.txt \
    && service postgresql start \
    && ./wait_for_postgres.sh \
    && mv lsd_web/settings_deployed.py lsd_web/settings.py \
    && python manage.py makemigrations lsd \
    && python manage.py migrate \
    && python manage.py createsuperuser \
    && echo "yes" | python manage.py collectstatic \
    && chown www-data:www-data /root/ \
    && chown www-data:www-data /root/lsd_web/ \
    && chown www-data:www-data /root/lsd_web/lsd_web/ \
    && chown -R www-data:www-data /root/lsd_web/static/

RUN git clone https://github.com/tothuhien/lsd-0.3beta.git /root/lsd-0.3beta \
    && cd /root/lsd-0.3beta/src/ \
    && make

ENV LSDPATH /root/lsd-0.3beta/src/lsd

COPY docker_files/django.conf /etc/apache2/sites-enabled/000-default.conf
COPY docker_files/default_celeryd /etc/default/celeryd
COPY docker_files/celeryd /etc/init.d/celeryd

RUN chmod 644 /etc/default/celeryd

COPY docker_files/init_docker.sh /root/init_docker.sh
RUN chmod +x  /root/init_docker.sh

CMD ["/root/init_docker.sh"]
