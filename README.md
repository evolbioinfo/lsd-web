# Introduction
[Least-Squares Dating (LSD)](https://github.com/tothuhien/lsd-0.3beta) estimates rates and dates from phylogenies using least-squares method.

lsd-web provides a web interface to LSD.

# Deployment

## Docker

### Build the image

To build a docker image, you first need to install [docker](https://docs.docker.com/engine/installation/). Installation is explained for different systems.

Then, you can build the lsd-web image:

```[bash]
docker build -t lsd-web .
```

And finally run the container:

```
docker run -d -p 8888:80 lsd-web 
```

The last command will start the container `lsd-web` in background. The webservice will be accessible through the port `8888` of localhost. You can then open your browser to (http://localhost:8888).

### Specificity of MacOS (Docker toolbox)
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
docker run -d -p 8888:80 lsd-web 
```

