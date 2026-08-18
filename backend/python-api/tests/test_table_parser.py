from app.schemas.spatial import SpatialWord, BoundingBox
from app.engine.table_parser import DeterministicTableParser

def test_deterministic_table_extraction():
    words = [
        # Table Header
        SpatialWord(text="Descripción", bbox=BoundingBox(x0=50.0, y0=200.0, x1=120.0, y1=215.0)),
        SpatialWord(text="Cantidad", bbox=BoundingBox(x0=300.0, y0=200.0, x1=350.0, y1=215.0)),
        SpatialWord(text="Precio", bbox=BoundingBox(x0=400.0, y0=200.0, x1=440.0, y1=215.0)),
        SpatialWord(text="Total", bbox=BoundingBox(x0=500.0, y0=200.0, x1=530.0, y1=215.0)),

        # Row 1: Servidor Cloud (1 x 500.00 = 500.00)
        SpatialWord(text="Servidor", bbox=BoundingBox(x0=50.0, y0=240.0, x1=100.0, y1=255.0)),
        SpatialWord(text="Cloud", bbox=BoundingBox(x0=105.0, y0=240.0, x1=140.0, y1=255.0)),
        SpatialWord(text="1", bbox=BoundingBox(x0=310.0, y0=240.0, x1=320.0, y1=255.0)),
        SpatialWord(text="$500.00", bbox=BoundingBox(x0=400.0, y0=240.0, x1=450.0, y1=255.0)),
        SpatialWord(text="$500.00", bbox=BoundingBox(x0=500.0, y0=240.0, x1=550.0, y1=255.0)),

        # Row 2: Almacenamiento NVMe (2 x 100.00 = 200.00)
        SpatialWord(text="Almacenamiento", bbox=BoundingBox(x0=50.0, y0=270.0, x1=140.0, y1=285.0)),
        SpatialWord(text="NVMe", bbox=BoundingBox(x0=145.0, y0=270.0, x1=180.0, y1=285.0)),
        SpatialWord(text="2", bbox=BoundingBox(x0=310.0, y0=270.0, x1=320.0, y1=285.0)),
        SpatialWord(text="$100.00", bbox=BoundingBox(x0=400.0, y0=270.0, x1=450.0, y1=285.0)),
        SpatialWord(text="$200.00", bbox=BoundingBox(x0=500.0, y0=270.0, x1=550.0, y1=285.0)),

        # Totals Section (Footer boundary)
        SpatialWord(text="Subtotal:", bbox=BoundingBox(x0=400.0, y0=320.0, x1=450.0, y1=335.0)),
        SpatialWord(text="$700.00", bbox=BoundingBox(x0=500.0, y0=320.0, x1=550.0, y1=335.0)),
    ]

    parser = DeterministicTableParser(words)
    extracted_table = parser.parse_items(page_num=1)

    assert len(extracted_table.items) == 2
    
    # Check item 1
    item1 = extracted_table.items[0]
    assert item1.description == "Servidor Cloud"
    assert item1.quantity == 1.0
    assert item1.unit_price == 500.0
    assert item1.total_price == 500.0
    assert item1.is_math_valid is True

    # Check item 2
    item2 = extracted_table.items[1]
    assert item2.description == "Almacenamiento NVMe"
    assert item2.quantity == 2.0
    assert item2.unit_price == 100.0
    assert item2.total_price == 200.0
    assert item2.is_math_valid is True

    # Check subtotal sum
    assert extracted_table.subtotal_calculated == 700.0
