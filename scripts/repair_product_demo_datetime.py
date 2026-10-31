"""Fix only the isolated copy's two new table declarations, preserving rows."""
import pathlib, sqlite3, json, re
root = pathlib.Path(__file__).resolve().parent.parent
manifest = json.loads((root / '.tools/product-complete-demo.json').read_text())
target = pathlib.Path(manifest['directory']).resolve() / 'test.db'
if target != root / '.tools/product-complete-demo/test.db':
    raise RuntimeError('Named isolated copy required')
with sqlite3.connect(target) as db:
    db.execute('BEGIN IMMEDIATE')
    for table, migration in [('InventarioOperacion', '20261011_inventory_intentions'), ('ConteoInventario', '20261011_inventory_counts')]:
        types = db.execute('PRAGMA table_info("' + table + '")').fetchall()
        if not any('TIMESTAMP' in row[2] for row in types):
            continue
        count = db.execute('SELECT COUNT(*) FROM "' + table + '"').fetchone()[0]
        sql = (root / 'packages/database/prisma/migrations' / migration / 'migration.sql').read_text()
        declaration = re.search(r'CREATE TABLE "' + table + r'" \([\s\S]*?\);', sql).group().replace('TIMESTAMP(3)', 'DATETIME')
        db.execute('ALTER TABLE "' + table + '" RENAME TO "' + table + '_type_backup"')
        db.execute(declaration)
        columns = ','.join('"' + row[1] + '"' for row in types)
        db.execute('INSERT INTO "' + table + '" (' + columns + ') SELECT ' + columns + ' FROM "' + table + '_type_backup"')
        if db.execute('SELECT COUNT(*) FROM "' + table + '"').fetchone()[0] != count:
            raise RuntimeError('Row count changed')
        db.execute('DROP TABLE "' + table + '_type_backup"')
        for index in re.findall(r'CREATE (?:UNIQUE )?INDEX [^;]+;', sql):
            if 'ON "' + table + '"' in index:
                db.execute(index)
    db.commit()
print('SQLite declarations corrected on isolated copy. All rows preserved.')
