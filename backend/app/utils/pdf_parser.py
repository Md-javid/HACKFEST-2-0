"""
PolicyPulse AI – PDF Text Extraction Utility
"""
from typing import Tuple
import PyPDF2
import io


def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, int]:
    """
    Extract text from a PDF file.
    Returns (extracted_text, page_count).
    """
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    page_count = len(reader.pages)
    text_parts = []
    for i, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        text_parts.append(f"--- Page {i + 1} ---\n{page_text}\n\n")
    full_text = "".join(text_parts)
    return full_text, page_count


def chunk_text(text: str, max_chars: int = 4000) -> list:
    """Split text into chunks that fit within token limits."""
    chunks = []
    paragraphs = text.split("\n\n")
    current_chunk = ""
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(current_chunk) + len(para) + 2 <= max_chars:
            current_chunk += para + "\n\n"
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para + "\n\n"
    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks
