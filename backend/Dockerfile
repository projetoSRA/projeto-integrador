FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Não rodar o processo como root dentro do container (achado GitGuard:
# dockerfile.security.missing-user). A imagem node:*-alpine já vem com o
# usuário/grupo "node" (uid/gid 1000) prontos para uso.
RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["npm", "start"]