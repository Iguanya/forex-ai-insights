#!/bin/bash

# =========================================================================
# Database Migration Script
# Applies all migrations to remote MySQL server in correct order
# =========================================================================

set -e  # Exit on error

# Configuration from .env
DB_HOST="${MYSQL_HOST:-144.172.112.31}"
DB_PORT="${MYSQL_PORT:-3306}"
DB_USER="${MYSQL_USER:-root}"
DB_PASSWORD="${MYSQL_PASSWORD:-root_root}"
DB_NAME="${MYSQL_DATABASE:-trading}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/supabase/migrations"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🗄️  MySQL Database Migration Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "📌 Database Configuration:"
echo "   Host: $DB_HOST:$DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Verify mysql client is installed
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}❌ Error: 'mysql' client is not installed${NC}"
    echo "   Install it with: sudo apt-get install mysql-client"
    exit 1
fi

# Test connection
echo -e "${YELLOW}🔌 Testing database connection...${NC}"
if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" --skip-ssl -e "SELECT 1" &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to database${NC}"
    echo "   Host: $DB_HOST"
    echo "   Port: $DB_PORT"
    echo "   User: $DB_USER"
    exit 1
fi
echo -e "${GREEN}✅ Connection successful!${NC}"
echo ""

# Define migrations in order (important!)
MIGRATIONS=(
    "001_core_tables.sql"
    "20260315_mysql_rbac_deposits_schema.sql"
    "20260329_add_wallet_support.sql"
)

TOTAL=${#MIGRATIONS[@]}
CURRENT=0

# Run each migration
for MIGRATION in "${MIGRATIONS[@]}"; do
    CURRENT=$((CURRENT + 1))
    MIGRATION_FILE="$MIGRATIONS_DIR/$MIGRATION"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}┌─ Migration [$CURRENT/$TOTAL]${NC}"
    echo -e "${BLUE}│${NC} 📄 File: $MIGRATION"
    echo -e "${BLUE}└─${NC}"
    
    # Apply migration
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" --skip-ssl "$DB_NAME" < "$MIGRATION_FILE" 2> /tmp/migration_error.log; then
        echo -e "${GREEN}   ✅ Applied successfully${NC}"
        echo ""
    else
        ERROR=$(cat /tmp/migration_error.log)
        echo -e "${RED}   ❌ Migration failed!${NC}"
        echo -e "${RED}   Error: $ERROR${NC}"
        exit 1
    fi
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All migrations completed successfully!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Show created tables
echo -e "${YELLOW}📋 Database Tables:${NC}"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" --skip-ssl "$DB_NAME" -e "SHOW TABLES;" | tail -n +2 | nl

echo ""
echo -e "${YELLOW}📊 Table Details:${NC}"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" --skip-ssl "$DB_NAME" -e "SHOW TABLE STATUS\G" | grep -E "Name|Engine|Rows" | head -30

echo ""
echo -e "${GREEN}✨ Ready to use!${NC}"
