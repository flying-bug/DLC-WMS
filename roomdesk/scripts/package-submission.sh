#!/usr/bin/env sh
# Builds sbad_assignment_01_<fpt_account>.zip from the project root, without target/, IDE
# folders, .env, database data or any secret.
# Usage: scripts/package-submission.sh <fpt_account>     e.g. scripts/package-submission.sh PhuongBV3
set -eu

if [ $# -ne 1 ] || [ -z "$1" ]; then
  echo "Usage: $0 <fpt_account>" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
out="sbad_assignment_01_$1.zip"
rm -f "$out"
zip -r -q "$out" \
  pom.xml mvnw mvnw.cmd .mvn \
  src/main src/test \
  Dockerfile .dockerignore compose.yaml .env.example .gitignore README.md scripts \
  -x '*/target/*' '*.iml' '*/.idea/*' '*/.vscode/*' '.env' '*/.DS_Store'
echo "Created $out"
unzip -l "$out" | tail -1
