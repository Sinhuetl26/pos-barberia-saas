"""Read-only reconciliation of the presentation and named fictitious review."""
import json
import pathlib
import sqlite3

root = pathlib.Path(__file__).resolve().parents[1]

def read_copy(name):
    path = root / ".tools" / name / "test.db"
    assert path.is_file(), "Named fixture must already exist"
    connection = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    return connection

result = {}
with read_copy("product-complete-demo") as db:
    assert db.execute("SELECT total FROM Venta WHERE folio=?", ("A-000003",)).fetchone()[0] == 600
    assert db.execute("SELECT stockActual FROM Producto WHERE sku=?", ("DEMO-GEL-ML",)).fetchone()[0] == 490
    assert db.execute("SELECT COUNT(*) FROM TarifaProfesional").fetchone()[0] == 0
    assert db.execute("SELECT COUNT(*) FROM PoliticaDescuento").fetchone()[0] == 0
    cut = dict(db.execute("SELECT estado,conteoEfectivoReal,descuadre FROM CorteCaja WHERE conteoEfectivoReal=675").fetchone())
    assert cut == {"estado": "CERRADO", "conteoEfectivoReal": 675, "descuadre": 0}
    result["presentation"] = {"saleA3": 600, "gel": 490, "tariffs": 0, "discountPolicies": 0, "closedCash": cut}

with read_copy("commercial-review-demo-20261014") as db:
    sale = dict(db.execute("SELECT id,folio,total,descuento,metodoPago FROM Venta WHERE folio=?", ("A-000004",)).fetchone())
    assert sale["total"] == 170 and sale["descuento"] == 30 and sale["metodoPago"] == "TRANSFERENCIA"
    assert db.execute("SELECT COUNT(*) FROM Venta WHERE folio=?", ("A-000004",)).fetchone()[0] == 1
    approval = dict(db.execute("SELECT estado,solicitadoPorId,aprobadoPorId FROM AprobacionDescuento WHERE ventaId=?", (sale["id"],)).fetchone())
    assert approval["estado"] == "USADA" and approval["solicitadoPorId"] != approval["aprobadoPorId"]
    commission = db.execute("SELECT SUM(monto) FROM Comision WHERE ventaId=?", (sale["id"],)).fetchone()[0]
    assert commission == 68
    expense = dict(db.execute("SELECT id,importe,version FROM GastoOperativo WHERE comprobanteReferencia=?", ("QA-REVISION-14OCT",)).fetchone())
    # The original stays immutable; the corrected amount belongs to the audit record.
    assert expense["importe"] == 12 and expense["version"] == 2
    corrections = db.execute("SELECT anteriorJson,actualJson FROM CorreccionGasto WHERE gastoId=?", (expense["id"],)).fetchall()
    assert len(corrections) == 1
    correction = {key: json.loads(corrections[0][key]) for key in ("anteriorJson", "actualJson")}
    assert float(correction["anteriorJson"]["importe"]) == 12 and float(correction["actualJson"]["importe"]) == 14
    queue = dict(db.execute("SELECT estado,citaId FROM FilaPresencial WHERE clienteNombre=?", ("QA fila ficticia 14oct",)).fetchone())
    assert queue["estado"] == "ASIGNADO"
    queue_price = db.execute("SELECT precioEstimado FROM Cita WHERE id=?", (queue["citaId"],)).fetchone()[0]
    assert queue_price == 280
    identities = db.execute("SELECT COUNT(*) FROM ClienteFinal WHERE telefono IN (?,?,?)", ("5500001414", "525500001414", "5215500001414")).fetchone()[0]
    assert identities == 1
    result["isolatedReview"] = {"sale": sale, "approval": approval, "commission": commission, "originalExpense": expense, "correction": correction, "queue": queue, "queuePrice": queue_price, "equivalentCustomerCount": identities}

(root / "docs/evidencias/producto-completo-20261011/REVISION_INTERNA_DB_20261014.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
print("PASS read-only: presentation preserved; sale170 once, commission68, expense12->14 audited, queue280 and one customer")
