'use strict';
// Explicitly authorized disposable second cluster. Never touches legacy test-cluster.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const{execFileSync,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'.tools','postgres-qa-20261013-'+crypto.randomBytes(4).toString('hex')),cluster=path.join(directory,'cluster');
if(path.dirname(directory)!==path.join(root,'.tools')||!path.basename(directory).startsWith('postgres-qa-20261013-'))throw Error('Unsafe disposable cluster path');
const bin=path.join(root,'.tools','postgres','runtime','pgsql','bin'),exe=name=>path.join(bin,name+(process.platform==='win32'?'.exe':''));
const allowed=new Set(['qa_product_commercial_policies.cjs','qa_operation_audit.cjs','qa_cash_close_preview.cjs','qa_operating_expenses.cjs','qa_data_import.cjs','test_workspace_search.cjs','qa_demo_end_to_end.cjs','qa_owner_intelligence_history.cjs','qa_booking_phone_identity.cjs','qa_product_queue_absences.cjs','qa_pc18_personalization.cjs','qa_product_combined_services.cjs']);const scripts=process.argv.slice(2);if(!scripts.length||scripts.some(s=>!allowed.has(s)))throw Error('Choose explicit independent QA scripts');
fs.mkdirSync(directory,{recursive:false});const password=crypto.randomBytes(32).toString('hex'),passwordFile=path.join(directory,'init-password');fs.writeFileSync(passwordFile,password,{mode:0o600});let started=false;
const port=55413,user='systech_qa',database='systech_test_qa20261013';
const env={...process.env,PGPASSWORD:password,PGUSER:user,PGHOST:'127.0.0.1',PGPORT:String(port),PGDATABASE:'postgres'};
const run=(name,args,extra={})=>execFileSync(exe(name),args,{env,windowsHide:true,stdio:'pipe',...extra});
try{
 try{run('initdb',['-D',cluster,'-U',user,'--encoding=UTF8','--locale=C','--auth=scram-sha-256','--pwfile='+passwordFile]);}finally{if(fs.existsSync(passwordFile))fs.unlinkSync(passwordFile)}
 // Windows server descendants retain inherited pipe handles; do not wait on their EOF.
 run('pg_ctl',['-D',cluster,'-l',path.join(directory,'server.log'),'-o',`-p ${port} -h 127.0.0.1`,'-w','start'],{stdio:'ignore'});started=true;
 run('createdb',[database]);
 fs.writeFileSync(path.join(directory,'run.json'),JSON.stringify({port,user,database,cluster,createdAt:new Date().toISOString(),isolated:true},null,2));
 const testEnv={...process.env,NODE_ENV:'test',NO_LISTEN:'true',SYSTECH_ISOLATED_TESTS:'true',SYSTECH_TEST_PG_URL:`postgresql://${user}:${password}@127.0.0.1:${port}/${database}`};
 testEnv.SYSTECH_TEST_PRISMA_CLIENT=require('./postgres_migration_utils').generateClient(testEnv);
 console.log('Disposable PostgreSQL ready on separate loopback port; legacy cluster untouched.');
 for(const script of scripts){const r=spawnSync(process.execPath,[path.join(__dirname,script)],{env:testEnv,stdio:'inherit',windowsHide:true});if(r.status!==0){process.exitCode=r.status||1;break}}
}catch(error){console.error('Isolated PostgreSQL setup failed; private diagnostics remain in its disposable directory.');if(error.stderr){const diagnostic=String(error.stderr).replaceAll(password,'[redacted]');console.error(diagnostic.slice(-1600));}process.exitCode=1}
finally{if(started){try{run('pg_ctl',['-D',cluster,'-m','fast','-w','stop']);console.log('Disposable PostgreSQL stopped; no preexisting process was stopped.')}catch{console.error('New QA cluster stop failed; notify coordinator with run.json path.');process.exitCode=1}}}
