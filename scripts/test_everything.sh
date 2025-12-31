#!/bin/bash

# Comprehensive Test Script for Dixi Application
# Tests all services and functionality
# Mac/Linux compatible version

# Colors for output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  DIXI COMPREHENSIVE SYSTEM TEST${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

ALL_TESTS_PASSED=true
declare -a TEST_RESULTS

# Function to test a service endpoint
test_service() {
    local name="$1"
    local url="$2"
    local timeout="${3:-5}"
    
    echo -n "Testing $name..."
    
    # Use curl with timeout
    HTTP_CODE=$(curl -s -o /tmp/dixi_test_response.txt -w "%{http_code}" --max-time $timeout "$url" 2>/dev/null)
    
    if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 400 ]; then
        echo -e " ${GREEN}✅ PASSED (Status: $HTTP_CODE)${NC}"
        return 0
    else
        echo -e " ${RED}❌ FAILED${NC}"
        if [ "$HTTP_CODE" = "000" ]; then
            echo -e "   ${YELLOW}Error: Connection refused or timeout${NC}"
        else
            echo -e "   ${YELLOW}Error: HTTP $HTTP_CODE${NC}"
        fi
        return 1
    fi
}

# Function to check if a port is listening
check_port() {
    local port="$1"
    lsof -i :$port -sTCP:LISTEN >/dev/null 2>&1
    return $?
}

# Test Ollama Connection
test_ollama() {
    echo ""
    echo -e "${CYAN}--- Testing Ollama Service ---${NC}"
    
    if test_service "Ollama API" "http://localhost:11434/api/tags"; then
        # Parse model list from response
        if [ -f /tmp/dixi_test_response.txt ]; then
            MODELS=$(cat /tmp/dixi_test_response.txt | grep -o '"name":"[^"]*"' | sed 's/"name":"//g' | sed 's/"//g' | tr '\n' ', ' | sed 's/,$//')
            if [ -n "$MODELS" ]; then
                echo -e "   ${GRAY}Available models: $MODELS${NC}"
            fi
        fi
        return 0
    fi
    return 1
}

# Test Backend Health
test_backend() {
    echo ""
    echo -e "${CYAN}--- Testing Backend Service ---${NC}"
    
    # Basic health check
    if ! test_service "Backend Health" "http://localhost:3001/health"; then
        return 1
    fi
    
    # Deep health check
    if test_service "Backend Deep Health" "http://localhost:3001/health/deep"; then
        if [ -f /tmp/dixi_test_response.txt ]; then
            STATUS=$(cat /tmp/dixi_test_response.txt | grep -o '"status":"[^"]*"' | head -1 | sed 's/"status":"//g' | sed 's/"//g')
            OLLAMA_STATUS=$(cat /tmp/dixi_test_response.txt | grep -o '"ollama":{[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | sed 's/"status":"//g' | sed 's/"//g')
            
            if [ -n "$STATUS" ]; then
                if [ "$STATUS" = "healthy" ]; then
                    echo -e "   ${GREEN}Overall Status: $STATUS${NC}"
                else
                    echo -e "   ${YELLOW}Overall Status: $STATUS${NC}"
                fi
            fi
            
            if [ -n "$OLLAMA_STATUS" ]; then
                if [ "$OLLAMA_STATUS" = "healthy" ]; then
                    echo -e "   ${GREEN}Ollama Status: $OLLAMA_STATUS${NC}"
                else
                    echo -e "   ${YELLOW}Ollama Status: $OLLAMA_STATUS${NC}"
                fi
            fi
        fi
    fi
    
    return 0
}

# Test AI Service
test_ai() {
    echo ""
    echo -e "${CYAN}--- Testing AI Service ---${NC}"
    
    # Check AI status
    if ! test_service "AI Service Status" "http://localhost:3001/api/ai/status"; then
        return 1
    fi
    
    if [ -f /tmp/dixi_test_response.txt ]; then
        MODEL=$(cat /tmp/dixi_test_response.txt | grep -o '"modelName":"[^"]*"' | sed 's/"modelName":"//g' | sed 's/"//g')
        OLLAMA_STATUS=$(cat /tmp/dixi_test_response.txt | grep -o '"ollamaStatus":"[^"]*"' | sed 's/"ollamaStatus":"//g' | sed 's/"//g')
        
        if [ -n "$MODEL" ]; then
            echo -e "   ${GRAY}Model: $MODEL${NC}"
        fi
        
        if [ -n "$OLLAMA_STATUS" ]; then
            if [ "$OLLAMA_STATUS" = "connected" ]; then
                echo -e "   ${GREEN}Ollama Status: $OLLAMA_STATUS${NC}"
            else
                echo -e "   ${YELLOW}Ollama Status: $OLLAMA_STATUS${NC}"
            fi
        fi
    fi
    
    # Test actual AI inference
    echo ""
    echo -n "   Testing AI inference..."
    
    INFER_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/ai/infer" \
        -H "Content-Type: application/json" \
        -d '{"query":"Say hello and confirm you are working. Keep it brief.","context":null}' \
        --max-time 30 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$INFER_RESPONSE" ]; then
        # Check if response contains text
        if echo "$INFER_RESPONSE" | grep -q '"text"'; then
            echo -e " ${GREEN}✅ PASSED${NC}"
            
            # Extract preview of response
            TEXT=$(echo "$INFER_RESPONSE" | grep -o '"text":"[^"]*' | head -1 | sed 's/"text":"//g' | cut -c1-100)
            if [ -n "$TEXT" ]; then
                echo -e "   ${GRAY}Response preview: ${TEXT}...${NC}"
            fi
            
            # Extract inference time
            TIME=$(echo "$INFER_RESPONSE" | grep -o '"inferenceTime":[0-9]*' | sed 's/"inferenceTime"://g')
            if [ -n "$TIME" ]; then
                echo -e "   ${GRAY}Inference time: ${TIME}ms${NC}"
            fi
            
            return 0
        fi
    fi
    
    echo -e " ${RED}❌ FAILED${NC}"
    echo -e "   ${YELLOW}AI inference did not return expected response${NC}"
    return 1
}

