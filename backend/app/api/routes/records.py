"""
PolicyPulse AI - Company Records Management Routes
Upload records via Excel/CSV, JSON, manual entry, or database connector.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import uuid, io, json, csv

router = APIRouter(prefix="/records", tags=["Records"])

# ──────────── Helpers ────────────

def _parse_csv_bytes(raw: bytes) -> List[Dict[str, Any]]:
    """Parse CSV bytes into a list of flat dicts."""
    text = raw.decode("utf-8-sig")  # handles BOM
    reader = csv.DictReader(io.StringIO(text))
    rows: List[Dict[str, Any]] = []
    for row in reader:
        cleaned = {}
        for k, v in row.items():
            if k is None:
                continue
            k = k.strip()
            # Auto-cast booleans and numbers
            vl = v.strip().lower() if isinstance(v, str) else v
            if vl in ("true", "yes", "1"):
                cleaned[k] = True
            elif vl in ("false", "no", "0"):
                cleaned[k] = False
            else:
                try:
                    cleaned[k] = int(v)
                except (ValueError, TypeError):
                    try:
                        cleaned[k] = float(v)
                    except (ValueError, TypeError):
                        cleaned[k] = v.strip() if isinstance(v, str) else v
        rows.append(cleaned)
    return rows


def _parse_excel_bytes(raw: bytes) -> List[Dict[str, Any]]:
    """Parse .xlsx bytes using openpyxl."""
    try:
        import openpyxl
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="openpyxl is not installed. Run: pip install openpyxl",
        )

    wb = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    ws = wb.active
    if ws is None:
        raise HTTPException(status_code=422, detail="Excel workbook has no active sheet")

    rows_iter = ws.iter_rows(values_only=True)
    try:
        headers = [str(h).strip() if h is not None else f"col_{i}" for i, h in enumerate(next(rows_iter))]
    except StopIteration:
        raise HTTPException(status_code=422, detail="Excel sheet is empty")

    results: List[Dict[str, Any]] = []
    for row in rows_iter:
        record = {}
        for h, val in zip(headers, row):
            if val is None:
                continue
            if isinstance(val, bool):
                record[h] = val
            elif isinstance(val, (int, float)):
                record[h] = val
            else:
                sv = str(val).strip()
                sl = sv.lower()
                if sl in ("true", "yes"):
                    record[h] = True
                elif sl in ("false", "no"):
                    record[h] = False
                else:
                    record[h] = sv
        if record:
            results.append(record)
    wb.close()
    return results


def _rows_to_records(
    rows: List[Dict[str, Any]],
    record_type: str,
    department: str,
    source: str,
) -> List[Dict[str, Any]]:
    """Convert flat dicts to the company_records document schema."""
    docs = []
    for i, row in enumerate(rows):
        # Try to find a natural ID field
        rid = (
            row.pop("record_id", None)
            or row.pop("id", None)
            or row.pop("ID", None)
            or f"REC-{uuid.uuid4().hex[:8].upper()}"
        )
        dept = row.pop("department", None) or department
        rtype = row.pop("type", None) or record_type

        docs.append({
            "record_id": str(rid),
            "type": rtype,
            "department": dept,
            "source": source,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "data": row,
        })
    return docs


# ──────────── Request Models ────────────

class ManualRecordRequest(BaseModel):
    record_id: Optional[str] = None
    type: str = Field(min_length=1, description="e.g. employee, server, vendor, data_store")
    department: str = Field(min_length=1)
    data: Dict[str, Any] = Field(description="Key-value pairs for the record")


class BulkJsonRequest(BaseModel):
    records: List[ManualRecordRequest]


class DatabaseConnectorRequest(BaseModel):
    connection_string: str = Field(description="MongoDB URI, PostgreSQL DSN, etc.")
    database_name: str
    collection_or_table: str
    record_type: str = "external"
    department: str = "External"
    limit: int = Field(default=500, ge=1, le=10000)


# ──────────── Upload Excel / CSV ────────────

async def _handle_file_upload(file: UploadFile, record_type: str, department: str):
    """Shared logic for Excel/CSV upload."""
    from app.core.database import get_database

    fname = (file.filename or "").lower()
    raw = await file.read()

    if fname.endswith(".xlsx") or fname.endswith(".xls"):
        rows = _parse_excel_bytes(raw)
    elif fname.endswith(".csv"):
        rows = _parse_csv_bytes(raw)
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Upload .xlsx or .csv",
        )

    if not rows:
        raise HTTPException(status_code=422, detail="File contains no data rows")

    docs = _rows_to_records(rows, record_type, department, source=f"file:{file.filename}")

    db = get_database()
    result = await db.company_records.insert_many(docs)

    preview = docs[:3]
    for p in preview:
        p.pop("_id", None)

    return {
        "message": f"Successfully imported {len(result.inserted_ids)} records from {file.filename}",
        "records_imported": len(result.inserted_ids),
        "source": f"file:{file.filename}",
        "columns_detected": list(rows[0].keys()) if rows else [],
        "preview": preview,
    }


@router.post("/upload-file")
async def upload_records_file(
    file: UploadFile = File(...),
    record_type: str = Query("employee", description="Record type"),
    department: str = Query("General", description="Department name"),
):
    """Upload an Excel (.xlsx) or CSV file of company records."""
    return await _handle_file_upload(file, record_type, department)


@router.post("/upload")
async def upload_records_file_alias(
    file: UploadFile = File(...),
    record_type: str = Query("employee", description="Record type"),
    department: str = Query("General", description="Department name"),
):
    """Alias for /upload-file — accepts Excel (.xlsx) or CSV."""
    return await _handle_file_upload(file, record_type, department)


# ──────────── Manual / Single Record ────────────

@router.post("/manual")
async def add_manual_record(req: ManualRecordRequest):
    """Add a single record manually via form."""
    from app.core.database import get_database

    db = get_database()
    rid = req.record_id or f"REC-{uuid.uuid4().hex[:8].upper()}"

    doc = {
        "record_id": rid,
        "type": req.type,
        "department": req.department,
        "source": "manual",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "data": req.data,
    }

    await db.company_records.insert_one(doc)
    doc.pop("_id", None)
    return {"message": f"Record {rid} added successfully", "record": doc}


# ──────────── Bulk JSON Import ────────────

@router.post("/bulk-json")
async def import_bulk_json(body: BulkJsonRequest):
    """Import multiple records from a JSON array."""
    from app.core.database import get_database

    if not body.records:
        raise HTTPException(status_code=400, detail="Records array is empty")

    db = get_database()
    docs = []
    for r in body.records:
        rid = r.record_id or f"REC-{uuid.uuid4().hex[:8].upper()}"
        docs.append({
            "record_id": rid,
            "type": r.type,
            "department": r.department,
            "source": "json-import",
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "data": r.data,
        })

    result = await db.company_records.insert_many(docs)
    return {
        "message": f"Imported {len(result.inserted_ids)} records",
        "records_imported": len(result.inserted_ids),
    }


# ──────────── JSON File Upload ────────────

@router.post("/upload-json")
async def upload_json_file(
    file: UploadFile = File(...),
    record_type: str = Query("employee", description="Default record type"),
    department: str = Query("General", description="Default department"),
):
    """Upload a .json file containing an array of record objects."""
    from app.core.database import get_database

    raw = await file.read()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"Invalid JSON: {e}")

    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        raise HTTPException(status_code=422, detail="JSON must be an array of objects")

    docs = _rows_to_records(data, record_type, department, source=f"json-file:{file.filename}")
    db = get_database()
    result = await db.company_records.insert_many(docs)

    return {
        "message": f"Imported {len(result.inserted_ids)} records from {file.filename}",
        "records_imported": len(result.inserted_ids),
    }


# ──────────── Database Connector ────────────

@router.post("/connect-database")
async def connect_external_database(req: DatabaseConnectorRequest):
    """Pull records from an external MongoDB database."""
    from app.core.database import get_database
    from motor.motor_asyncio import AsyncIOMotorClient

    try:
        ext_client = AsyncIOMotorClient(req.connection_string, serverSelectionTimeoutMS=5000)
        ext_db = ext_client[req.database_name]
        ext_col = ext_db[req.collection_or_table]

        ext_docs = await ext_col.find().limit(req.limit).to_list(length=req.limit)
        ext_client.close()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect: {str(e)}")

    if not ext_docs:
        raise HTTPException(status_code=422, detail="No documents found in the external collection")

    rows = []
    for d in ext_docs:
        d.pop("_id", None)
        rows.append(d)

    docs = _rows_to_records(rows, req.record_type, req.department, source=f"db:{req.database_name}.{req.collection_or_table}")

    db = get_database()
    result = await db.company_records.insert_many(docs)

    return {
        "message": f"Imported {len(result.inserted_ids)} records from {req.database_name}.{req.collection_or_table}",
        "records_imported": len(result.inserted_ids),
    }


# ──────────── List / Delete ────────────

@router.get("/")
async def list_records(
    record_type: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=5000),
    skip: int = Query(0, ge=0),
):
    """List company records with filters."""
    from app.core.database import get_database

    db = get_database()
    query: Dict[str, Any] = {}
    if record_type:
        query["type"] = record_type
    if department:
        query["department"] = department
    if source:
        query["source"] = {"$regex": source, "$options": "i"}

    total = await db.company_records.count_documents(query)
    records = await db.company_records.find(query).sort(
        "uploaded_at", -1
    ).skip(skip).limit(limit).to_list(length=limit)

    for r in records:
        r["_id"] = str(r["_id"])

    # Stats
    type_pipeline = [{"$group": {"_id": "$type", "count": {"$sum": 1}}}]
    dept_pipeline = [{"$group": {"_id": "$department", "count": {"$sum": 1}}}]
    by_type = {d["_id"]: d["count"] async for d in db.company_records.aggregate(type_pipeline)}
    by_dept = {d["_id"]: d["count"] async for d in db.company_records.aggregate(dept_pipeline)}

    return {
        "records": records,
        "total": total,
        "skip": skip,
        "limit": limit,
        "by_type": by_type,
        "by_department": by_dept,
    }


@router.delete("/{record_id}")
async def delete_record(record_id: str):
    """Delete a single record."""
    from app.core.database import get_database

    db = get_database()
    result = await db.company_records.delete_one({"record_id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": f"Record {record_id} deleted"}


@router.delete("/")
async def delete_records_by_source(
    source: Optional[str] = Query(None, description="Delete records matching this source"),
):
    """Delete records by source filter, or all if no filter."""
    from app.core.database import get_database

    db = get_database()
    query: Dict[str, Any] = {}
    if source:
        query["source"] = {"$regex": source, "$options": "i"}

    result = await db.company_records.delete_many(query)
    return {"message": f"Deleted {result.deleted_count} records"}
