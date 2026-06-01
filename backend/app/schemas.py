from pydantic import BaseModel
from typing import Optional, Any, List

class RoomBase(BaseModel):
    name: str
    floor: str = ""
    description: str = ""
    sort_order: int = 0

class RoomCreate(RoomBase): pass
class Room(RoomBase):
    id: int
    class Config:
        from_attributes = True

class DeviceBase(BaseModel):
    name: str
    device_type: str = "device"
    vendor: str = ""
    model: str = ""
    os_name: str = ""
    description: str = ""
    icon: str = ""

class DeviceCreate(DeviceBase): pass
class Device(DeviceBase):
    id: int
    class Config:
        from_attributes = True

class DeviceLocationBase(BaseModel):
    device_id: int
    room_id: int
    x_position: int = 0
    y_position: int = 0
    rack_id: str = ""
    note: str = ""

class DeviceLocationCreate(DeviceLocationBase): pass
class DeviceLocation(DeviceLocationBase):
    id: int
    class Config:
        from_attributes = True

class NetworkInterfaceBase(BaseModel):
    interface_name: str = ""
    ip_address: str = ""
    mac_address: str = ""
    network_type: str = "LAN"
    is_primary: bool = False
    last_seen_at: str = ""

class NetworkInterfaceCreate(NetworkInterfaceBase): pass
class NetworkInterface(NetworkInterfaceBase):
    id: int
    device_id: int
    class Config:
        from_attributes = True

class DevicePartBase(BaseModel):
    part_type: str
    vendor: str = ""
    model: str = ""
    spec: str = ""
    quantity: int = 1
    note: str = ""

class DevicePartCreate(DevicePartBase): pass
class DevicePart(DevicePartBase):
    id: int
    device_id: int
    class Config:
        from_attributes = True

class DiagramBase(BaseModel):
    name: str
    diagram_type: str = "physical"
    description: str = ""

class DiagramCreate(DiagramBase): pass
class Diagram(DiagramBase):
    id: int
    class Config:
        from_attributes = True

class DiagramNodeBase(BaseModel):
    device_id: Optional[int] = None
    node_type: str = "device"
    x_position: int = 0
    y_position: int = 0
    display_label: str = ""

class DiagramNodeCreate(DiagramNodeBase): pass
class DiagramNode(DiagramNodeBase):
    id: int
    diagram_id: int
    class Config:
        from_attributes = True

class DiagramEdgeBase(BaseModel):
    source_node_id: int
    target_node_id: int
    edge_type: str = "lan"
    label: str = ""

class DiagramEdgeCreate(DiagramEdgeBase): pass
class DiagramEdge(DiagramEdgeBase):
    id: int
    diagram_id: int
    class Config:
        from_attributes = True
