#!/bin/sh
# Runs every test of the pure rule modules and the collector. Needs node and python3; no packages.
set -e
cd "$(dirname "$0")"
for t in *.test.mjs; do node "$t"; done
PYTHONDONTWRITEBYTECODE=1 python3 test_collector.py
