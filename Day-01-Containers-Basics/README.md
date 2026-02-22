
What is a Container?
A container is a lightweight, standalone package that includes everything needed to run a piece of software: code, runtime, system tools, libraries, and settings. Think of it as a shipping container for your application, it works the same way everywhere.
Key Differences: Containers vs Virtual Machines
Containers: Share the host OS kernel, lightweight (MBs), start in seconds
Virtual Machines: Include full OS, heavy (GBs), take minutes to boot

What is Docker?
Docker is a platform that makes it easy to create, deploy, and run applications using containers. It's the most popular containerization tool in the world.



Core Components:
Docker Engine: The runtime that builds and runs containers
Docker CLI: Command-line tool to interact with Docker
Docker Hub: Public registry for sharing container images
Docker Engine Architecture



Hands-on: Installation & First Command
Install Docker:
Windows/Mac: Download Docker Desktop from docker.com
Linux: sudo apt-get install docker.io 
Verify Installation:

```
docker --version
docker run hello-world
```

This downloads a test image and runs a container that prints a welcome message.


Core Responsibilities - [Developers vs Operations]

Key Concepts to Understand Today:
Containers package apps with all dependencies
Docker makes container management simple
Images are blueprints, containers are running instances
Practice Exercise: Run an interactive Ubuntu container and explore it:
```
docker run -it ubuntu bash
```

# Inside the container:
```
ls
cat /etc/os-release
exit
```



References:
https://dockerlabs.collabnix.com/docker/Docker_VIT_Intro/Docker_VIT_Intro.html


