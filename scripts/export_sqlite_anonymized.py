"""Read-only consistent snapshot. Output only anonymous data into ignored test directories."""
import argparse
import datetime
import hashlib
import json
import secrets
import sqlite3
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--source", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args()
source = Path(args.source).resolve()
output = Path(args.output).resolve()
root = Path(__file__).resolve().parent.parent
if not output.is_relative_to(root / ".tools"):
    raise ValueError("Anonymous snapshots must remain under .tools")
salt = secrets.token_bytes(32)

def digest(value):
    return hashlib.sha256(salt + str(value).encode("utf-8")).hexdigest()

def anon(value, table, column, dtype):
    if value is None:
        return None
    upper_type = dtype.upper()
    if "BOOL" in upper_type:
        return bool(value)
    if "DATE" in upper_type or "TIME" in upper_type:
        if isinstance(value, (int, float)):
            return datetime.datetime.fromtimestamp(value / 1000, datetime.timezone.utc).isoformat()
        return value
    if isinstance(value, (int, float)) or "DECIMAL" in upper_type or "NUMERIC" in upper_type:
        return value
    if column == "passwordHash":
        return "disabled-anonymous-copy"
    if column == "id" or column.endswith("Id"):
        return "anon-" + digest(value)[:32]
    if column == "email" or "email" in column.lower():
        return digest(value)[:24] + "@copy.invalid"
    if "telefono" in column.lower() or column == "destinatario" or column == "whatsappPublico":
        return "0" + str(int(digest(value)[:14], 16)).zfill(17)
    if column == "tokenCancelacion":
        return digest(value)
    if column == "codigoReserva":
        return "ANON-" + digest(value)[:20]
    if column in {"sku", "slug", "folio"}:
        return "anon-" + digest(value)[:20]
    if column in {"rol", "plan", "codigo", "estado", "estadoPago", "tipo", "tipoItem", "categoria", "metodoPago", "canal", "proveedor", "horarioInicio", "horarioFin", "horarioApertura", "horarioCierre", "diasDescanso", "diasLaborales", "zonaHoraria", "tipoDescuento", "unidad", "purpose", "mailStatus", "serie", "regimenFiscal", "usoCfdi"}:
        return value
    if column == "sucursalesAsignadasJson":
        try:
            return json.dumps(["anon-" + digest(item)[:32] for item in json.loads(value)])
        except (TypeError, ValueError):
            return "[]"
    if column.endswith("Json") or column.endswith("JSON"):
        return None
    if "url" in column.lower() or "token" in column.lower() or "secret" in column.lower() or "rfc" in column.lower():
        return "anon-" + digest(value)[:20]
    return "Anon " + table + " " + digest(value)[:12]

connection = sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)
connection.row_factory = sqlite3.Row
connection.execute("BEGIN")
tables = [row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations'")]
result = {"tables": {}, "omitted_security_tables": ["AuthAction", "AuthThrottle"], "source_counts": {}}
for table in tables:
    if not table.replace("_", "").isalnum():
        raise ValueError("Unexpected table name")
    info = connection.execute('PRAGMA table_info("' + table + '")').fetchall()
    types = {row[1]: row[2] for row in info}
    rows = connection.execute('SELECT * FROM "' + table + '"').fetchall()
    result["source_counts"][table] = len(rows)
    result["tables"][table] = [] if table in result["omitted_security_tables"] else [{column: anon(row[column], table, column, types[column]) for column in row.keys()} for row in rows]
connection.rollback()
connection.close()
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
print("Anonymous snapshot saved; no identifiers or authentication material logged.")
