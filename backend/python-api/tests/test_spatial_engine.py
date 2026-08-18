from app.schemas.spatial import SpatialWord, BoundingBox
from app.engine.spatial_engine import SpatialEngine

def test_ray_casting_horizontal_total():
    words = [
        SpatialWord(text="TOTAL", bbox=BoundingBox(x0=350.0, y0=700.0, x1=400.0, y1=715.0)),
        SpatialWord(text="A", bbox=BoundingBox(x0=405.0, y0=700.0, x1=415.0, y1=715.0)),
        SpatialWord(text="PAGAR:", bbox=BoundingBox(x0=420.0, y0=700.0, x1=470.0, y1=715.0)),
        SpatialWord(text="$1,785.00", bbox=BoundingBox(x0=500.0, y0=700.0, x1=560.0, y1=715.0)),
    ]

    engine = SpatialEngine(words)
    total_field = engine.extract_field("TOTAL", value_type="money")

    assert total_field is not None
    assert total_field.raw_value == "$1,785.00"
    assert total_field.parsed_value == "1,785.00"
    assert total_field.bbox.x0 == 500.0

def test_ray_casting_vertical_invoice_number():
    words = [
        SpatialWord(text="Factura", bbox=BoundingBox(x0=50.0, y0=50.0, x1=100.0, y1=65.0)),
        SpatialWord(text="N°:", bbox=BoundingBox(x0=105.0, y0=50.0, x1=125.0, y1=65.0)),
        SpatialWord(text="INV-2026-001", bbox=BoundingBox(x0=50.0, y0=75.0, x1=140.0, y1=90.0)),
    ]

    engine = SpatialEngine(words)
    inv_field = engine.extract_field("INVOICE_NUMBER", value_type="invoice_number")

    assert inv_field is not None
    assert inv_field.parsed_value == "INV-2026-001"

def test_ray_casting_date_extraction():
    words = [
        SpatialWord(text="Fecha", bbox=BoundingBox(x0=50.0, y0=100.0, x1=90.0, y1=115.0)),
        SpatialWord(text="Emisión:", bbox=BoundingBox(x0=95.0, y0=100.0, x1=150.0, y1=115.0)),
        SpatialWord(text="15/08/2026", bbox=BoundingBox(x0=180.0, y0=100.0, x1=250.0, y1=115.0)),
    ]

    engine = SpatialEngine(words)
    date_field = engine.extract_field("DATE", value_type="date")

    assert date_field is not None
    assert date_field.parsed_value == "15/08/2026"

if __name__ == "__main__":
    test_ray_casting_horizontal_total()
    test_ray_casting_vertical_invoice_number()
    test_ray_casting_date_extraction()
    print("✅ All Spatial Ray-Casting unit tests passed successfully!")
