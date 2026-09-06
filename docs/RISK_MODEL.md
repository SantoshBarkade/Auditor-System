# NEXORA Risk Scoring Model Specification
## Deterministic Multi-Factor Network Security Risk Engine

### 1. Overview
In accordance with Smart India Hackathon requirements and strict architectural invariants, **AI does not assign or override risk scores**. All risk scores in NEXORA are computed mathematically and deterministically by `backend/app/services/risk_engine/calculator.py`.

### 2. Multi-Dimensional Risk Factors
Every security rule evaluated by NEXORA is measured across four independent security dimensions rated on a discrete scale from **1 (Minimal)** to **4 (Critical)**:

| Factor | Weight | Description | Scale Guidance |
|---|---|---|---|
| **Severity ($S$)** | 35% ($0.35$) | Intrinsic technical severity of the vulnerability or misconfiguration | **1:** Best practice deviation<br>**2:** Informational / minor audit gap<br>**3:** Missing defense-in-depth<br>**4:** Remote code execution, unencrypted credentials, bypass |
| **Exposure ($E$)** | 25% ($0.25$) | Network accessibility and blast radius of the affected interface/service | **1:** Isolated loopback / internal restricted<br>**2:** Local subnet access only<br>**3:** Multi-VLAN / cross-zone transit<br>**4:** Public internet / perimeter WAN exposed |
| **Impact ($I$)** | 20% ($0.20$) | Potential damage to confidentiality, integrity, or availability | **1:** Negligible operational impact<br>**2:** Component-level degradation<br>**3:** Data leakage / unauthorized lateral movement<br>**4:** Complete infrastructure compromise / outage |
| **Exploitability ($X$)** | 20% ($0.20$) | Ease with which an attacker can leverage the finding without prerequisites | **1:** Theoretical, requires local root access<br>**2:** Requires authenticated privileged access<br>**3:** Requires unauthenticated internal network access<br>**4:** Trivial remote execution / sniffing / default credentials |

---

### 3. Mathematical Formula

$$\text{Weighted Score} = (S \times 0.35) + (E \times 0.25) + (I \times 0.20) + (X \times 0.20)$$

$$\text{Final Risk Score} = \text{round}\left(\frac{\text{Weighted Score}}{4.0} \times 100\right)$$

The final result is bounded strictly to the integer range $[0, 100]$.

---

### 4. Qualitative Risk Tiers

| Score Range | Severity Tier | Action Required |
|---|---|---|
| **85 – 100** | **CRITICAL** | Immediate emergency remediation required; active exploit potential |
| **70 – 84** | **HIGH** | High-priority remediation; clear compliance violation |
| **45 – 69** | **MEDIUM** | Remediation scheduled during next maintenance cycle |
| **20 – 44** | **LOW** | Hardening opportunity / defense-in-depth enhancement |
| **0 – 19** | **INFORMATIONAL** | Architectural note / configuration observation |

---

### 5. Verification Delta & Risk Reduction
Upon human approval and sandboxed simulation of proposed remediation patches, the security engine re-evaluates the patched configuration. The before-and-after risk reduction percentage is calculated as:

$$\text{Risk Reduction \%} = \left(\frac{\text{Risk}_{\text{Before}} - \text{Risk}_{\text{After}}}{\text{Risk}_{\text{Before}}}\right) \times 100$$
