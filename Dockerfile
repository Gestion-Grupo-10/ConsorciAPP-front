FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install date-fns react-day-picker @radix-ui/react-popover
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
