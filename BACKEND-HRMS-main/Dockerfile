FROM node:20

ENV NODE_OPTIONS=--dns-result-order=ipv4first

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 5000

CMD ["npm","start"]
