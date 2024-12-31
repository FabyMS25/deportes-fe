# Stage 1: Build the Angular application
FROM node:20-alpine AS build
# Set the working directory
WORKDIR /app
COPY . /app/
RUN npm cache clean --force
RUN npm install
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine
COPY default.conf /etc/nginx/conf.d
COPY --from=build /app/dist/deportes-gamq /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
