#!/bin/ash
# Script di setup SSH per container PHP

# Directory temporanea (verrà ricreata automaticamente se necessario)
mkdir -p /tmp/.ssh

# Copia e correggi i permessi sulla copia della chiave privata
cp /root/.ssh/id_github /tmp/.ssh/id_github_temp
chmod 600 /tmp/.ssh/id_github_temp

# Avvia l'SSH Agent (se non è già attivo)
eval $(ssh-agent -s)

# Aggiunge la chiave all'agent
ssh-add /tmp/.ssh/id_github_temp