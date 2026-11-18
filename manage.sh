#!/bin/bash

set -euo pipefail

trap 'echo -e "\033[0;31m[ERROR] An error occurred on line $LINENO. Exiting...\033[0m" >&2 && exit 1' ERR

# Colors
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
CYAN=$'\033[0;36m'
BLUE=$'\033[0;34m'
NC=$'\033[0m'

log_info()    { echo -e "${CYAN}[INFO] $1${NC}"; }
log_warn()    { echo -e "${YELLOW}[WARN] $1${NC}"; }
log_error()   { echo -e "${RED}[ERROR] $1${NC}" >&2; }
log_success() { echo -e "${GREEN}[SUCCESS] $1${NC}"; }

# ---------------------------------------------------------------------------
# Paths & config
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"
SERVER_DIR="$ROOT_DIR/server"
CLIENT_DIR="$ROOT_DIR/client"
APP_NAME="fitpulse"

# Ports (keep in sync with server/.env)
MONGO_PORT="${MONGO_PORT:-27018}"   # MongoDB (mongodb-memory-server)
API_PORT="${API_PORT:-4002}"        # Express + Socket.io API
WEB_PORT="${WEB_PORT:-8081}"        # Expo web / Metro bundler

LOG_DIR="$ROOT_DIR/logs"
MONGO_LOG="$LOG_DIR/mongo.log"
API_LOG="$LOG_DIR/api.log"
WEB_LOG="$LOG_DIR/web.log"
LOG_LINES="${LOG_LINES:-200}"
[[ "$LOG_LINES" =~ ^[1-9][0-9]*$ ]] || LOG_LINES=200

# SSH / Remote server config (override via env)
SSH_USER="${SSH_USER:-ubuntu}"
SSH_HOST="${SSH_HOST:-your.server.ip}"
SSH_KEY="${SSH_KEY_PATH:-$HOME/.ssh/id_rsa}"

mkdir -p "$LOG_DIR"

# ---------------------------------------------------------------------------
# Dependency checks
# ---------------------------------------------------------------------------
check_dependencies() {
    local missing=0
    for cmd in node npm npx; do
        command -v "$cmd" &> /dev/null || { log_error "$cmd not found. Install Node.js 18+."; missing=1; }
    done
    if [ "$missing" -eq 1 ]; then
        log_warn "Missing dependencies. Exiting."
        exit 1
    fi
}

pause() { echo ""; read -p "Press Enter to continue..."; }

# ---------------------------------------------------------------------------
# Setup & Build
# ---------------------------------------------------------------------------
install_server() {
    log_info "Installing server dependencies..."
    cd "$SERVER_DIR" || exit 1
    npm install
    log_success "Server dependencies installed."
}

install_client() {
    log_info "Installing client (Expo) dependencies..."
    cd "$CLIENT_DIR" || exit 1
    npm install --legacy-peer-deps
    log_success "Client dependencies installed."
}

install_all() { install_server; install_client; log_success "All dependencies installed."; }

# ---------------------------------------------------------------------------
# MongoDB (mongodb-memory-server — persistent, no Docker/sudo)
# ---------------------------------------------------------------------------
mongo_running() { fuser "$MONGO_PORT/tcp" >/dev/null 2>&1; }

start_mongo() {
    if mongo_running; then
        log_success "MongoDB already running on port $MONGO_PORT."
        return 0
    fi
    log_info "Starting MongoDB (mongodb-memory-server) on :$MONGO_PORT..."
    cd "$SERVER_DIR" || exit 1
    printf '\n===== Mongo start: %s =====\n' "$(date --iso-8601=seconds)" >> "$MONGO_LOG"
    nohup npm run mongo >> "$MONGO_LOG" 2>&1 &
    local pid=$!
    for ((i = 1; i <= 45; i++)); do
        kill -0 "$pid" 2>/dev/null || { log_error "MongoDB exited early:"; tail -n 25 "$MONGO_LOG" >&2; return 1; }
        if mongo_running; then log_success "MongoDB listening on :$MONGO_PORT (PID $pid)."; return 0; fi
        sleep 1
    done
    log_error "MongoDB did not open port $MONGO_PORT in 45s."; tail -n 25 "$MONGO_LOG" >&2; return 1
}

stop_mongo() {
    log_info "Stopping MongoDB on :$MONGO_PORT..."
    fuser -k "$MONGO_PORT/tcp" >/dev/null 2>&1 || true
    sleep 1
    log_success "MongoDB stopped."
}

seed_db() {
    log_info "Seeding database with sample athletes & history..."
    start_mongo
    cd "$SERVER_DIR" || exit 1
    npm run seed
    log_success "Seed complete. Accounts: alex@ / jordan@fitpulse.dev (password123)."
}

