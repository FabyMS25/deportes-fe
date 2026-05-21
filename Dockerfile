FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production --base-href /gamq-deportes/

FROM nginx:alpine
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/deportes-gamq /usr/share/nginx/html/gamq-deportes
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]