# Introduction

# Deployment

# Docker

To build a docker machine, you first need to install [docker](https://docs.docker.com/engine/installation/). Installation is explained for different systems.

Then, you can build the lsdweb image:

```[bash]
docker build lsdweb .
```

And finally run the container:

```
docker run -d -p 8888:80 lsdweb 
```

The last command will start the container `lsdweb` in background. The webservice will be accessible through the port `8888` of localhost. You can then open your browser to (http://localhost:8888).

## MacOS (Docker toolbox)
If you are running Docker toolbox under macos, docker should run using virtualbox. In that case, before starting the container, you should redirect the port 8888 of your macos host to the port 8888 of the linux machine.

To do so, first get the name of the running virtual machine:

```
VBoxManage list runningvms
```

Then redirect the port:

```
VBoxManage controlvm "default" natpf1 "http,tcp,,8888,,8888"
```

Where "default" should be replaced by the name of the VM.

Now, you can start the docker container:
```
docker run -d -p 8888:80 lsdweb 
```

## Windows