reset_db() {
    log_warn "This will WIPE the persistent Mongo data folder and re-seed."
    read -p "Type 'yes' to continue: " confirm
    [ "$confirm" = "yes" ] || { log_info "Cancelled."; return 0; }
    stop_mongo
    rm -rf "$SERVER_DIR/data/mongo"
    start_mongo
    seed_db
    log_success "Database reset and re-seeded."
}

# ---------------------------------------------------------------------------
# Ports
# ---------------------------------------------------------------------------
free_port() {
    local port="$1"
    if fuser "$port/tcp" >/dev/null 2>&1; then
        log_warn "Port $port occupied; stopping its process..."
        fuser -k "$port/tcp" >/dev/null 2>&1 || true
        sleep 1
    fi
}

wait_for_port() {
    local name="$1" pid="$2" port="$3"
    for ((i = 1; i <= 40; i++)); do
        kill -0 "$pid" 2>/dev/null || { log_error "$name exited before opening :$port."; return 1; }
        if fuser "$port/tcp" >/dev/null 2>&1; then log_success "$name listening on :$port."; return 0; fi
        sleep 1
    done
    log_error "$name did not open :$port in time."; return 1
}

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
start_api() {
    start_mongo
    free_port "$API_PORT"
    log_info "Starting API on :$API_PORT..."
    cd "$SERVER_DIR" || exit 1
    printf '\n===== API start: %s =====\n' "$(date --iso-8601=seconds)" >> "$API_LOG"
    nohup npm run dev >> "$API_LOG" 2>&1 &
    wait_for_port "API" "$!" "$API_PORT" || { tail -n 40 "$API_LOG" >&2; return 1; }
}

stop_api() { log_info "Stopping API on :$API_PORT..."; free_port "$API_PORT"; log_success "API stopped."; }

# ---------------------------------------------------------------------------
# Expo client
# ---------------------------------------------------------------------------
# Foreground: shows the QR code for Expo Go on a phone (API + Mongo run in background).
start_expo() {
    start_api
    log_info "Starting Expo (Metro) — scan the QR with Expo Go, or press 'w' for web."
    log_success "Web will be at: ${BLUE}http://localhost:$WEB_PORT${NC}"
    cd "$CLIENT_DIR" || exit 1
    npx expo start
}

# Foreground web only (opens the app in a browser).
start_web() {
    start_api
    log_info "Starting Expo Web on :$WEB_PORT (foreground; Ctrl+C to stop)..."
    log_success "Open: ${BLUE}http://localhost:$WEB_PORT${NC}"
    cd "$CLIENT_DIR" || exit 1
    npx expo start --web --port "$WEB_PORT"
}

# Background web (nohup) — serves the web app without holding the terminal.
start_web_bg() {
    start_api
    free_port "$WEB_PORT"
    log_info "Starting Expo Web (nohup) on :$WEB_PORT..."
    cd "$CLIENT_DIR" || exit 1
    printf '\n===== Web start: %s =====\n' "$(date --iso-8601=seconds)" >> "$WEB_LOG"
    nohup npx expo start --web --port "$WEB_PORT" >> "$WEB_LOG" 2>&1 &
    if wait_for_port "Expo Web" "$!" "$WEB_PORT"; then
        log_success "FitPulse web is up!"
        log_info "  • Web : http://localhost:$WEB_PORT"
        log_info "  • API : http://localhost:$API_PORT/api/health"
    else
        tail -n 40 "$WEB_LOG" >&2
    fi
}

stop_web() { log_info "Stopping Expo Web on :$WEB_PORT..."; free_port "$WEB_PORT"; log_success "Expo Web stopped."; }

stop_all() {
    log_info "Stopping API + Expo Web..."
    free_port "$WEB_PORT"
    free_port "$API_PORT"
    log_success "Stopped. (MongoDB left running — use option 13 to stop it.)"
}

# ---------------------------------------------------------------------------
# First-time setup
# ---------------------------------------------------------------------------
first_time_setup() {
    install_all
    start_mongo
    seed_db
    log_success "First-time setup complete!"
    log_info "Start the app with option 5 (Expo, QR) or option 6 (Web in browser)."
}

# ---------------------------------------------------------------------------
# Status / health / logs
# ---------------------------------------------------------------------------
status_services() {
    echo "Service status:"
    for p in "$MONGO_PORT:MongoDB" "$API_PORT:API" "$WEB_PORT:Expo Web"; do
        local port="${p%%:*}" name="${p##*:}"
        if fuser "$port/tcp" >/dev/null 2>&1; then
            echo -e "  ${GREEN}●${NC} $name — running on :$port"
        else
            echo -e "  ${RED}○${NC} $name — not running (:$port)"
        fi
    done
}

