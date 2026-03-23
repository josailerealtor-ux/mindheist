FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

# Install all deps (including dev) for the build
RUN npm ci --ignore-scripts

COPY . .

RUN npm run build

# Prune dev deps for the final image
RUN npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
