#!/bin/bash
# Start Intune Policy Description Generator

echo "Starting Intune Policy Description Generator..."
echo ""

# Check az login
if ! az account show &>/dev/null; then
    echo "ERROR: Not logged in to Azure. Run 'az login' first."
    exit 1
fi
echo "Azure CLI: Authenticated"

# Start backend
echo "Starting backend..."
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "Backend running at http://localhost:8000"
echo "Frontend running at http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
