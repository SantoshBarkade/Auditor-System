# NEXORA Tamper-Evident SHA-256 Blockchain Audit Trail

## 1. Blockchain Concept & SIH Theme
In accordance with the SIH 2026 theme (**Blockchain & Cybersecurity**), NEXORA implements a local, permissioned-style cryptographic audit blockchain.
It is an append-only, hash-chained ledger where every significant security and administrative action creates an immutable cryptographic block.

---

## 2. Block Structure & SHA-256 Chaining

```
┌─────────────────────────────────────────────────────────────┐
│                          BLOCK N                            │
│  - index: N                                                 │
│  - timestamp: ISO 8601 UTC                                  │
│  - event_type: REMEDIATION_APPROVED                         │
│  - actor: Security Administrator                            │
│  - audit_id: 1                                              │
│  - payload_hash: SHA256(event_data)                         │
│  - previous_hash: Block N-1 block_hash                      │
│  - block_hash: SHA256(index|ts|event|actor|payload|prev)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ previous_hash
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                         BLOCK N-1                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Cryptographic Verification & Tamper Detection
The endpoint `POST /api/v1/blockchain/verify` checks:
1. **Genesis Continuity:** Genesis block `previous_hash` equals `0000000000000000000000000000000000000000000000000000000000000000`.
2. **Hash Chaining:** For every block $i > 0$, `block[i].previous_hash == block[i-1].block_hash`.
3. **Payload Integrity:** Recalculated SHA-256 of `event_data` matches `payload_hash`.
4. **Header Integrity:** Recalculated SHA-256 of block header matches `block_hash`.

If an unauthorized actor mutates historical findings or audit data in the database, `validate_chain()` immediately halts with `TAMPERING DETECTED` and identifies the exact compromised block index.

The frontend includes a **"Simulate Tampering (Live Demo)"** button that demonstrates this live in front of judges!
