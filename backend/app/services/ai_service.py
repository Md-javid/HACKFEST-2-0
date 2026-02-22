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
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(
        "gemini-1.5-flash",
        generation_config=genai.types.GenerationConfig(temperature=temperature),
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

async def chat_with_compliance_ai(question: str, context_data: dict) -> dict:
    context_str = json.dumps(context_data, indent=2, default=str)
    prompt = CHAT_SYSTEM_PROMPT.format(context=context_str, question=question)
    try:
        answer = call_ai(prompt, temperature=0.5)
        return {"answer": answer.strip(), "question": question, "status": "success"}
    except Exception as e:
        return {
            "answer": f"Unable to process your question. Please ensure GEMINI_API_KEY is configured. Error: {e}",
            "question": question,
            "status": "error",
        }


#  Agentic Overview 

async def generate_compliance_overview(context_data: dict) -> dict:
    context_str = json.dumps(context_data, indent=2, default=str)
    prompt = OVERVIEW_PROMPT.format(context=context_str)
    try:
        response = call_ai(prompt, temperature=0.4)
        cleaned = clean_json_response(response)
        overview = json.loads(cleaned)
        overview["status"] = "success"
        return overview
    except Exception as e:
        print(f"[WARN] Overview generation failed: {e}")
        return {
            "status": "error",
            "headline": "AI overview unavailable — check GEMINI_API_KEY in .env",
            "compliance_score_analysis": "",
            "top_risks": [],
            "immediate_actions": [],
            "trend_insight": "",
            "positive_highlights": [],
        }


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

