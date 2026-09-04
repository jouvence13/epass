#!/bin/bash
set -e

echo "⏳ En attente de la disponibilité de PostgreSQL..."
until pg_isready -h ${POSTGRES_SERVER:-postgres} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-uac_buspass_user}; do
  >&2 echo "Postgres n'est pas encore prêt - nouvelle tentative dans 1 seconde..."
  sleep 1
done
echo "✅ PostgreSQL est disponible et opérationnel."

# Exécuter les migrations ou le seeder si demandé
if [ "$AUTO_SEED" = "true" ]; then
  echo "🌱 Exécution du seeder de base de données..."
  python seed.py || echo "⚠️ Le seeder a rencontré un avertissement ou a déjà été exécuté."
fi

echo "🚀 Lancement de l'application..."
exec "$@"
