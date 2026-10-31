"""Consistent backup of the named fictitious product fixture before schema upgrade."""
import pathlib, sqlite3, json, datetime
root = pathlib.Path(__file__).resolve().parent.parent
manifest = json.loads((root/'.tools/product-complete-demo.json').read_text())
source = pathlib.Path(manifest['directory']).resolve()/'test.db'
if source != root/'.tools/product-complete-demo/test.db':
    raise RuntimeError('Named isolated copy required')
target = source.parent/('backup-before-supplies-'+datetime.datetime.now().strftime('%Y%m%d%H%M%S')+'.db')
with sqlite3.connect(source.as_uri()+'?mode=ro',uri=True) as current, sqlite3.connect(target) as backup:
    current.backup(backup)
    tables=['Tenant','Venta','Cita','Producto','KardexMovimiento','ConteoInventario','InventarioOperacion']
    counts={table:current.execute('SELECT COUNT(*) FROM "'+table+'"').fetchone()[0] for table in tables}
    for table,total in counts.items():
        if backup.execute('SELECT COUNT(*) FROM "'+table+'"').fetchone()[0]!=total:
            raise RuntimeError('Backup verification failed')
(source.parent/'backup-manifest.json').write_text(json.dumps({'backup':str(target),'counts':counts},indent=2))
print('Verified isolated backup:',target.name,counts)
