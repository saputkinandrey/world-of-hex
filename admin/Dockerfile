# nginx state for serving content
FROM nginx:alpine

# Set working directory to nginx asset directory
WORKDIR /usr/share/nginx/html
ADD nginx.conf /etc/nginx/nginx.conf

# Remove default nginx static assets
RUN rm -rf ./*

# Copy static assets from builder stage
COPY ./build .

EXPOSE 8080

# Containers run nginx with global directives and daemon off
ENTRYPOINT ["nginx", "-g", "daemon off;"]