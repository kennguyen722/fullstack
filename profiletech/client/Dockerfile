FROM public.ecr.aws/docker/library/node:20-alpine AS build
WORKDIR /app/client

COPY package.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src ./src
COPY public ./public

# Inject API base via build ARG -> VITE_API_URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm install && npm run build

FROM public.ecr.aws/docker/library/nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

COPY --from=build /app/client/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
