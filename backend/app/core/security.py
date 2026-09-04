"""
================================================================================
MODULE : SÉCURITÉ, HACHAGE, JETONS JWT & CHIFFREMENT SYMÉTRIQUE AES-256
================================================================================
Ce module contient toutes les fonctions cryptographiques de base :
1. Hachage sécurisé et vérification des mots de passe avec Bcrypt.
2. Création et vérification des jetons d'accès et de rafraîchissement JWT.
3. Chiffrement et déchiffrement AES-256-CBC des QR codes pour empêcher toute fraude ou duplication.
================================================================================
"""

import base64
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union

# PyJWT permet de signer et valider des JSON Web Tokens
import jwt
import bcrypt
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

from app.core.config import settings

# ==============================================================================
# 1. GESTION DES MOTS DE PASSE (BCRYPT NATIF)
# ==============================================================================

def hash_password(password: str) -> str:
    """
    Hache un mot de passe en clair à l'aide de l'algorithme Bcrypt.
    Génère un sel aléatoire et tronque à 72 octets max (limite standard bcrypt).
    """
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Vérifie si le mot de passe fourni correspond au hash enregistré.
    """
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False


# ==============================================================================
# 2. GESTION DES JETONS JWT (JSON WEB TOKENS)
# ==============================================================================

def create_access_token(
    subject: Union[str, Any],
    role: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Génère un jeton JWT d'accès (Access Token) pour authentifier les requêtes API.
    Par défaut, ce jeton expire au bout de 24 heures (ACCESS_TOKEN_EXPIRE_MINUTES).
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Payload du token : données publiques signées
    to_encode = {
        "sub": str(subject),  # Identifiant de l'utilisateur (UUID)
        "role": role,         # Rôle de l'utilisateur (STUDENT, DRIVER, ADMIN...)
        "exp": expire,        # Date d'expiration en UTC
        "type": "access"      # Type de token pour éviter toute confusion avec un refresh token
    }
    
    # Signature numérique HMAC-SHA256 avec la clé secrète du serveur
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(
    subject: Union[str, Any],
    role: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Génère un jeton de rafraîchissement (Refresh Token) d'une durée de validité longue (30 jours).
    Il permet à l'application mobile de renouveler l'Access Token sans redemander le mot de passe.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "type": "refresh"
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """
    Décode et valide la signature cryptographique ainsi que la date d'expiration d'un JWT.
    Lève une exception ValueError en cas de token corrompu ou falsifié.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError as e:
        raise ValueError(f"Jeton invalide ou expiré : {str(e)}")


# ==============================================================================
# 3. CHIFFREMENT SYMÉTRIQUE AES-256 DES QR CODES (ANTI-FRAUDE)
# ==============================================================================

def _get_aes_key() -> bytes:
    """
    Garantit que la clé AES mesure exactement 32 octets (256 bits)
    pour le standard de chiffrement AES-256.
    """
    key_str = settings.QR_ENCRYPTION_KEY
    key_bytes = key_str.encode("utf-8")
    if len(key_bytes) < 32:
        key_bytes = key_bytes.ljust(32, b"0")
    elif len(key_bytes) > 32:
        key_bytes = key_bytes[:32]
    return key_bytes


def generate_encrypted_qr_payload(ticket_id: str, user_id: str, trip_id: str) -> str:
    """
    Génère une chaîne chiffrée en AES-256-CBC et encodée en Base64 URL-Safe pour le QR Code.
    
    Structure du flux :
    1. Crée un dictionnaire JSON contenant les identifiants du ticket, de l'étudiant et du trajet.
    2. Génère un vecteur d'initialisation aléatoire (IV de 16 octets) pour éviter les attaques par rejeu.
    3. Applique le rembourrage PKCS7 pour obtenir un multiple de 16 octets (taille de bloc AES).
    4. Chiffre les données et assemble IV + Ciphertext en Base64.
    """
    key = _get_aes_key()
    iv = os.urandom(16)  # Vecteur d'initialisation aléatoire unique par QR Code
    
    data = {
        "ticket_id": str(ticket_id),
        "user_id": str(user_id),
        "trip_id": str(trip_id),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    raw_bytes = json.dumps(data).encode("utf-8")
    
    # Remplissage standard PKCS7 pour atteindre un multiple de 16 octets
    padding_length = 16 - (len(raw_bytes) % 16)
    padded_data = raw_bytes + bytes([padding_length] * padding_length)
    
    # Chiffrement avec l'algorithme AES en mode CBC (Cipher Block Chaining)
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    encrypted = encryptor.update(padded_data) + encryptor.finalize()
    
    # Concaténation : IV (16 octets) + Données chiffrées -> Encodage Base64
    combined = iv + encrypted
    return base64.urlsafe_b64encode(combined).decode("utf-8")


def decrypt_qr_payload(encrypted_token: str) -> Dict[str, Any]:
    """
    Déchiffre un jeton de QR Code scanné par le chauffeur pour en extraire les données d'origine.
    """
    key = _get_aes_key()
    try:
        combined = base64.urlsafe_b64decode(encrypted_token.encode("utf-8"))
        if len(combined) < 32:
            raise ValueError("Longueur de payload QR Code insuffisante.")
        
        # Séparation de l'IV (16 premiers octets) et du message chiffré
        iv = combined[:16]
        encrypted = combined[16:]
        
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded_data = decryptor.update(encrypted) + decryptor.finalize()
        
        # Suppression du remplissage PKCS7
        padding_length = padded_data[-1]
        raw_bytes = padded_data[:-padding_length]
        
        data = json.loads(raw_bytes.decode("utf-8"))
        return data
    except Exception as e:
        raise ValueError(f"Échec du déchiffrement du QR code : {str(e)}")
