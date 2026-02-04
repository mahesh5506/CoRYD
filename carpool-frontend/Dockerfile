# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Run Stage (Simple dev server for free tier)
# For production, we'd use Nginx, but 'preview' is fine for this demo
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/vite.config.js ./
RUN npm install
EXPOSE 3002
# Using 'preview' to serve the built assets on port 3002
CMD ["npm", "run", "preview", "--", "--port", "3002", "--host"]
