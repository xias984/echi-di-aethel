FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    git \
    openssh-client \
    postgresql-dev \
    libpq \
    && rm -rf /var/cache/apk/* \
    && docker-php-ext-install pdo pdo_pgsql

RUN mkdir -p /root/.ssh && chmod 700 /root/.ssh

COPY ssh_setup.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/ssh_setup.sh

WORKDIR /var/www/html