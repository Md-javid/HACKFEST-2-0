"""
PolicyPulse AI – AI Service Layer (Gemini-Powered)
Capabilities:
  - Compliance rule extraction from policy PDF text
  - Violation explanation & confidence scoring
  - AI chatbot Q&A over live compliance data
  - Agentic compliance overview (autonomous analysis)
  - Demo policy generation with realistic AI rules
  - PDF document analysis
"""
import json
import re
import asyncio
from app.core.config import settings
from app.utils.pdf_parser import chunk_text

#  Prompts 

RULE_EXTRACTION_PROMPT = """You are an expert compliance analyst AI. Analyze the following policy document text and extract ALL compliance rules as structured JSON.

For each rule you identify, produce a JSON object with these exact fields:
- "rule_id": A short unique identifier like "RULE-001"
- "condition": The specific condition or requirement stated in the policy (what must be true)
- "required_action": What action is required to comply
- "severity": One of "critical", "high", "medium", "low", "info"
- "policy_reference": The section/page reference from the policy
- "category": Category like "data_protection", "access_control", "encryption", "training", "vendor_management", "retention", "audit"
- "applicable_record_types": Array of record types this rule applies to, from: ["employee", "server", "vendor", "data_store", "all"]
- "validation_logic": A JSON object describing how to validate this rule programmatically. Use format:
  {"field": "field_name_in_data", "operator": "equals|not_equals|greater_than|less_than|contains|exists|is_true|is_false|date_within_days", "value": expected_value}

Return ONLY a JSON array of rule objects. No markdown, no explanation, just the JSON array.

POLICY TEXT:
{policy_text}
"""

VIOLATION_EXPLANATION_PROMPT = """You are a compliance expert AI. A violation has been detected.

RULE: {rule_condition}
REQUIRED ACTION: {required_action}
RECORD ID: {record_id}
RECORD DATA: {record_data}

Provide a JSON response with exactly these fields:
- "explanation": A clear 2-3 sentence explanation of the violation
- "confidence_score": Float 0.0-1.0 (1.0 = certain violation)
- "suggested_remediation": Specific actionable fix
- "risk_assessment": One sentence about the risk

Return ONLY the JSON object. No markdown.
"""

CHAT_SYSTEM_PROMPT = """You are PolicyPulse AI Assistant — an expert autonomous compliance monitoring agent.
You help compliance officers understand their data, violations, rules, and risk posture.

Live compliance context:
{context}

Answer the question clearly and concisely. Be professional. Use bullet points for lists.
Only reference data from the context above.

User question: {question}
"""

OVERVIEW_PROMPT = """You are an autonomous compliance analysis AI. Analyze the following live compliance data and generate an executive overview.

COMPLIANCE DATA:
{context}

Provide a JSON response with:
- "headline": One powerful sentence summarizing the overall compliance health
- "compliance_score_analysis": 2-3 sentences analyzing the current score
- "top_risks": Array of 3 objects with "title" and "description"
- "immediate_actions": Array of 3 strings — most important actions to take TODAY
- "trend_insight": One sentence about whether compliance is improving or worsening
- "positive_highlights": Array of 2 strings — things that are going well

Return ONLY the JSON object.
"""

DEMO_POLICY_PROMPT = """You are a compliance policy expert. Generate exactly 10 realistic compliance rules for a modern data-driven organization based on GDPR, SOC 2, and ISO 27001 requirements.

Return a JSON array of 10 rule objects. Each must have ALL these fields:
- "condition": specific compliance requirement
- "required_action": action to ensure compliance
- "severity": "critical", "high", "medium", or "low"
- "policy_reference": realistic reference like "GDPR Art. 32" or "SOC2 CC6.1"
- "category": one of "data_protection", "access_control", "encryption", "training", "vendor_management", "retention", "audit"
- "applicable_record_types": array from ["employee", "server", "vendor", "data_store", "all"]
- "validation_logic": {"field": string, "operator": "is_true|is_false|exists|date_within_days|equals|not_equals|greater_than|less_than", "value": any}

Use realistic field names: mfa_enabled, encryption_enabled, last_training_date, contract_signed, backup_enabled, ssl_certificate_valid, retention_days, last_audit_date, data_classification, access_level.

Return ONLY the JSON array, no markdown.
"""

