# Stage 1: Build the Angular application
FROM node:20-alpine AS build
# Set the working directory
WORKDIR /app
COPY . /app/
RUN npm cache clean --force
# Copy package.json and package-lock.json
# COPY package*.json ./
RUN npm install
# Copy the rest of the application code
# COPY . .
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine
# Copy the built Angular app to Nginx's serve directory
COPY --from=build /app/dist/deportes-gamq /usr/share/nginx/html
# Copy a custom Nginx configuration (if needed)
# COPY nginx.conf /etc/nginx/nginx.conf
# Expose port 80
# EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]