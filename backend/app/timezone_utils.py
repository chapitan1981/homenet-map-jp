from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any

JST = timezone(timedelta(hours=9))


def now_jst() -> datetime:
    return datetime.now(JST)


def to_jst_datetime(value: Any) -> datetime | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        raw = value.strip()
        if not raw or raw == "-":
            return None
        try:
            if raw.endswith("Z"):
                dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            elif len(raw) >= 6 and (raw[-6] in ["+", "-"]) and raw[-3] == ":":
                dt = datetime.fromisoformat(raw)
            else:
                # DB/API legacy value is UTC without timezone.
                dt = datetime.fromisoformat(raw.replace(" ", "T")).replace(tzinfo=timezone.utc)
        except Exception:
            return None
    else:
        return None

    if dt.tzinfo is None:
        # Treat legacy naive datetime as UTC.
        dt = dt.replace(tzinfo=timezone.utc)

    return dt.astimezone(JST)


def to_jst_iso(value: Any) -> str | None:
    dt = to_jst_datetime(value)
    if dt is None:
        return None
    return dt.isoformat(timespec="seconds")


def normalize_datetime_fields(obj: Any) -> Any:
    """
    Recursively normalize common timestamp fields to JST ISO strings.
    Useful for API responses that contain dict/list/pydantic-like objects.
    """
    keys = {
        "created_at", "updated_at", "last_checked", "last_check", "checked_at",
        "last_checked_at", "last_result_at", "result_at", "timestamp",
        "createdAt", "updatedAt", "lastChecked", "lastCheckedAt", "lastResultAt", "resultAt",
    }

    if isinstance(obj, list):
        return [normalize_datetime_fields(x) for x in obj]

    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in keys:
                out[k] = to_jst_iso(v) or v
            else:
                out[k] = normalize_datetime_fields(v)
        return out

    # SQLAlchemy / Pydantic object fallback: do not mutate unknown objects here.
    return obj