PDF_ANALYSIS_PROMPT = """You are an expert document analyst. Analyze this document and provide a structured summary.

DOCUMENT:
{text}

Provide a JSON response with:
- "document_type": What type of document this is
- "summary": 3-4 sentence executive summary
- "key_requirements": Array of 5-7 most important requirements (plain English)
- "risk_areas": Array of risk areas mentioned
- "compliance_frameworks": Array of compliance frameworks referenced (GDPR, SOC2, ISO27001, etc.)
- "estimated_rule_count": Integer estimate of compliance rules in this document

Return ONLY the JSON object.
"""


#  Core AI caller 

def call_gemini(prompt: str, temperature: float = 0.3) -> str:
    try:
        # New SDK: google-genai
        from google import genai
        from google.genai import types as genai_types
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=prompt,
            config=genai_types.GenerateContentConfig(temperature=temperature),
        )
        return response.text
    except ImportError:
        # Fallback: legacy google.generativeai
        import google.generativeai as genai_legacy
        genai_legacy.configure(api_key=settings.GEMINI_API_KEY)
        model = genai_legacy.GenerativeModel(
            "gemini-1.5-flash",
            generation_config=genai_legacy.types.GenerationConfig(temperature=temperature),
        )
        response = model.generate_content(prompt)
        return response.text


def call_ai(prompt: str, temperature: float = 0.3) -> str:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set. Add it to your .env file.")
    return call_gemini(prompt, temperature)


async def call_ai_async(prompt: str, temperature: float = 0.3) -> str:
    """Async wrapper — runs the synchronous Gemini call in a thread pool
    so it never blocks the event loop."""
    return await asyncio.to_thread(call_ai, prompt, temperature)


