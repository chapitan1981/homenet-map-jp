from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models

router = APIRouter(prefix="/backup", tags=["backup"])

@router.get("/export")
def export_backup(db: Session = Depends(get_db)):
    def dump(model):
        rows = db.query(model).all()
        return [{c.name: getattr(r, c.name) for c in r.__table__.columns} for r in rows]

    return {
        "rooms": dump(models.Room),
        "devices": dump(models.Device),
        "device_locations": dump(models.DeviceLocation),
        "network_interfaces": dump(models.NetworkInterface),
        "device_parts": dump(models.DevicePart),
        "diagrams": dump(models.Diagram),
        "diagram_nodes": dump(models.DiagramNode),
        "diagram_edges": dump(models.DiagramEdge),
        "device_tags": dump(models.DeviceTag),
        "device_photos": dump(models.DevicePhoto),
        "room_photos": dump(models.RoomPhoto),
        "racks": dump(models.Rack),
        "rack_items": dump(models.RackItem),
        "device_custom_fields": dump(models.DeviceCustomField),
        "device_connections": dump(models.DeviceConnection),
        "room_device_placements": dump(models.RoomDevicePlacement),
    }

@router.post("/import")
def import_backup():
    return {"success": False, "message": "MVP Ver0.1では復元APIは未実装です。"}
