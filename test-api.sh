#!/bin/bash
set -e

echo "Running Spring Boot API Hurl Tests..."

# Check if hurl is installed
if ! command -v hurl &> /dev/null; then
    echo "Error: hurl could not be found."
    echo "Please install Hurl (https://hurl.dev/docs/installation.html)"
    echo "For example, on macOS: brew install hurl"
    echo "On Linux: curl -sSL https://hurl.dev/install.sh | bash"
    exit 1
fi

# Define the host variable (default to localhost:8080)
HOST="${API_HOST:-http://localhost:8080}"
echo "Targeting API at: $HOST"

# Generate a random suffix for email addresses to avoid collisions during repeated tests
SUFFIX=$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 8 | head -n 1)

# Run the hurl tests
hurl --test \
     --variable host="$HOST" \
     --variable suffix="$SUFFIX" \
     --glob "packages/api-server/hurl/*.hurl"
