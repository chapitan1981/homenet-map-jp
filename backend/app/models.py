from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    floor = Column(String, default="")
    description = Column(Text, default="")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    device_type = Column(String, default="device")
    vendor = Column(String, default="")
    model = Column(String, default="")
    os_name = Column(String, default="")
    description = Column(Text, default="")
    icon = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class DeviceLocation(Base):
    __tablename__ = "device_locations"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    x_position = Column(Integer, default=0)
    y_position = Column(Integer, default=0)
    rack_id = Column(String, default="")
    note = Column(Text, default="")

class NetworkInterface(Base):
    __tablename__ = "network_interfaces"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    interface_name = Column(String, default="")
    ip_address = Column(String, default="")
    mac_address = Column(String, default="")
    network_type = Column(String, default="LAN")
    is_primary = Column(Boolean, default=False)
    last_seen_at = Column(String, default="")

class DevicePart(Base):
    __tablename__ = "device_parts"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    part_type = Column(String, nullable=False)
    vendor = Column(String, default="")
    model = Column(String, default="")
    spec = Column(Text, default="")
    quantity = Column(Integer, default=1)
    note = Column(Text, default="")

class Diagram(Base):
    __tablename__ = "diagrams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    diagram_type = Column(String, default="physical")
    description = Column(Text, default="")

class DiagramNode(Base):
    __tablename__ = "diagram_nodes"
    id = Column(Integer, primary_key=True, index=True)
    diagram_id = Column(Integer, ForeignKey("diagrams.id"), nullable=False)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    node_type = Column(String, default="device")
    x_position = Column(Integer, default=0)
    y_position = Column(Integer, default=0)
    display_label = Column(String, default="")

class DiagramEdge(Base):
    __tablename__ = "diagram_edges"
    id = Column(Integer, primary_key=True, index=True)
    diagram_id = Column(Integer, ForeignKey("diagrams.id"), nullable=False)
    source_node_id = Column(Integer, ForeignKey("diagram_nodes.id"), nullable=False)
    target_node_id = Column(Integer, ForeignKey("diagram_nodes.id"), nullable=False)
    edge_type = Column(String, default="lan")
    label = Column(String, default="")


class DeviceTag(Base):
    __tablename__ = "device_tags"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    tag_name = Column(String, nullable=False)


class DevicePhoto(Base):
    __tablename__ = "device_photos"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    photo_type = Column(String, default="front")
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    note = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RoomPhoto(Base):
    __tablename__ = "room_photos"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    photo_type = Column(String, default="background")
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    note = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Rack(Base):
    __tablename__ = "racks"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    total_units = Column(Integer, default=12)
    description = Column(Text, default="")

class RackItem(Base):
    __tablename__ = "rack_items"
    id = Column(Integer, primary_key=True, index=True)
    rack_id = Column(Integer, ForeignKey("racks.id"), nullable=False)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    label = Column(String, default="")
    start_unit = Column(Integer, default=1)
    unit_size = Column(Integer, default=1)
    note = Column(Text, default="")


class DeviceCustomField(Base):
    __tablename__ = "device_custom_fields"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    field_name = Column(String, nullable=False)
    field_type = Column(String, default="text")
    field_value = Column(Text, default="")
    sort_order = Column(Integer, default=0)
    note = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DeviceConnection(Base):
    __tablename__ = "device_connections"
    id = Column(Integer, primary_key=True, index=True)
    source_device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    target_device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    connection_type = Column(String, default="LAN")
    source_port = Column(String, default="")
    target_port = Column(String, default="")
    speed = Column(String, default="")
    cable_type = Column(String, default="")
    label = Column(String, default="")
    note = Column(Text, default="")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RoomDevicePlacement(Base):
    __tablename__ = "room_device_placements"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    x_percent = Column(Integer, default=50)
    y_percent = Column(Integer, default=50)
    label = Column(String, default="")
    note = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DeviceUrl(Base):
    __tablename__ = "device_urls"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    name = Column(String, nullable=False)
    url = Column(Text, nullable=False)
    url_type = Column(String, default="WebUI")
    note = Column(Text, default="")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DeviceMonitor(Base):
    __tablename__ = "device_monitors"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    monitor_type = Column(String, default="ping")
    target = Column(String, nullable=False)
    name = Column(String, default="")
    enabled = Column(Boolean, default=True)
    status = Column(String, default="unknown")
    response_ms = Column(Integer, default=0)
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, default="")
    note = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
