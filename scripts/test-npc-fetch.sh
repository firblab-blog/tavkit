#!/bin/bash
# Test script to see what the backend returns for NPCs

echo "Testing NPC fetch endpoint..."
echo "Please paste your auth token when prompted:"
read -r TOKEN

echo ""
echo "Fetching NPCs..."
curl -s -X GET "http://localhost:8000/api/v1/npcs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
