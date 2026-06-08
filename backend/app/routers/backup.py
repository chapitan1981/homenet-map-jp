from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime
import json
import zipfile
import tempfile
import shutil
from ..database import get_db
from .. import models

router = APIRouter(prefix="/backup", tags=["backup"])

DATA_DIR = Path("/app/app/data")
UPLOADS_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "homenet.db"
RESTORE_DIR = DATA_DIR / "restore_staging"

def dump_model(db: Session, model):
    rows = db.query(model).all()
    result = []
    for row in rows:
        item = {}
        for col in row.__table__.columns:
            value = getattr(row, col.name)
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            item[col.name] = value
        result.append(item)
    return result

def optional_dump(db: Session, table_name: str, model_name: str, tables: dict):
    model = getattr(models, model_name, None)
    if model is not None:
        tables[table_name] = dump_model(db, model)

def build_backup_json(db: Session):
    tables = {
        "rooms": dump_model(db, models.Room),
        "devices": dump_model(db, models.Device),
        "locations": dump_model(db, models.Location),
        "interfaces": dump_model(db, models.NetworkInterface),
        "parts": dump_model(db, models.DevicePart),
        "diagrams": dump_model(db, models.Diagram),
        "tags": dump_model(db, models.DeviceTag),
    }

    for table_name, model_name in [
        ("room_photos", "RoomPhoto"),
        ("device_photos", "DevicePhoto"),
        ("racks", "Rack"),
        ("rack_items", "RackItem"),
        ("device_custom_fields", "DeviceCustomField"),
        ("device_connections", "DeviceConnection"),
        ("room_device_placements", "RoomDevicePlacement"),
        ("device_urls", "DeviceUrl"),
        ("device_monitors", "DeviceMonitor"),
    ]:
        optional_dump(db, table_name, model_name, tables)

    return {
        "app": "HomeNet Map JP",
        "version": "0.6.7",
        "created_at": datetime.now().isoformat(),
        "tables": tables,
    }

@router.get("/export")
def export_json(db: Session = Depends(get_db)):
    return JSONResponse(build_backup_json(db))

@router.get("/summary")
def backup_summary(db: Session = Depends(get_db)):
    tables = build_backup_json(db)["tables"]
    uploads_count = 0
    uploads_size = 0
    if UPLOADS_DIR.exists():
        for p in UPLOADS_DIR.rglob("*"):
            if p.is_file():
                uploads_count += 1
                uploads_size += p.stat().st_size

    return {
        "version": "0.6.7",
        "table_counts": {k: len(v) for k, v in tables.items()},
        "uploads_count": uploads_count,
        "uploads_size_bytes": uploads_size,
        "zip_export": "/api/backup/export-zip",
        "json_export": "/api/backup/export",
    }

@router.get("/export-zip")
def export_zip(db: Session = Depends(get_db)):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    tmpdir = Path(tempfile.mkdtemp(prefix="homenet_backup_"))
    zip_path = tmpdir / f"homenet-map-jp-backup-{timestamp}.zip"

    backup_json_path = tmpdir / "backup.json"
    backup_json_path.write_text(json.dumps(build_backup_json(db), ensure_ascii=False, indent=2), encoding="utf-8")

    readme_path = tmpdir / "README_restore.txt"
    readme_path.write_text(
        "HomeNet Map JP Backup ZIP\n"
        f"Created: {timestamp}\n\n"
        "Contents:\n"
        "- backup.json: database export\n"
        "- uploads/: uploaded photos\n"
        "- homenet.db: SQLite database copy if available\n\n"
        "Restore: Ver0.5.1 supports safe ZIP inspection and DB/uploads restore.\n",
        encoding="utf-8"
    )

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(backup_json_path, "backup.json")
        z.write(readme_path, "README_restore.txt")
        if DB_PATH.exists():
            z.write(DB_PATH, "homenet.db")
        if UPLOADS_DIR.exists():
            for p in UPLOADS_DIR.rglob("*"):
                if p.is_file():
                    z.write(p, f"uploads/{p.relative_to(UPLOADS_DIR)}")

    return FileResponse(zip_path, media_type="application/zip", filename=zip_path.name)

@router.post("/inspect-zip")
async def inspect_zip(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="ZIPファイルを選択してください")

    tmpdir = Path(tempfile.mkdtemp(prefix="homenet_inspect_"))
    zip_path = tmpdir / file.filename
    zip_path.write_bytes(await file.read())

    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            names = z.namelist()
            has_backup_json = "backup.json" in names
            has_db = "homenet.db" in names
            uploads = [n for n in names if n.startswith("uploads/") and not n.endswith("/")]
            table_counts = {}
            version = ""
            created_at = ""

            if has_backup_json:
                data = json.loads(z.read("backup.json").decode("utf-8"))
                version = data.get("version", "")
                created_at = data.get("created_at", "")
                table_counts = {k: len(v) for k, v in data.get("tables", {}).items()}

            return {
                "filename": file.filename,
                "has_backup_json": has_backup_json,
                "has_db": has_db,
                "uploads_count": len(uploads),
                "version": version,
                "created_at": created_at,
                "table_counts": table_counts,
                "can_restore": has_db or has_backup_json,
                "note": "DBが含まれる場合はDBコピー復元、uploadsが含まれる場合は写真復元できます。"
            }
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="ZIPファイルとして読み込めません")

@router.post("/restore-zip")
async def restore_zip(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="ZIPファイルを選択してください")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RESTORE_DIR.mkdir(parents=True, exist_ok=True)

    tmpdir = Path(tempfile.mkdtemp(prefix="homenet_restore_"))
    zip_path = tmpdir / file.filename
    zip_path.write_bytes(await file.read())

    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            names = z.namelist()
            if "homenet.db" not in names and "backup.json" not in names:
                raise HTTPException(status_code=400, detail="復元可能な homenet.db または backup.json が含まれていません")

            # Current data safety backup
            safety_dir = RESTORE_DIR / f"before_restore_{timestamp}"
            safety_dir.mkdir(parents=True, exist_ok=True)
            if DB_PATH.exists():
                shutil.copy2(DB_PATH, safety_dir / "homenet.db.before_restore")
            if UPLOADS_DIR.exists():
                shutil.copytree(UPLOADS_DIR, safety_dir / "uploads_before_restore", dirs_exist_ok=True)

            restored_db = False
            restored_uploads = 0

            if "homenet.db" in names:
                extracted_db = tmpdir / "homenet.db"
                extracted_db.write_bytes(z.read("homenet.db"))
                shutil.copy2(extracted_db, DB_PATH)
                restored_db = True

            upload_names = [n for n in names if n.startswith("uploads/") and not n.endswith("/")]
            if upload_names:
                UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
                for name in upload_names:
                    dest = UPLOADS_DIR / Path(name).relative_to("uploads")
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(z.read(name))
                    restored_uploads += 1

            return {
                "success": True,
                "restored_db": restored_db,
                "restored_uploads": restored_uploads,
                "safety_backup": str(safety_dir),
                "message": "復元しました。反映には docker compose restart backend frontend を実行してください。復元前データは safety_backup に退避済みです。"
            }
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="ZIPファイルとして読み込めません")
