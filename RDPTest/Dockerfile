# Servidor RDP mínimo (Alpine + xrdp + Openbox + xterm) para testar o cliente embutido.
# Fica em uma pasta própria para que o contexto de build seja só esta pasta (também com
# Docker antigo sem BuildKit, que envia o contexto inteiro). Não copia arquivos (sem COPY).
#
#   wslc build -t rdp-test:latest RDPTest
#   wslc run -d --name rdp-test -p 127.0.0.1:13389:3389 -e RDP_USER=tester -e RDP_PASSWORD=<senha> rdp-test:latest
#
# Com Docker, os mesmos comandos trocando "wslc" por "docker".
# A senha é passada na execução (não fica na imagem). Ver README > "Servidor RDP de Teste (RDPTest)".
FROM alpine:latest

RUN apk add --no-cache xrdp xorgxrdp xorg-server openbox xterm font-dejavu openssl \
 && openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
      -keyout /etc/xrdp/key.pem -out /etc/xrdp/cert.pem -subj "/CN=rdp-test" \
 && printf '#!/bin/sh\nxterm -geometry 100x30+40+40 &\nexec openbox\n' > /etc/xrdp/startwm.sh \
 && chmod +x /etc/xrdp/startwm.sh \
 && printf '%s\n' \
      '#!/bin/sh' \
      'set -e' \
      ': "${RDP_USER:?defina RDP_USER}" "${RDP_PASSWORD:?defina RDP_PASSWORD}"' \
      'id "$RDP_USER" >/dev/null 2>&1 || adduser -D -s /bin/sh "$RDP_USER"' \
      'echo "$RDP_USER:$RDP_PASSWORD" | chpasswd' \
      'rm -f /var/run/xrdp/*.pid /var/run/xrdp-sesman.pid /var/run/xrdp.pid' \
      'mkdir -p /var/run/xrdp' \
      'xrdp-sesman' \
      'exec xrdp --nodaemon' \
      > /entrypoint.sh \
 && chmod +x /entrypoint.sh

EXPOSE 3389
ENTRYPOINT ["/entrypoint.sh"]
