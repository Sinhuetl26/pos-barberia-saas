"""Verify every preexisting table and field against the isolated upgrade backup."""
import sqlite3, pathlib, json
root=pathlib.Path(__file__).resolve().parent.parent
directory=root/'.tools/product-complete-demo'
manifest=json.loads((directory/'backup-manifest.json').read_text())
backup=pathlib.Path(manifest['backup']).resolve()
if backup.parent!=directory or not backup.name.startswith('backup-before-supplies-'):
    raise RuntimeError('Named isolated backup required')
with sqlite3.connect(backup.as_uri()+'?mode=ro',uri=True) as old, sqlite3.connect((directory/'test.db').as_uri()+'?mode=ro',uri=True) as current:
    tables=[row[0] for row in old.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
    for table in tables:
        columns=[row[1] for row in old.execute('PRAGMA table_info("'+table+'")')]
        fields=','.join('"'+field+'"' for field in columns)
        before=old.execute('SELECT '+fields+' FROM "'+table+'" ORDER BY rowid').fetchall()
        after=current.execute('SELECT '+fields+' FROM "'+table+'" ORDER BY rowid').fetchall()
        if before!=after:
            raise RuntimeError('Existing values changed in '+table)
    print('Upgrade verified:',len(tables),'preexisting tables and every original field preserved.')
