FROM node:20-alpine

WORKDIR /app

# Installation des dépendances
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copie du code source
COPY . .

EXPOSE 8081
EXPOSE 19000
EXPOSE 19006

# Lancement d'Expo en mode Web avec vidage du cache Metro
CMD ["npx", "expo", "start", "--web", "--port", "8081", "--host", "lan", "--clear"]
