"""
NEXORA Authoritative Knowledge Base Seeder

Populates PostgreSQL / pgvector with authoritative network security baselines,
CIS Benchmarks, and vendor hardening standards for Cisco, Fortinet, and Juniper.
"""
import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from backend.app.services.rag.embedder import EmbedderService

logger = logging.getLogger(__name__)

DOCUMENTS_SEED = [
    # Cisco
    {
        "title": "Cisco IOS XE Security Configuration Guide",
        "vendor": "Cisco",
        "category": "Management Security",
        "source_type": "VENDOR_DOCUMENTATION",
        "authority_level": "AUTHORITATIVE",
        "version": "17.x",
        "document_url": "https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_usr_cfg/configuration/xe-17/sec-usr-cfg-xe-17-book.html",
        "chunks": [
            {
                "chunk_index": 1,
                "title": "VTY Line Transport and Encryption Hardening",
                "content": (
                    "To prevent eavesdropping and credential theft on administrative connections, "
                    "all VTY lines (0 through 15) must explicitly restrict incoming connections to SSH. "
                    "The configuration command 'transport input ssh' must be applied under 'line vty 0 4' "
                    "and 'line vty 5 15'. Insecure protocols including 'telnet' and 'transport input all' "
                    "are strictly prohibited. Additionally, 'exec-timeout 10 0' should be set to automatically "
                    "terminate idle administrative sessions after 10 minutes."
                ),
                "metadata": {
                    "features": ["line vty", "ssh", "transport input"],
                    "rules": ["CISCO-LINE-01", "CISCO-MGMT-01"],
                    "syntax_patterns": ["transport input ssh", "exec-timeout 10 0"]
                }
            },
            {
                "chunk_index": 2,
                "title": "AAA Authentication and User Secret Standards",
                "content": (
                    "Enable AAA with 'aaa new-model' to centralize authentication and authorization. "
                    "All local administrative accounts must utilize Type 8 (PBKDF2-SHA256) or Type 9 (scrypt) "
                    "cryptographic hashes using the 'username <name> secret' command. Cleartext or weakly hashed "
                    "passwords using 'username <name> password' (Type 7 reversible obfuscation) or Type 5 (MD5) "
                    "are non-compliant. The privileged execution mode must be guarded with 'enable secret'."
                ),
                "metadata": {
                    "features": ["aaa", "username", "enable secret"],
                    "rules": ["CISCO-AUTH-01", "CISCO-AUTH-02"],
                    "syntax_patterns": ["aaa new-model", "username secret", "enable secret"]
                }
            },
            {
                "chunk_index": 3,
                "title": "SNMPv3 Cryptographic Security Baseline",
                "content": (
                    "SNMP versions 1 and 2c transmit community strings in plaintext across the network, exposing "
                    "device management. SNMPv3 must be enforced using the User-based Security Model (USM) with "
                    "authPriv security level, requiring SHA authentication and AES encryption. "
                    "Commands: 'snmp-server group <grp> v3 priv' and 'snmp-server user <usr> <grp> v3 auth sha <pwd> priv aes 128 <pwd>'. "
                    "Default communities such as 'public' or 'private' must be removed."
                ),
                "metadata": {
                    "features": ["snmp", "snmpv3", "snmp-server"],
                    "rules": ["CISCO-SNMP-01"],
                    "syntax_patterns": ["snmp-server group v3 priv", "snmp-server user"]
                }
            },
            {
                "chunk_index": 4,
                "title": "Centralized Audit Logging and Time Synchronization",
                "content": (
                    "Comprehensive security auditing requires centralized syslog forwarding and synchronized timestamps. "
                    "Configure 'logging host <ip>' or 'logging server <ip>' to stream events to an external SIEM. "
                    "Enable microsecond timestamps using 'service timestamps log datetime msec show-timezone'. "
                    "NTP must be configured using 'ntp server <ip>' with authentication to guarantee forensic log validity."
                ),
                "metadata": {
                    "features": ["logging", "syslog", "ntp"],
                    "rules": ["CISCO-LOG-01", "CISCO-NTP-01"],
                    "syntax_patterns": ["logging host", "service timestamps log", "ntp server"]
                }
            }
        ]
    },
    # Fortinet
    {
        "title": "Fortinet FortiOS Hardening Guide & Baseline",
        "vendor": "Fortinet",
        "category": "Administrative Security",
        "source_type": "VENDOR_DOCUMENTATION",
        "authority_level": "AUTHORITATIVE",
        "version": "7.2",
        "document_url": "https://docs.fortinet.com/document/fortigate/7.2.0/best-practices/hardening-your-fortigate",
        "chunks": [
            {
                "chunk_index": 1,
                "title": "Administrative Interface Access Hardening",
                "content": (
                    "Administrative access to FortiGate interfaces must be restricted strictly to encrypted protocols. "
                    "Under 'config system interface', the 'set allowaccess' directive must only contain 'ssh' and 'https'. "
                    "Insecure services including 'http' and 'telnet' must be removed from allowaccess on all interfaces. "
                    "Dedicated management interfaces and trusted subnets ('set trusthost') must be configured for all administrators."
                ),
                "metadata": {
                    "features": ["system interface", "allowaccess", "admin"],
                    "rules": ["FORTI-INTF-01", "FORTI-MGMT-01"],
                    "syntax_patterns": ["set allowaccess ping https ssh", "set trusthost"]
                }
            },
            {
                "chunk_index": 2,
                "title": "Global Idle Timeout and Password Policy",
                "content": (
                    "Under 'config system global', configure 'set admintimeout 10' to automatically disconnect idle admin "
                    "sessions after 10 minutes. Configure 'config system password-policy' to enforce complex passwords "
                    "with minimum 14 characters ('set min-lower-case-letter 1', 'set min-upper-case-letter 1', "
                    "'set min-non-alphanumeric 1', 'set min-number 1') and account lockout after failed attempts."
                ),
                "metadata": {
                    "features": ["system global", "admintimeout", "password-policy"],
                    "rules": ["FORTI-GLOBAL-01", "FORTI-PWD-01"],
                    "syntax_patterns": ["set admintimeout 10", "config system password-policy"]
                }
            },
            {
                "chunk_index": 3,
                "title": "Firewall Policy Audit Logging Enforcement",
                "content": (
                    "Every firewall policy ('config firewall policy') must generate audit records. "
                    "The directive 'set logtraffic all' or 'set logtraffic utm' must be enabled on every permit rule. "
                    "Disabled logging ('set logtraffic disable') creates compliance gaps under PCI DSS 10.2 and NIST AU-2. "
                    "Remote syslog logging must be enabled via 'config log syslogd setting' with 'set status enable'."
                ),
                "metadata": {
                    "features": ["firewall policy", "logtraffic", "syslogd"],
                    "rules": ["FORTI-LOG-01", "FORTI-FW-01"],
                    "syntax_patterns": ["set logtraffic all", "config log syslogd setting"]
                }
            }
        ]
    },
    # Juniper
    {
        "title": "Juniper Junos OS System Security Configuration Guide",
        "vendor": "Juniper",
        "category": "Authentication & Access Control",
        "source_type": "VENDOR_DOCUMENTATION",
        "authority_level": "AUTHORITATIVE",
        "version": "22.x",
        "document_url": "https://www.juniper.net/documentation/us/en/software/junos/security-configuration/index.html",
        "chunks": [
            {
                "chunk_index": 1,
                "title": "Junos Management Services & Protocol Hardening",
                "content": (
                    "In Junos OS, management protocols are configured under the [system services] hierarchy. "
                    "Enforce secure remote administration using 'set system services ssh protocol-version v2'. "
                    "Plaintext access services such as 'set system services telnet' and 'set system services web-management http' "
                    "must not be present in the active configuration. Client connections must be terminated after inactivity "
                    "using 'set system login idle-timeout 10'."
                ),
                "metadata": {
                    "features": ["system services", "ssh", "telnet"],
                    "rules": ["JUNIPER-SRV-01", "JUNIPER-MGMT-01"],
                    "syntax_patterns": ["set system services ssh protocol-version v2", "set system login idle-timeout 10"]
                }
            },
            {
                "chunk_index": 2,
                "title": "Junos Root and User Authentication Standards",
                "content": (
                    "Junos mandates strong cryptographic passwords for the root account and individual administrator logins. "
                    "Root password must be configured with 'set system root-authentication encrypted-password <hash>' utilizing "
                    "SHA-512 ($6$) or SSH public keys ('set system root-authentication ssh-rsa' / 'ssh-ed25519'). "
                    "Individual operator accounts must be defined under 'set system login user <name> class <class>' "
                    "and assigned appropriate privilege classes (super-user, operator, read-only)."
                ),
                "metadata": {
                    "features": ["system root-authentication", "system login user"],
                    "rules": ["JUNIPER-AUTH-01", "JUNIPER-AUTH-02"],
                    "syntax_patterns": ["set system root-authentication", "set system login user"]
                }
            },
            {
                "chunk_index": 3,
                "title": "Junos Security Logging and Forwarding",
                "content": (
                    "Junos security logging is governed under [system syslog]. "
                    "Centralized remote syslog forwarding must be configured with 'set system syslog host <ip> any info' "
                    "or 'set system syslog host <ip> authorization info' to retain administrative activity audits. "
                    "Local message archiving must be configured with 'set system syslog file messages any notice' and log rotation."
                ),
                "metadata": {
                    "features": ["system syslog", "syslog host"],
                    "rules": ["JUNIPER-LOG-01"],
                    "syntax_patterns": ["set system syslog host", "set system syslog file messages"]
                }
            }
        ]
    }
]

