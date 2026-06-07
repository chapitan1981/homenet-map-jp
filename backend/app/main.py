from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import Base, engine
from .routers import rooms, devices, locations, interfaces, parts, diagrams, backup, tags, photos, racks, custom_fields, connections, placements, urls, monitors

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HomeNet Map JP API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="/app/app/data/uploads"), name="uploads")

@app.get("/api/health")
def health():
    return {"success": True, "message": "HomeNet Map JP API is running"}

app.include_router(rooms.router, prefix="/api")
app.include_router(devices.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(interfaces.router, prefix="/api")
app.include_router(parts.router, prefix="/api")
app.include_router(diagrams.router, prefix="/api")
app.include_router(backup.router, prefix="/api")

app.include_router(tags.router, prefix="/api")

app.include_router(photos.router, prefix="/api")
app.include_router(racks.router, prefix="/api")


@app.get("/api/version")
def version():
    return {
        "name": "HomeNet Map JP",
        "version": "0.6.2",
        "build": "manual-v0.6.2-hotfix"
    }

app.include_router(custom_fields.router, prefix="/api")

app.include_router(connections.router, prefix="/api")

app.include_router(placements.router, prefix="/api")

app.include_router(urls.router, prefix="/api")

app.include_router(monitors.router, prefix="/api")
