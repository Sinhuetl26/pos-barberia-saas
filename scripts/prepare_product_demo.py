"""Copy the named fictitious closure demo; never migrate the presentation source."""
import json, sqlite3, pathlib, datetime
root = pathlib.Path(__file__).resolve().parent.parent
manifest = json.loads((root / '.tools/closure-demo.json').read_text(encoding='utf-8-sig'))
source = pathlib.Path(manifest['directory']).resolve() / 'test.db'
if source.parent.parent != root or not source.parent.name.startswith('.test-db-'):
    raise RuntimeError('An explicitly isolated closure fixture is required')
destination = root / '.tools/product-complete-demo'
destination.mkdir(parents=True, exist_ok=True)
target = destination / 'test.db'
if target.exists():
    raise RuntimeError('Product demo already exists; no reset or overwrite permitted')
with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as old, sqlite3.connect(target) as new:
    old.backup(new)
    for name in ['20261011_inventory_intentions', '20261011_inventory_counts']:
        sql = (root / 'packages/database/prisma/migrations' / name / 'migration.sql').read_text()
        # PostgreSQL migration types must use Prisma's SQLite DATETIME mapping.
        new.executescript(sql.replace('TIMESTAMP(3)', 'DATETIME'))
    new.commit()
    checks = {table: new.execute('SELECT COUNT(*) FROM "' + table + '"').fetchone()[0]
              for table in ['Tenant', 'Venta', 'Cita', 'Producto', 'KardexMovimiento']}
    for table, total in checks.items():
        if old.execute('SELECT COUNT(*) FROM "' + table + '"').fetchone()[0] != total:
            raise RuntimeError('Copy verification failed for ' + table)
manifest.update(database='file:' + target.as_posix(), directory=str(destination), apiPort=3103,
                webPort=5191, url='http://127.0.0.1:5191/b/cierre-demo',
                copiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                sourcePreserved=True, copyCounts=checks)
(root / '.tools/product-complete-demo.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print('Isolated product demo copy verified; original data preserved. Counts:', checks)
