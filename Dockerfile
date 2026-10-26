# Static frontend on nginx, which also proxies the chat WebSocket to messenger-be.
#   docker build -t messenger-fe .
#   docker run --rm -p 8080:80 -e BACKEND_URL=http://<backend-host>:3000 messenger-fe
FROM nginx:1.30-alpine

# messenger-be as nginx reaches it: scheme, host and port, no path.
# The default is a backend running on the Docker Desktop host.
ENV BACKEND_URL=http://host.docker.internal:3000

# The image renders /etc/nginx/templates/*.template into conf.d at start, filling in ${BACKEND_URL}.
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY public/ /usr/share/nginx/html/
COPY docker/config.js /usr/share/nginx/html/js/config.js
