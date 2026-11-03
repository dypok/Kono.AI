from typing import List, Optional
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def width(self) -> float:
        return max(0.0, self.x1 - self.x0)

    @property
    def height(self) -> float:
        return max(0.0, self.y1 - self.y0)

    @property
    def center_y(self) -> float:
        return (self.y0 + self.y1) / 2.0

    @property
    def center_x(self) -> float:
        return (self.x0 + self.x1) / 2.0

class SpatialWord(BaseModel):
    text: str
    bbox: BoundingBox
    page: int = 1
    block_no: int = 0
    line_no: int = 0
    word_no: int = 0
    confidence: float = 1.0

class ExtractedField(BaseModel):
    raw_value: str
    parsed_value: Optional[str] = None
    bbox: Optional[BoundingBox] = None
    confidence: float = 1.0
    anchor_used: Optional[str] = None
