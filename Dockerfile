FROM node:13

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
RUN npm build

COPY . .

EXPOSE 4001
CMD [ "node", "server.js" ]