async def seed_knowledge_base():
    async with AsyncSessionLocal() as session:
        # Check existing docs count
        existing = await session.execute(select(KnowledgeDocument))
        existing_docs = existing.scalars().all()
        if len(existing_docs) >= len(DOCUMENTS_SEED):
            logger.info(f"Knowledge Base already contains {len(existing_docs)} documents. Skipping seed.")
            return

        total_chunks = 0
        for doc_data in DOCUMENTS_SEED:
            # Check if doc with this title exists
            res = await session.execute(select(KnowledgeDocument).where(KnowledgeDocument.title == doc_data["title"]))
            doc = res.scalar_one_or_none()
            if not doc:
                doc = KnowledgeDocument(
                    title=doc_data["title"],
                    vendor=doc_data["vendor"],
                    category=doc_data["category"],
                    source_type=doc_data["source_type"],
                    authority_level=doc_data["authority_level"],
                    version=doc_data.get("version"),
                    document_url=doc_data.get("document_url"),
                    created_at=datetime.now(timezone.utc)
                )
                session.add(doc)
                await session.flush()

            for c_data in doc_data["chunks"]:
                # Check if chunk exists
                chk_res = await session.execute(
                    select(KnowledgeChunk)
                    .where(KnowledgeChunk.document_id == doc.id)
                    .where(KnowledgeChunk.chunk_index == c_data["chunk_index"])
                )
                if not chk_res.scalar_one_or_none():
                    # Generate 1536-dim embedding vector
                    emb = EmbedderService.get_embedding(f"{c_data['title']} {c_data['content']}")
                    chunk = KnowledgeChunk(
                        document_id=doc.id,
                        chunk_index=c_data["chunk_index"],
                        title=c_data["title"],
                        content=c_data["content"],
                        chunk_metadata=c_data.get("metadata", {}),
                        embedding=emb,
                        created_at=datetime.now(timezone.utc)
                    )
                    session.add(chunk)
                    total_chunks += 1

        await session.commit()
        logger.info(f"Successfully seeded Knowledge Base with {total_chunks} chunks.")
        print(f"Seeded Knowledge Base with {total_chunks} chunks into PostgreSQL.")

if __name__ == "__main__":
    asyncio.run(seed_knowledge_base())
