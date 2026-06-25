FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

ARG VITE_AUTH_URL
ARG VITE_NOTES_URL
ENV VITE_AUTH_URL=$VITE_AUTH_URL
ENV VITE_NOTES_URL=$VITE_NOTES_URL

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 8080
ENV PORT=8080
CMD ["nginx", "-g", "daemon off;"]
