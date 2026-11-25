#!/bin/sh
set -eu

CERT_DIR=/etc/nginx/certs
CERT_FILE="$CERT_DIR/student-attend.crt"
KEY_FILE="$CERT_DIR/student-attend.key"
HOST_IP="${FRONTEND_HOST_IP:-127.0.0.1}"

case "$HOST_IP" in
  *[!0-9.]*|'') HOST_IP=127.0.0.1 ;;
esac

mkdir -p "$CERT_DIR"

certificate_matches_host() {
  [ -s "$CERT_FILE" ] \
    && [ -s "$KEY_FILE" ] \
    && openssl x509 -in "$CERT_FILE" -noout -ext subjectAltName 2>/dev/null \
      | grep -Fq "IP Address:$HOST_IP"
}

if ! certificate_matches_host; then
  rm -f "$CERT_FILE" "$KEY_FILE"
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=$HOST_IP" \
    -addext "subjectAltName=DNS:localhost,DNS:student-attend.local,IP:127.0.0.1,IP:$HOST_IP"
  chmod 600 "$KEY_FILE"
fi
