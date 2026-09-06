"""
NEXORA Deterministic Semantic Embedder

Generates standardized 1536-dimensional normalized embedding vectors for
knowledge base documents and RAG queries.
Ensures deterministic, auditable, and airgap-resilient vector generation.
"""
import math
import hashlib
import re
from typing import List


class EmbedderService:
    DIMENSION = 1536

    # Domain-specific cybersecurity & networking anchor terms
    ANCHORS = [
        "ssh", "telnet", "crypto", "encryption", "aes", "rsa", "vty", "line",
        "transport", "input", "password", "secret", "enable", "authentication",
        "authorization", "accounting", "aaa", "tacacs", "radius", "snmp",
        "snmpv3", "community", "trap", "acl", "access-list", "firewall", "filter",
        "policy", "rule", "permit", "deny", "interface", "vlan", "trunk",
        "ntp", "server", "logging", "syslog", "buffered", "trap", "audit",
        "cisco", "ios", "fortinet", "fortigate", "fortios", "juniper", "junos",
        "admin", "root", "user", "timeout", "exec-timeout", "idle-timeout",
        "banner", "motd", "login", "tcp", "udp", "port", "ip", "address",
        "mask", "prefix", "route", "bgp", "ospf", "stp", "bpduguard", "dhcp",
        "snooping", "dai", "arp", "inspection", "segmentation", "zone", "vpn",
        "ipsec", "ike", "sha256", "sha512", "md5", "cleartext", "plaintext"
    ]

    @classmethod
    def get_embedding(cls, text: str) -> List[float]:
        """
        Generate a normalized 1536-dimensional semantic embedding vector.
        Combines domain term resonance with hashing projection.
        """
        vec = [0.0] * cls.DIMENSION
        text_lower = text.lower()
        tokens = re.findall(r'[a-zA-Z0-9_\-]+', text_lower)

        # 1. Project domain anchor signals into primary vector partitions
        for idx, anchor in enumerate(cls.ANCHORS):
            weight = text_lower.count(anchor) * 2.5
            if weight > 0:
                pos = (idx * 17) % cls.DIMENSION
                vec[pos] += weight
                vec[(pos + 1) % cls.DIMENSION] += weight * 0.7
                vec[(pos + 2) % cls.DIMENSION] += weight * 0.3

        # 2. Project n-grams and token hashes into vector space
        for i, tok in enumerate(tokens):
            h = int(hashlib.md5(tok.encode('utf-8')).hexdigest(), 16)
            pos1 = h % cls.DIMENSION
            pos2 = (h >> 16) % cls.DIMENSION
            vec[pos1] += 1.0
            vec[pos2] += 0.5

            if i < len(tokens) - 1:
                bigram = f"{tok}_{tokens[i+1]}"
                h_bi = int(hashlib.sha256(bigram.encode('utf-8')).hexdigest(), 16)
                pos_bi = h_bi % cls.DIMENSION
                vec[pos_bi] += 1.5

        # 3. L2 Normalize the vector
        magnitude = math.sqrt(sum(x * x for x in vec))
        if magnitude > 0:
            return [round(x / magnitude, 6) for x in vec]
        else:
            # Fallback uniform vector
            val = 1.0 / math.sqrt(cls.DIMENSION)
            return [val] * cls.DIMENSION

    @classmethod
    def cosine_similarity(cls, vec_a: List[float], vec_b: List[float]) -> float:
        """Calculate cosine similarity between two 1536-dim vectors."""
        if len(vec_a) != len(vec_b):
            return 0.0
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        mag_a = math.sqrt(sum(a * a for a in vec_a))
        mag_b = math.sqrt(sum(b * b for b in vec_b))
        if mag_a == 0 or mag_b == 0:
            return 0.0
        return max(0.0, min(1.0, dot / (mag_a * mag_b)))
