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