# Test Frontend
test_frontend() {
    echo ""
    echo -e "${CYAN}--- Testing Frontend Service ---${NC}"
    
    # Try port 3000 first
    if test_service "Frontend (port 3000)" "http://localhost:3000"; then
        return 0
    fi
    
    # Try port 5173 (Vite default fallback)
    echo -e "${YELLOW}Port 3000 not available, trying port 5173...${NC}"
    if test_service "Frontend (port 5173)" "http://localhost:5173"; then
        echo -e "   ${YELLOW}⚠️  Frontend running on port 5173 instead of configured port 3000${NC}"
        return 0
    fi
    
    echo -e "${RED}Frontend not accessible on ports 3000 or 5173${NC}"
    return 1
}

# Test WebSocket Server
test_websocket() {
    echo ""
    echo -e "${CYAN}--- Testing WebSocket Server ---${NC}"
    echo -n "Checking WebSocket port 3002..."
    
    if check_port 3002; then
        echo -e " ${GREEN}✅ LISTENING${NC}"
        return 0
    else
        echo -e " ${YELLOW}⚠️  NOT LISTENING${NC}"
        return 1
    fi
}

# Run all tests
echo -e "${CYAN}Starting comprehensive system tests...${NC}"
echo ""

# Test 1: Ollama
if test_ollama; then
    TEST_RESULTS+=("Ollama:PASS")
else
    TEST_RESULTS+=("Ollama:FAIL")
    ALL_TESTS_PASSED=false
fi

# Test 2: Backend
if test_backend; then
    TEST_RESULTS+=("Backend:PASS")
else
    TEST_RESULTS+=("Backend:FAIL")
    ALL_TESTS_PASSED=false
fi

# Test 3: AI Service
if test_ai; then
    TEST_RESULTS+=("AI Service:PASS")
else
    TEST_RESULTS+=("AI Service:FAIL")
    ALL_TESTS_PASSED=false
fi

# Test 4: Frontend
if test_frontend; then
    TEST_RESULTS+=("Frontend:PASS")
else
    TEST_RESULTS+=("Frontend:FAIL")
    ALL_TESTS_PASSED=false
fi

# Test 5: WebSocket
if test_websocket; then
    TEST_RESULTS+=("WebSocket:PASS")
else
    TEST_RESULTS+=("WebSocket:FAIL")
    ALL_TESTS_PASSED=false
fi

# Summary
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  TEST SUMMARY${NC}"
echo -e "${CYAN}========================================${NC}"

PASSED=0
TOTAL=${#TEST_RESULTS[@]}

for RESULT in "${TEST_RESULTS[@]}"; do
    NAME=$(echo "$RESULT" | cut -d: -f1)
    STATUS=$(echo "$RESULT" | cut -d: -f2)
    
    if [ "$STATUS" = "PASS" ]; then
        echo -e "  ${NAME}: ${GREEN}✅ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "  ${NAME}: ${RED}❌ FAILED${NC}"
    fi
done

echo ""
if [ $PASSED -eq $TOTAL ]; then
    echo -e "  Results: ${GREEN}$PASSED/$TOTAL tests passed${NC}"
else
    echo -e "  Results: ${YELLOW}$PASSED/$TOTAL tests passed${NC}"
fi

if [ "$ALL_TESTS_PASSED" = true ]; then
    echo ""
    echo -e "${GREEN}🎉 All systems operational!${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  Some tests failed. Check the errors above.${NC}"
    exit 1
fi

