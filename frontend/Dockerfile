# Frontend Vite (che do dev cho demo). Webcam chay o trinh duyet nen khong can thiet bi trong container.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
# --host 0.0.0.0 de truy cap duoc tu ngoai container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
