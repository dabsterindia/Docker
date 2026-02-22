FROM node:18-alpine

WORKDIR /app

# Copy package files first (layer caching optimization!)
COPY package*.json ./
RUN npm install

# Copy app source code
COPY index.js .

EXPOSE 3000

CMD ["node", "index.js"]