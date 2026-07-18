#!/bin/bash

# Install dependencies
pip install -r requirements.txt

# Run Django migrations
python manage.py migrate --no-input

# Collect static files
python manage.py collectstatic --no-input