health_check() {
    log_info "Checking API health at http://localhost:$API_PORT/api/health ..."
    if curl -fsS "http://localhost:$API_PORT/api/health" >/dev/null 2>&1; then
        curl -s "http://localhost:$API_PORT/api/health"; echo
        log_success "API is healthy."
    else
        log_error "API did not respond. Is it running? (option 8)"
    fi
}

tail_logs() {
    local -a files=()
    for f in "$MONGO_LOG" "$API_LOG" "$WEB_LOG"; do [ -f "$f" ] && files+=("$f"); done
    [ "${#files[@]}" -eq 0 ] && { log_error "No logs yet. Start services first."; return 0; }
    log_info "Showing last $LOG_LINES lines, then following. Ctrl+C to return."
    tail -n "$LOG_LINES" -F "${files[@]}" || true
}

disk_usage() { log_info "Disk usage:"; df -h "$ROOT_DIR" | sed 's/^/  /'; du -sh "$ROOT_DIR" 2>/dev/null | sed 's/^/  Project: /'; }
ram_usage()  { log_info "Top memory processes:"; ps aux --sort=-%mem | head -n 8; }

# ---------------------------------------------------------------------------
# SSH
# ---------------------------------------------------------------------------
ssh_connect() {
    local key="$SSH_KEY"
    if [ ! -f "$key" ]; then
        log_warn "SSH key not found at: $key"
        read -p "Enter path to your SSH private key: " key
        key="${key/#\~/$HOME}"
        [ -f "$key" ] || { log_error "Key file not found: $key"; return 1; }
    fi
    chmod 600 "$key" 2>/dev/null || true
    log_info "Connecting to ${SSH_USER}@${SSH_HOST}..."
    ssh -i "$key" -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SSH_HOST}"
}

# ---------------------------------------------------------------------------
# Menu
# ---------------------------------------------------------------------------
show_menu() {
    clear
    echo -e "${CYAN}======================================================================${NC}"
    echo -e "${GREEN}                  FitPulse — Management Menu                          ${NC}"
    echo -e "${BLUE}        Fitness & Activity Tracking · React Native (Expo)            ${NC}"
    echo -e "${CYAN}======================================================================${NC}"

    echo -e "${YELLOW}Sec A: Setup${NC}"
    echo "   1. Install ALL dependencies (server + client)"
    echo "   2. Install server deps only"
    echo "   3. Install client (Expo) deps only"
    echo "   7. First-time setup (install → mongo → seed)"
    echo ""

    echo -e "${YELLOW}Sec B: Database (MongoDB — mongodb-memory-server)${NC}"
    echo "  12. Start MongoDB (:$MONGO_PORT)"
    echo "  13. Stop MongoDB"
    echo "  14. Seed Database (sample data)"
    echo "  15. Reset Database (wipe + re-seed)"
    echo ""

    echo -e "${YELLOW}Sec C: Run${NC}"
    echo "   4. Start API only (:$API_PORT, background)"
    echo "   5. Start Expo (QR for phone + press 'w' for web)"
    echo "   6. Start Web in browser (foreground :$WEB_PORT)"
    echo "   6b. Start Web (background/nohup)"
    echo "   8. Service Status"
    echo "   9. Stop API + Web"
    echo ""

    echo -e "${YELLOW}Sec D: Monitoring & Logs${NC}"
    echo "  30. API Health Check"
    echo "  31. Tail Service Logs"
    echo "  32. Disk Space Usage"
    echo "  33. RAM Usage (top processes)"
    echo ""

    echo -e "${YELLOW}Sec S: SSH${NC}"
    echo " 200. SSH into Remote Server (${SSH_USER}@${SSH_HOST})"
    echo ""

    echo -e "${RED}   0. Exit${NC}"
    echo -e "${CYAN}======================================================================${NC}"
    echo -e "Web: ${BLUE}http://localhost:$WEB_PORT${NC}   API: ${BLUE}http://localhost:$API_PORT${NC}"
}

check_dependencies

while true; do
    show_menu
    read -p "Enter your choice: " choice
    echo ""
    case $choice in
        1)   install_all; pause ;;
        2)   install_server; pause ;;
        3)   install_client; pause ;;
        7)   first_time_setup; pause ;;
        12)  start_mongo; pause ;;
        13)  stop_mongo; pause ;;
        14)  seed_db; pause ;;
        15)  reset_db; pause ;;
        4)   start_api; pause ;;
        5)   start_expo; pause ;;
        6)   start_web; pause ;;
        6b)  start_web_bg; pause ;;
        8)   status_services; pause ;;
        9)   stop_all; pause ;;
        30)  health_check; pause ;;
        31)  tail_logs ;;
        32)  disk_usage; pause ;;
        33)  ram_usage; pause ;;
        200) ssh_connect; pause ;;
        0)   log_info "Goodbye! Stay active 💪"; exit 0 ;;
        *)   log_warn "Invalid choice: $choice"; pause ;;
    esac
done
