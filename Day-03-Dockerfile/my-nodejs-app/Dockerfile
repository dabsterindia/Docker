# Use the official Node.js image on Alpine Linux (very small)
FROM node:16-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy the server file into the container
COPY server.js .

# Document that this container uses port 3000
EXPOSE 3000

# Start the server when the container runs
CMD ["node", "server.js"]