def clean_json_response(text: str) -> str:
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```\s*$", "", text, flags=re.MULTILINE)
    return text.strip()


#  Rule extraction 

def extract_rules_from_policy(policy_text: str, policy_id: str) -> list:
    chunks = chunk_text(policy_text)
    all_rules = []
    rule_counter = 1
    for i, chunk in enumerate(chunks):
        try:
            prompt = RULE_EXTRACTION_PROMPT.format(policy_text=chunk)
            response = call_ai(prompt)
            cleaned = clean_json_response(response)
            rules = json.loads(cleaned)
            if isinstance(rules, list):
                for rule in rules:
                    rule["rule_id"] = f"RULE-{rule_counter:03d}"
                    rule["policy_id"] = policy_id
                    rule_counter += 1
                    all_rules.append(rule)
        except Exception as e:
            print(f"[WARN] Failed to parse rules from chunk {i}: {e}")
            all_rules.extend(_static_fallback_rules(policy_id, rule_counter))
    return all_rules if all_rules else _static_fallback_rules(policy_id)


async def generate_demo_rules_with_ai(policy_id: str) -> list:
    try:
        response = await call_ai_async(DEMO_POLICY_PROMPT, temperature=0.7)
        cleaned = clean_json_response(response)
        rules = json.loads(cleaned)
        if isinstance(rules, list):
            for i, rule in enumerate(rules, 1):
                rule["rule_id"] = f"RULE-{i:03d}"
                rule["policy_id"] = policy_id
            return rules
    except Exception as e:
        print(f"[WARN] AI demo generation failed: {e}, using static fallback")
    return _static_fallback_rules(policy_id)


def _static_fallback_rules(policy_id: str, start_index: int = 1) -> list:
    base = [
        {
            "condition": "All employee accounts must have MFA enabled",
            "required_action": "Enable MFA on all user accounts",
            "severity": "critical",
            "policy_reference": "SOC2 CC6.1 / ISO 27001 A.9.4",
            "category": "access_control",
            "applicable_record_types": ["employee"],
            "validation_logic": {"field": "mfa_enabled", "operator": "is_true", "value": True},
        },
        {
            "condition": "All data stores containing personal data must be encrypted at rest",
            "required_action": "Enable AES-256 encryption on all data stores",
            "severity": "critical",
            "policy_reference": "GDPR Art. 32 / SOC2 CC6.7",
            "category": "encryption",
            "applicable_record_types": ["data_store", "server"],
            "validation_logic": {"field": "encryption_enabled", "operator": "is_true", "value": True},
        },
        {
            "condition": "All employees must complete security training within the last 365 days",
            "required_action": "Complete annual security awareness training",
            "severity": "high",
            "policy_reference": "ISO 27001 A.7.2.2 / SOC2 CC1.4",
            "category": "training",
            "applicable_record_types": ["employee"],
            "validation_logic": {"field": "last_training_date", "operator": "date_within_days", "value": 365},
        },
        {
            "condition": "All third-party vendors must have a signed Data Processing Agreement",
            "required_action": "Execute and archive a signed DPA before data sharing",
            "severity": "high",
            "policy_reference": "GDPR Art. 28",
            "category": "vendor_management",
            "applicable_record_types": ["vendor"],
            "validation_logic": {"field": "contract_signed", "operator": "is_true", "value": True},
        },
        {
            "condition": "All production servers must have automated daily backups enabled",
            "required_action": "Configure automated backup schedules on all servers",
            "severity": "high",
            "policy_reference": "ISO 27001 A.12.3 / SOC2 A1.2",
            "category": "data_protection",
            "applicable_record_types": ["server"],
            "validation_logic": {"field": "backup_enabled", "operator": "is_true", "value": True},
        },
        {
            "condition": "Personal data must not be retained more than 730 days without review",
            "required_action": "Implement automated 2-year data retention review cycle",
            "severity": "medium",
            "policy_reference": "GDPR Art. 5(1)(e)",
            "category": "retention",
            "applicable_record_types": ["data_store"],
            "validation_logic": {"field": "retention_days", "operator": "less_than", "value": 730},
        },
        {
            "condition": "All servers must have a valid SSL/TLS certificate",
            "required_action": "Renew and install valid SSL certificates before expiry",
            "severity": "high",
            "policy_reference": "SOC2 CC6.7 / NIST SP 800-52",
            "category": "encryption",
            "applicable_record_types": ["server"],
            "validation_logic": {"field": "ssl_certificate_valid", "operator": "is_true", "value": True},
        },
        {
            "condition": "Sensitive data access must follow least-privilege principles",
            "required_action": "Review and restrict access rights to minimum required",
            "severity": "medium",
            "policy_reference": "ISO 27001 A.9.2.3 / SOC2 CC6.3",
            "category": "access_control",
            "applicable_record_types": ["employee", "data_store"],
            "validation_logic": {"field": "access_level", "operator": "not_equals", "value": "admin"},
        },
        {
            "condition": "Audit logs must be reviewed at least every 90 days",
            "required_action": "Conduct and document quarterly audit log reviews",
            "severity": "medium",
            "policy_reference": "SOC2 CC7.2 / ISO 27001 A.12.4",
            "category": "audit",
            "applicable_record_types": ["all"],
            "validation_logic": {"field": "last_audit_date", "operator": "date_within_days", "value": 90},
        },
        {
            "condition": "All data assets must have a data classification label assigned",
            "required_action": "Assign classification label (public/internal/confidential/restricted)",
            "severity": "low",
            "policy_reference": "ISO 27001 A.8.2 / SOC2 CC6.1",
            "category": "data_protection",
            "applicable_record_types": ["data_store"],
            "validation_logic": {"field": "data_classification", "operator": "exists", "value": True},
        },
    ]
    for i, rule in enumerate(base, start_index):
        rule["rule_id"] = f"RULE-{i:03d}"
        rule["policy_id"] = policy_id
    return base


# ─────────────────────────────────────────────────────────────
#  Async versions (non-blocking — run Gemini in thread pool)
# ─────────────────────────────────────────────────────────────

async def analyze_pdf_async(extracted_text: str) -> dict:
    """Non-blocking PDF document analysis."""
    sample = extracted_text[:6000]
    prompt = PDF_ANALYSIS_PROMPT.format(text=sample)
    try:
        response = await call_ai_async(prompt, temperature=0.3)
        cleaned = clean_json_response(response)
        result = json.loads(cleaned)
        result["status"] = "success"
        return result
    except Exception as e:
        print(f"[WARN] analyze_pdf_async failed: {e}")
        return {
            "status": "error", "document_type": "Unknown", "summary": str(e),
            "key_requirements": [], "risk_areas": [],
            "compliance_frameworks": [], "estimated_rule_count": 0,
        }


async def extract_rules_async(policy_text: str, policy_id: str) -> list:
    """Non-blocking rule extraction. Processes up to 3 chunks to stay fast."""
    # Limit to 3 chunks (~12 000 chars) — enough for most policies
    chunks = chunk_text(policy_text)[:3]
    all_rules: list = []
    rule_counter = 1
    for i, chunk in enumerate(chunks):
        try:
            prompt = RULE_EXTRACTION_PROMPT.format(policy_text=chunk)
            response = await call_ai_async(prompt)
            cleaned = clean_json_response(response)
            rules = json.loads(cleaned)
            if isinstance(rules, list):
                for rule in rules:
                    rule["rule_id"] = f"RULE-{rule_counter:03d}"
                    rule["policy_id"] = policy_id
                    rule_counter += 1
                    all_rules.append(rule)
        except Exception as e:
            print(f"[WARN] extract_rules_async chunk {i} failed: {e}")
    return all_rules if all_rules else _static_fallback_rules(policy_id)


# Aliases for backward compatibility
generate_fallback_rules = _static_fallback_rules
extract_rules_from_text = extract_rules_from_policy


#  AI Chatbot 

def _static_chat_answer(question: str, context_data: dict) -> str:
    """Rule-based chat fallback — answers common questions from live data."""
    score = context_data.get("compliance_score", 0)
    critical = context_data.get("severity_breakdown", {}).get("critical", 0)
    high = context_data.get("severity_breakdown", {}).get("high", 0)
    medium = context_data.get("severity_breakdown", {}).get("medium", 0)
    low = context_data.get("severity_breakdown", {}).get("low", 0)
    open_v = context_data.get("open_violations", 0)
    total_v = context_data.get("total_violations", 0)
    resolved = context_data.get("resolved_violations", 0)
    total_rules = context_data.get("total_rules", 0)
    total_records = context_data.get("total_records", 0)
    total_policies = context_data.get("total_policies", 0)
    violations = context_data.get("recent_open_violations", [])

    q = question.lower()

    # Compliance score
    if any(w in q for w in ["score", "compliance score", "how compliant", "percentage"]):
        level = "strong" if score >= 85 else "moderate" if score >= 60 else "critically low"
        return (
            f"**Current Compliance Score: {score}%** ({level})\n\n"
            f"- {open_v} open violations across {total_records} monitored records\n"
            f"- {total_rules} active rules enforced from {total_policies} policies\n"
            f"- Severity breakdown: {critical} critical · {high} high · {medium} medium · {low} low\n\n"
            f"{'🔴 Immediate action required on critical violations.' if critical > 0 else '✅ No critical violations — keep it up.'}"
        )

    # Immediate attention / today / urgent
    if any(w in q for w in ["immediate", "today", "urgent", "attention", "priority", "now"]):
        lines = [f"**Top priorities right now ({open_v} open violations):**\n"]
        if critical > 0:
            lines.append(f"🔴 **{critical} CRITICAL** — Address these first. Assign owners within 24 hours.")
        if high > 0:
            lines.append(f"🟠 **{high} HIGH** — Schedule remediation within 7 days.")
        if medium > 0:
            lines.append(f"🟡 **{medium} MEDIUM** — Review and plan remediation this week.")
        if violations:
            lines.append("\n**Recent open violations:**")
            for v in violations[:3]:
                lines.append(f"- [{v.get('severity','?').upper()}] Record `{v.get('record_id','?')}` — {v.get('rule_condition','Unknown rule')}")
        return "\n".join(lines) if len(lines) > 1 else "✅ No open violations requiring immediate attention."

    # Violations
    if any(w in q for w in ["violation", "violations", "breach", "issue", "issues"]):
        return (
            f"**Violations Summary:**\n\n"
            f"- Total detected: **{total_v}**\n"
            f"- Open (unresolved): **{open_v}**\n"
            f"- Resolved: **{resolved}**\n\n"
            f"**Severity breakdown (open only):**\n"
            f"- 🔴 Critical: {critical}\n"
            f"- 🟠 High: {high}\n"
            f"- 🟡 Medium: {medium}\n"
            f"- 🟢 Low: {low}"
        )

    # Records / risk
    if any(w in q for w in ["record", "records", "asset", "assets", "at risk", "risk"]):
        return (
            f"**Monitored Records: {total_records}**\n\n"
            f"- {open_v} records currently have at least one open violation\n"
            f"- {critical} are in critical non-compliance\n\n"
            f"Records with critical violations carry the highest risk of regulatory penalties. "
            f"Review the Violations page for a full breakdown by record."
        )

    # Scan results
    if any(w in q for w in ["scan", "latest scan", "last scan", "recent scan"]):
        return (
            f"**Latest Scan Results:**\n\n"
            f"- {total_rules} rules evaluated across {total_records} records\n"
            f"- {total_v} violations detected in total\n"
            f"- {open_v} remain open · {resolved} resolved\n\n"
            f"Go to the **Reports** page for a full audit trail."
        )

    # Top risks
    if any(w in q for w in ["top risk", "top 3", "biggest risk", "main risk", "key risk"]):
        lines = ["**Top 3 Compliance Risks:**\n"]
        if critical > 0:
            lines.append(f"1. 🔴 **{critical} Critical Violations** — Highest regulatory and reputational exposure.")
        if high > 0:
            lines.append(f"{'2' if critical > 0 else '1'}. 🟠 **{high} High-Severity Gaps** — Control failures that could escalate.")
        lines.append(f"{'3' if critical > 0 and high > 0 else '2'}. 📋 **Policy Coverage** — {total_policies} policies with {total_rules} rules; ensure all record types are covered.")
        return "\n".join(lines)

    # Improve / how to / action plan
    if any(w in q for w in ["improve", "increase", "better", "how to", "action plan", "90%", "reach"]):
        return (
            f"**Action Plan to Improve Compliance (current: {score}%):**\n\n"
            f"1. Resolve all **{critical} critical** violations immediately — each removal has highest score impact.\n"
            f"2. Address **{high} high-severity** issues within 7 days.\n"
            f"3. Upload additional policy documents to expand rule coverage.\n"
            f"4. Run a full compliance scan after each remediation batch.\n"
            f"5. Review medium/low violations ({medium + low} total) to prevent accumulation.\n\n"
            f"Resolving the {critical} critical violations alone could significantly boost your score."
        )

    # Training
    if any(w in q for w in ["training", "security training", "employee training"]):
        training_violations = [v for v in violations if "training" in str(v.get("rule_condition", "")).lower()]
        if training_violations:
            return f"**Security Training Violations: {len(training_violations)} found**\n\nEmployees with outstanding training requirements are flagged in the Violations page. Filter by category 'training' for the full list."
        return "No training violations detected in the current open violations. All employees appear up to date with security training requirements."

    # Encryption
    if any(w in q for w in ["encryption", "encrypt", "ssl", "tls", "certificate"]):
        enc_violations = [v for v in violations if any(k in str(v.get("rule_condition", "")).lower() for k in ["encrypt", "ssl", "tls"])]
        count = len(enc_violations)
        return (
            f"**Encryption Violations: {count} detected**\n\n"
            + (f"There are {count} encryption-related open violations. Check the Violations page filtered by category 'encryption' for details." if count > 0
               else "No encryption violations currently open — all systems appear to have encryption controls in place.")
        )

    # Vendor
    if any(w in q for w in ["vendor", "third party", "third-party", "supplier"]):
        vendor_violations = [v for v in violations if "vendor" in str(v.get("rule_condition", "")).lower()]
        count = len(vendor_violations)
        return (
            f"**Vendor Compliance: {count} open violation{'s' if count != 1 else ''}**\n\n"
            + (f"{count} vendor-related violations are open. Ensure all vendors have signed Data Processing Agreements (DPAs) as required by GDPR Art. 28."
               if count > 0 else "No vendor-related violations currently open.")
        )

    # Data protection / GDPR
    if any(w in q for w in ["data protection", "gdpr", "personal data", "privacy"]):
        return (
            f"**Data Protection Status:**\n\n"
            f"- {total_rules} compliance rules active (covering GDPR, SOC2, ISO 27001)\n"
            f"- {open_v} open violations, {critical} of which are critical\n\n"
            f"Key areas to check: encryption at rest, data retention periods, vendor DPAs, and access controls. "
            f"See the Violations page for specific data protection issues."
        )

    # Default
    return (
        f"**Live Compliance Summary:**\n\n"
        f"- Compliance Score: **{score}%**\n"
        f"- Open Violations: **{open_v}** ({critical} critical · {high} high · {medium} medium · {low} low)\n"
        f"- Total Violations: {total_v} ({resolved} resolved)\n"
        f"- Monitored: {total_records} records · {total_rules} rules · {total_policies} policies\n\n"
        f"Ask me about your compliance score, violations, risks, action plans, encryption, training, or vendor compliance."
    )


async def chat_with_compliance_ai(question: str, context_data: dict) -> dict:
    context_str = json.dumps(context_data, indent=2, default=str)
    prompt = CHAT_SYSTEM_PROMPT.format(context=context_str, question=question)
    try:
        answer = call_ai(prompt, temperature=0.5)
        return {"answer": answer.strip(), "question": question, "status": "success"}
    except Exception as e:
        err = str(e)
        if "429" in err or "RESOURCE_EXHAUSTED" in err or "quota" in err.lower():
            print(f"[INFO] Gemini quota hit on chat — using static fallback")
            answer = _static_chat_answer(question, context_data)
            return {"answer": answer, "question": question, "status": "success"}
        return {
            "answer": f"Unable to process your question. Please ensure GEMINI_API_KEY is configured. Error: {e}",
            "question": question,
            "status": "error",
        }


#  Agentic Overview 

def _static_compliance_overview(context_data: dict) -> dict:
    """Data-driven fallback overview — uses real live numbers, no AI needed."""
    score = context_data.get("compliance_score", 0)
    critical = context_data.get("severity_breakdown", {}).get("critical", 0)
    high = context_data.get("severity_breakdown", {}).get("high", 0)
    medium = context_data.get("severity_breakdown", {}).get("medium", 0)
    low = context_data.get("severity_breakdown", {}).get("low", 0)
    open_v = context_data.get("open_violations", 0)
    total_v = context_data.get("total_violations", 0)
    resolved = context_data.get("resolved_violations", 0)
    total_rules = context_data.get("total_rules", 0)
    total_records = context_data.get("total_records", 0)
    total_policies = context_data.get("total_policies", 0)

    # Headline
    if score >= 85:
        headline = f"Compliance posture is strong at {score}% — {open_v} open violation{'s' if open_v != 1 else ''} require attention."
    elif score >= 60:
        headline = f"Compliance at {score}% with {critical} critical and {high} high-severity violations demanding immediate remediation."
    else:
        headline = f"Compliance is critically low at {score}% — {critical} critical violations represent significant organizational risk."

    # Score analysis
    if score >= 85:
        score_analysis = (
            f"Your organization achieves a {score}% compliance score across {total_records} monitored records and {total_rules} active rules. "
            f"Of {total_v} total violations detected, {resolved} have been resolved — demonstrating effective remediation. "
            f"Continued vigilance on the remaining {open_v} open issues will maintain this strong posture."
        )
    elif score >= 60:
        score_analysis = (
            f"The {score}% compliance score reflects {open_v} unresolved violations across {total_records} monitored records. "
            f"With {critical} critical and {high} high severity issues outstanding, targeted remediation efforts are needed. "
            f"Resolving the critical items alone could meaningfully improve the score."
        )
    else:
        score_analysis = (
            f"A {score}% score signals substantial exposure — {open_v} open violations span {total_records} records under {total_rules} rules. "
            f"The {critical} critical violations carry the highest regulatory and reputational risk and must be addressed immediately. "
            f"A structured remediation sprint is strongly recommended."
        )

    # Top risks based on actual severity breakdown
    top_risks = []
    if critical > 0:
        top_risks.append({
            "title": f"{critical} Critical Violation{'s' if critical != 1 else ''}",
            "description": f"Critical violations represent the highest risk tier. Each unresolved critical issue could lead to regulatory penalties or data breaches."
        })
    if high > 0:
        top_risks.append({
            "title": f"{high} High-Severity Issue{'s' if high != 1 else ''}",
            "description": f"High-severity violations indicate significant control gaps. These should be remediated within 7 days to prevent escalation."
        })
    if medium + low > 0:
        top_risks.append({
            "title": f"{medium + low} Medium/Low Issues Accumulating",
            "description": f"{medium} medium and {low} low severity issues may seem minor individually but represent systemic policy gaps if left unaddressed."
        })
    if not top_risks:
        top_risks = [{"title": "No Active Violations", "description": "All monitored records are currently compliant with active policy rules."}]
    while len(top_risks) < 3:
        top_risks.append({"title": "Maintain Current Controls", "description": "Continue periodic rule scans and policy reviews to sustain compliance levels."})

    # Immediate actions
    immediate_actions = []
    if critical > 0:
        immediate_actions.append(f"Investigate and remediate all {critical} critical violation{'s' if critical != 1 else ''} — assign owners and set 24-hour SLA.")
    if high > 0:
        immediate_actions.append(f"Schedule remediation for {high} high-severity issue{'s' if high != 1 else ''} within the next 7 days.")
    if total_policies == 0:
        immediate_actions.append("Upload at least one compliance policy document to activate AI-powered rule extraction.")
    elif total_rules < 5:
        immediate_actions.append("Add more policy documents to expand rule coverage across all record types.")
    if medium > 0:
        immediate_actions.append(f"Review {medium} medium-severity violation{'s' if medium != 1 else ''} and assign remediation owners.")
    immediate_actions.append("Schedule a full compliance scan to refresh violation data against all active rules.")
    immediate_actions = immediate_actions[:3]

    # Trend insight
    if resolved > 0 and open_v < total_v:
        trend_insight = f"Positive trajectory: {resolved} of {total_v} violations have been resolved, indicating active remediation effort is underway."
    elif open_v == 0:
        trend_insight = "Excellent: zero open violations — the organization is fully compliant with all active rules at this time."
    else:
        trend_insight = f"All {open_v} detected violations remain open — establish a remediation workflow to begin reducing compliance debt."

    # Positive highlights
    positive_highlights = []
    if resolved > 0:
        positive_highlights.append(f"{resolved} violation{'s' if resolved != 1 else ''} resolved — remediation process is functioning.")
    if total_policies > 0:
        positive_highlights.append(f"{total_policies} compliance {'policies are' if total_policies != 1 else 'policy is'} active, providing {total_rules} enforceable rules.")
    if total_records > 0:
        positive_highlights.append(f"Continuous monitoring is active across {total_records} company records.")
    if score >= 80:
        positive_highlights.append(f"Compliance score of {score}% exceeds the industry benchmark of 75%.")
    while len(positive_highlights) < 2:
        positive_highlights.append("PolicyPulse is actively monitoring your environment for new violations.")
    positive_highlights = positive_highlights[:2]

    return {
        "status": "success",
        "headline": headline,
        "compliance_score_analysis": score_analysis,
        "top_risks": top_risks[:3],
        "immediate_actions": immediate_actions,
        "trend_insight": trend_insight,
        "positive_highlights": positive_highlights,
    }


async def generate_compliance_overview(context_data: dict) -> dict:
    context_str = json.dumps(context_data, indent=2, default=str)
    prompt = OVERVIEW_PROMPT.format(context=context_str)
    try:
        response = await call_ai_async(prompt, temperature=0.4)
        cleaned = clean_json_response(response)
        overview = json.loads(cleaned)
        overview["status"] = "success"
        return overview
    except Exception as e:
        err = str(e)
        # On quota exhaustion, fall back to smart static analysis using real data
        if "429" in err or "RESOURCE_EXHAUSTED" in err or "quota" in err.lower():
            print(f"[INFO] Gemini quota hit — using data-driven static overview")
            return _static_compliance_overview(context_data)
        print(f"[WARN] Overview generation failed: {e}")
        return _static_compliance_overview(context_data)


#  PDF Document Analysis 

def analyze_pdf_with_ai(extracted_text: str) -> dict:
    sample = extracted_text[:6000]
    prompt = PDF_ANALYSIS_PROMPT.format(text=sample)
    try:
        response = call_ai(prompt, temperature=0.3)
        cleaned = clean_json_response(response)
        result = json.loads(cleaned)
        result["status"] = "success"
        return result
    except Exception as e:
        return {
            "status": "error", "document_type": "Unknown", "summary": "Analysis unavailable",
            "key_requirements": [], "risk_areas": [], "compliance_frameworks": [], "estimated_rule_count": 0,
        }

