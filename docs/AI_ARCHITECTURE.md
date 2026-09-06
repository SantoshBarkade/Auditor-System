# NEXORA Assistive AI Architecture & Grounding

## 1. Role of AI in NEXORA
AI is implemented strictly as an **assistive** and **explanatory** layer:
- Explaining the security context of findings in human-readable terms.
- Articulating the technical impact and consequences of exploitation.
- Correlating findings to foundational cybersecurity principles (e.g., Least Privilege, Defense-in-Depth).
- Assisting human administrators with contextual remediation advice.

---

## 2. Invariants & Output Contract
1. **No Authoritative Verdict Control:** AI cannot declare a rule `PASS` or `FAIL`. Only the deterministic Python rule evaluator is authoritative.
2. **No Arbitrary Score Generation:** Risk scores are calculated deterministically using the mathematical formula.
3. **Structured Schema:** All AI output follows this JSON structure:
```json
{
  "summary": "...",
  "why_it_matters": "...",
  "potential_impact": "...",
  "security_principle": "...",
  "recommended_action": "...",
  "source": "Gemini Generative AI / Deterministic Fallback",
  "confidence": "High"
}
```

---

## 3. Dual-Mode Fallback Engine
- **Mode A (Zero-API Key Fallback):** If `GEMINI_API_KEY` is not present, NEXORA produces rich, deterministic, structured explanations built directly from validated cybersecurity definitions.
- **Mode B (Gemini Generative AI):** If `GEMINI_API_KEY` is supplied, the application connects to the Gemini REST API (`gemini-1.5-flash`) with low temperature ($0.2$) for factual, grounded output.
