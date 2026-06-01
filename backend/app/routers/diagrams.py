from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/diagrams", tags=["diagrams"])

@router.get("", response_model=List[schemas.Diagram])
def list_diagrams(db: Session = Depends(get_db)):
    return db.query(models.Diagram).all()

@router.post("", response_model=schemas.Diagram)
def create_diagram(payload: schemas.DiagramCreate, db: Session = Depends(get_db)):
    item = models.Diagram(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("/{diagram_id}")
def get_diagram(diagram_id: int, db: Session = Depends(get_db)):
    diagram = db.query(models.Diagram).get(diagram_id)
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    nodes = db.query(models.DiagramNode).filter(models.DiagramNode.diagram_id == diagram_id).all()
    edges = db.query(models.DiagramEdge).filter(models.DiagramEdge.diagram_id == diagram_id).all()
    return {"diagram": diagram, "nodes": nodes, "edges": edges}

@router.put("/{diagram_id}", response_model=schemas.Diagram)
def update_diagram(diagram_id: int, payload: schemas.DiagramCreate, db: Session = Depends(get_db)):
    item = db.query(models.Diagram).get(diagram_id)
    if not item:
        raise HTTPException(status_code=404, detail="Diagram not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{diagram_id}")
def delete_diagram(diagram_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Diagram).get(diagram_id)
    if not item:
        raise HTTPException(status_code=404, detail="Diagram not found")
    db.delete(item)
    db.commit()
    return {"success": True}

@router.post("/{diagram_id}/nodes", response_model=schemas.DiagramNode)
def create_node(diagram_id: int, payload: schemas.DiagramNodeCreate, db: Session = Depends(get_db)):
    item = models.DiagramNode(diagram_id=diagram_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/nodes/{node_id}", response_model=schemas.DiagramNode)
def update_node(node_id: int, payload: schemas.DiagramNodeCreate, db: Session = Depends(get_db)):
    item = db.query(models.DiagramNode).get(node_id)
    if not item:
        raise HTTPException(status_code=404, detail="Node not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/nodes/{node_id}")
def delete_node(node_id: int, db: Session = Depends(get_db)):
    item = db.query(models.DiagramNode).get(node_id)
    if not item:
        raise HTTPException(status_code=404, detail="Node not found")
    db.delete(item)
    db.commit()
    return {"success": True}

@router.post("/{diagram_id}/edges", response_model=schemas.DiagramEdge)
def create_edge(diagram_id: int, payload: schemas.DiagramEdgeCreate, db: Session = Depends(get_db)):
    item = models.DiagramEdge(diagram_id=diagram_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
