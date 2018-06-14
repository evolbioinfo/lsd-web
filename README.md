# Introduction
[Least-Squares Dating (LSD)](https://github.com/tothuhien/lsd-0.3beta) estimates rates and dates from phylogenies using least-squares method.

lsd-web provides a web interface to LSD.

# Install

## From sources (with conda)

Get sources
```
git clone https://github.com/evolbioinfo/lsd-web.git
cd lsd-web/
```

Get lsd sources
```
git clone https://github.com/tothuhien/lsd-0.3beta.git
cd lsd-0.3beta
make
export LSDPATH=$PWD/src/lsd
```

Create conda environment
 ```
conda create --name lsd-web python=2.7
source activate lsd-web
```

Configure the application (with sqlite)
```
cd lsd_web
pip install -r requirements.txt
apt-get install redis-server # Ubuntu / Debian
python manage.py makemigrations
```

Run lsd-web
```
celery --app=lsd_web.celeryapp:app worker --loglevel=INFO
python manage.py runserver
```

## Docker

You should first install [docker](https://docs.docker.com/engine/installation/).

### Build the image

To build the docker image, then:

```[bash]
docker build -t lsd-web .
```

And finally run the container:

```
docker run -p 8080:80 lsd-web 
```

You can then open your browser to (http://localhost:8080).

### From Docker Hub

An image is already built on docker hub:

```
docker run -p 8080:80 evolbioinfo/lsd-web 
```

You can then open your browser to (http://localhost:8080).

