"""Take a consistent, one-time seed of the named fictional presentation database."""
import json
import pathlib
import sqlite3

root = pathlib.Path(__file__).resolve().parents[1]
manifest = json.loads((root / '.tools/product-complete-demo.json').read_text())
source = root / '.tools/product-complete-demo/test.db'
if pathlib.Path(manifest['directory']).resolve() != source.parent.resolve():
    raise RuntimeError('Named fictional demo required')
target = root / '.tools/docker-demo-seed/test.db'
if target.exists():
    print('Existing Docker seed preserved; no overwrite.')
else:
    target.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as current:
        with sqlite3.connect(str(target)) as backup:
            current.backup(backup)
            assert backup.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
            tables = [r[0] for r in current.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
            for table in tables:
                quoted = '"' + table.replace('"', '""') + '"'
                assert current.execute('SELECT COUNT(*) FROM ' + quoted).fetchone()[0] == backup.execute('SELECT COUNT(*) FROM ' + quoted).fetchone()[0], table
    print('Consistent fictional demo seed verified:', len(tables), 'tables. Original unchanged.')
