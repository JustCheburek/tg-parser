#!/bin/bash

# Define the path to the key file
KEYFILE="./data/config/mongodb-keyfile"

# Check if the key file already exists
if [ ! -f "$KEYFILE" ]; then
  # Create the directory if it does not exist
  mkdir -p ./data/config

  # Generate a new key file
  openssl rand -base64 756 > "$KEYFILE"

  # Set the appropriate permissions for the key file
  chmod 600 "$KEYFILE"
fi
