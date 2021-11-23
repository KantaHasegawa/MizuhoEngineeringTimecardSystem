FROM node:16-alpine
WORKDIR /usr/app
COPY . /usr/app
RUN apk add git
RUN npm install /usr/app
