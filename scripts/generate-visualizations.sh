#!/bin/bash
# Generate architecture visualizations and coverage reports
# Run from project root: ./scripts/generate-visualizations.sh

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================"
echo "  Tavkit Visualization Generator"
echo "========================================"
echo ""

# Create output directory
mkdir -p docs/architecture
echo -e "${GREEN}✓${NC} Created docs/architecture/"

# Check if required tools are installed
echo ""
echo "Checking dependencies..."

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        return 1
    fi
}

# Track what can be generated
CAN_GENERATE_GO=false
CAN_GENERATE_FRONTEND=false
CAN_GENERATE_DOCKER=false

# Check Go tools
if check_command go; then
    if [ -f "$HOME/go/bin/go-callvis" ]; then
        echo -e "${GREEN}✓${NC} go-callvis is installed"
        CAN_GENERATE_GO=true
    else
        echo -e "${YELLOW}⚠${NC} go-callvis not found. Install with: go install github.com/ofabry/go-callvis@latest"
    fi
fi

# Check Node tools
if check_command npm; then
    if command -v madge &> /dev/null; then
        echo -e "${GREEN}✓${NC} madge is installed"
        CAN_GENERATE_FRONTEND=true
    else
        echo -e "${YELLOW}⚠${NC} madge not found. Install with: npm install -g madge"
    fi
fi

# Check Docker
if check_command docker; then
    CAN_GENERATE_DOCKER=true
fi

echo ""
echo "========================================"
echo "  Generating Visualizations"
echo "========================================"

# 1. Go Backend Architecture
if [ "$CAN_GENERATE_GO" = true ]; then
    echo ""
    echo "📊 Generating Go backend architecture diagram..."
    cd backend
    if ~/go/bin/go-callvis -group pkg,type -format svg -file ../docs/architecture/go-backend ./cmd/server 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Generated docs/architecture/go-backend.svg"
    else
        echo -e "${RED}✗${NC} Failed to generate Go architecture diagram"
    fi
    cd ..
else
    echo -e "${YELLOW}⚠${NC} Skipping Go architecture diagram (dependencies missing)"
fi

# 2. Frontend Dependencies
if [ "$CAN_GENERATE_FRONTEND" = true ]; then
    echo ""
    echo "📊 Generating frontend dependency diagram..."
    cd web
    if madge --image ../docs/architecture/frontend-deps.svg --extensions ts,tsx src/ 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Generated docs/architecture/frontend-deps.svg"
    else
        echo -e "${RED}✗${NC} Failed to generate frontend dependency diagram"
    fi
    cd ..
else
    echo -e "${YELLOW}⚠${NC} Skipping frontend dependency diagram (dependencies missing)"
fi

# 3. Docker Services
if [ "$CAN_GENERATE_DOCKER" = true ]; then
    echo ""
    echo "📊 Generating Docker services diagram..."
    if docker run --rm -v $(pwd):/input pmsipilot/docker-compose-viz render -m image docker-compose.yml --output-file=docs/architecture/services.png --force 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Generated docs/architecture/services.png"
    else
        echo -e "${RED}✗${NC} Failed to generate Docker services diagram"
    fi
else
    echo -e "${YELLOW}⚠${NC} Skipping Docker services diagram (Docker not available)"
fi

# 4. Go Coverage (optional)
echo ""
read -p "Generate Go test coverage reports? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Generating Go test coverage..."
    cd backend
    if go test -v -coverprofile=coverage.out -covermode=atomic ./... 2>/dev/null; then
        go tool cover -func=coverage.out > coverage.txt
        go tool cover -html=coverage.out -o coverage.html
        cp coverage.out ../docs/architecture/go-coverage.out
        cp coverage.txt ../docs/architecture/go-coverage.txt
        echo -e "${GREEN}✓${NC} Generated Go coverage reports"
    else
        echo -e "${YELLOW}⚠${NC} Go tests failed or no tests found"
    fi
    cd ..
fi

# 5. Python Coverage (optional)
echo ""
read -p "Generate Python test coverage reports? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Generating Python test coverage..."
    cd ai-service
    if command -v poetry &> /dev/null; then
        if poetry run pytest --cov=app --cov-report=xml --cov-report=html --cov-report=term 2>/dev/null; then
            cp coverage.xml ../docs/architecture/python-coverage.xml
            echo -e "${GREEN}✓${NC} Generated Python coverage reports"
        else
            echo -e "${YELLOW}⚠${NC} Python tests failed or no tests found"
        fi
    else
        echo -e "${RED}✗${NC} Poetry not installed"
    fi
    cd ..
fi

# Summary
echo ""
echo "========================================"
echo "  Summary"
echo "========================================"
echo ""
ls -lh docs/architecture/ | grep -E '\.(svg|png|xml|out|txt|html)$' || echo "No files generated"
echo ""
echo -e "${GREEN}✓${NC} Visualizations are ready!"
echo ""
echo "View them with:"
echo "  open docs/architecture/go-backend.svg"
echo "  open docs/architecture/frontend-deps.svg"
echo "  open docs/architecture/services.png"
echo "  open docs/architecture/HYBRID_ARCHITECTURE.md"
echo ""
echo "Or commit them to Git:"
echo "  git add docs/architecture/"
echo "  git commit -m 'docs: update architecture diagrams'"
echo "  git push"
echo ""
