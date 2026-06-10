import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app/data/homenet.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Ver1.6.0 lightweight migration helper
def ensure_device_room_column():
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            rows = conn.execute(text("PRAGMA table_info(devices)")).fetchall()
            cols = [r[1] for r in rows]
            if "room_id" not in cols:
                conn.execute(text("ALTER TABLE devices ADD COLUMN room_id INTEGER"))
    except Exception:
        pass

ensure_device_room_column()


# Ver1.6.1 migration: ensure device room/location columns exist.
def ensure_device_room_location_columns_v161():
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            rows = conn.execute(text("PRAGMA table_info(devices)")).fetchall()
            cols = [r[1] for r in rows]
            if "room_id" not in cols:
                conn.execute(text("ALTER TABLE devices ADD COLUMN room_id INTEGER"))
            if "location_id" not in cols:
                conn.execute(text("ALTER TABLE devices ADD COLUMN location_id INTEGER"))
    except Exception:
        pass

ensure_device_room_location_columns_v161()


# Ver1.6.2 migration: ensure device room/location columns exist.
def ensure_device_room_location_columns_v162():
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            rows = conn.execute(text("PRAGMA table_info(devices)")).fetchall()
            cols = [r[1] for r in rows]
            if "room_id" not in cols:
                conn.execute(text("ALTER TABLE devices ADD COLUMN room_id INTEGER"))
            if "location_id" not in cols:
                conn.execute(text("ALTER TABLE devices ADD COLUMN location_id INTEGER"))
    except Exception:
        pass

ensure_device_room_location_columns_v162()
