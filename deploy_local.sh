#!/usr/bin/env bash
# --------------------------------------------------------------
# deploy_local.sh – envia código para o VPS e roda docker‑compose
# --------------------------------------------------------------

# ---------- CONFIGURAÇÃO ----------
# IP ou hostname público do VPS (substitua pelo seu)
VPS_HOST="167.86.89.208"               # <--- EDITAR
# Usuário SSH (root ou um usuário com sudo)
VPS_USER="root"                         # <--- EDITAR se usar outro usuário
# Caminho remoto onde o código será colocado
REMOTE_DIR="/opt/apps/gestao-folha-salarial"
# Arquivo de chave privada (gerada no Windows, sem passphrase)
SSH_KEY="$HOME/.ssh/vps_key"            # <--- ajustar se o nome for diferente

# ---------- FUNÇÕES ----------
log()   { echo "$(date +'%Y-%m-%d %H:%M:%S') | $*"; }
die()   { log "❌ $*" >&2; exit 1; }

# --------------------------------------------------------------
log "Iniciando deploy local → ${VPS_USER}@${VPS_HOST}"

# 1️⃣ Verifica se a chave SSH existe
[[ -f "${SSH_KEY}" ]] || die "Chave SSH não encontrada em ${SSH_KEY}"

# 2️⃣ Garante que o diretório remoto exista
ssh -i "${SSH_KEY}" "${VPS_USER}@${VPS_HOST}" "mkdir -p ${REMOTE_DIR}" \
  || die "Falha ao criar diretório remoto ${REMOTE_DIR}"

# 3️⃣ Copia os arquivos necessários para o VPS
log "Transferindo arquivos para o VPS..."

# Lista explícita dos itens que devem ser enviados ao VPS.
# Não incluímos um Dockerfile na raiz porque ele está dentro das pastas backend/ e frontend/.
ITEMS=( \
  docker-compose.yml \
  docker-compose.prod.yml \
  nginx.conf \
  backend \
  frontend \
)

# Verifica se o array está vazio (evita chamar scp sem argumentos)
if [ ${#ITEMS[@]} -eq 0 ]; then
  die "Nenhum arquivo ou pasta foi definido para transferência"
fi

# Transferência usando tar, excluindo node_modules
log "Transferindo arquivos para o VPS..."
# Cria um tarball em stdout excluindo node_modules e envia via SSH
tar --exclude='*/node_modules/*' -czf - "${ITEMS[@]}" |
  ssh -i "${SSH_KEY}" "${VPS_USER}@${VPS_HOST}" "tar -xz -C \"${REMOTE_DIR}\"" || die "Falha ao copiar arquivos para o VPS"


# 4️⃣ Executa docker‑compose no VPS
log "Executando docker‑compose no VPS"
ssh -i "${SSH_KEY}" "${VPS_USER}@${VPS_HOST}" bash -c "'
  set -e
  cd ${REMOTE_DIR}
  # Stop any previous containers (sem -v para não apagar dados do Postgres/NPM)
  docker compose -f docker-compose.prod.yml down || true
  # Build images locally then start containers without pulling
  docker compose -f docker-compose.prod.yml build &&
  docker compose -f docker-compose.prod.yml up -d
  
  echo "Aguardando 5 segundos para o banco de dados inicializar..."
  sleep 5
  echo "Rodando migrações no banco de dados da VPS..."
  docker exec sgfs_backend npm run db:migrate || echo "Aviso: Falha ao rodar migrações, mas continuando..."
'" || die "Deploy falhou durante a execução de docker‑compose"

log "✅ Deploy concluído com sucesso"
exit 0
