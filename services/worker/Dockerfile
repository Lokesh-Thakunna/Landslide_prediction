FROM node:22-alpine

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages ./packages
COPY services ./services

RUN npm install
RUN npm run build -w @bhurakshan/contracts && npm run build -w @bhurakshan/worker

CMD ["npm", "run", "start:worker"]

