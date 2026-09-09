FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production=false

COPY . .

RUN npx prisma generate
RUN npx prisma db push --skip-generate

EXPOSE 3000

CMD ["npm", "start"]
