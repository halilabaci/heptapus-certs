FROM node:20-alpine
ARG NEXT_PUBLIC_API_BASE=http://localhost:8765/api
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm","run","start"]