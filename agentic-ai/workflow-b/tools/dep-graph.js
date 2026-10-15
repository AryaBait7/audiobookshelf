const fs=require('fs'),path=require('path');
const root=process.argv[2];const out=process.argv[3];
const files=fs.readFileSync(path.join(root,'../migration-evidence/baseline/eligible-js-files.txt'),'utf8').split(/\r?\n/).filter(Boolean);
const set=new Set(files);
const deps={},ext={},loc={},rev={};
const testRefs={};
const resolve=(from,spec)=>{let p=path.posix.normalize(path.posix.join(path.posix.dirname(from),spec));for(const c of [p,p+'.js',p+'/index.js'])if(set.has(c))return c;if(fs.existsSync(path.join(root,p))||fs.existsSync(path.join(root,p+'.js'))||fs.existsSync(path.join(root,p,'index.js')))return 'OUT:'+p;return 'MISSING:'+p};
for(const f of files){const src=fs.readFileSync(path.join(root,f),'utf8');loc[f]=src.split('\n').length;deps[f]=new Set();ext[f]=new Set();
 for(const m of src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)){const s=m[1];if(s.startsWith('.')){const r=resolve(f,s);if(r.startsWith('OUT:'))ext[f].add(r.slice(4));else if(r.startsWith('MISSING'))ext[f].add(r);else deps[f].add(r)}else ext[f].add(s)}}
for(const f of files)for(const d of deps[f])(rev[d]=rev[d]||new Set()).add(f);
// tests
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const t of walk(path.join(root,'test'))){const rel=path.relative(root,t).split(path.sep).join('/');const src=fs.readFileSync(t,'utf8');for(const m of src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)){if(!m[1].startsWith('.'))continue;const r=resolve(rel,m[1]);if(set.has(r))(testRefs[r]=testRefs[r]||[]).push(rel)}}
// SCC/levels: iterative longest-path with cycle detection via Tarjan
let idx=0,st=[],on=new Set(),I={},L={},sccs=[];
function sc(v){I[v]=L[v]=idx++;st.push(v);on.add(v);for(const w of deps[v]){if(I[w]===undefined){sc(w);L[v]=Math.min(L[v],L[w])}else if(on.has(w))L[v]=Math.min(L[v],I[w])}if(L[v]===I[v]){const c=[];let w;do{w=st.pop();on.delete(w);c.push(w)}while(w!==v);sccs.push(c)}}
for(const f of files)if(I[f]===undefined)sc(f);
const comp={};sccs.forEach((c,i)=>c.forEach(f=>comp[f]=i));
const lvl={};for(const c of sccs){let l=0;for(const f of c)for(const d of deps[f])if(comp[d]!==comp[f])l=Math.max(l,lvl[d]+1);for(const f of c)lvl[f]=l} // sccs in reverse topo order from Tarjan
const rows=files.map(f=>({f,loc:loc[f],out:deps[f].size,in:(rev[f]||new Set()).size,lvl:lvl[f],scc:sccs[comp[f]].length,tests:(testRefs[f]||[]).length,ext:[...ext[f]].join(' ')}));
fs.writeFileSync(out+'/graph.json',JSON.stringify({rows,deps:Object.fromEntries(files.map(f=>[f,[...deps[f]]])),sccs:sccs.filter(c=>c.length>1),testRefs},null,1));
console.log('SCCs >1:');sccs.filter(c=>c.length>1).forEach(c=>console.log(c.length,c.join(', ')));
const byLvl={};rows.forEach(r=>(byLvl[r.lvl]=byLvl[r.lvl]||[]).push(r));
for(const l of Object.keys(byLvl).sort((a,b)=>a-b))console.log('L'+l+' ('+byLvl[l].length+'): '+byLvl[l].map(r=>r.f.replace('server/','')+'['+r.loc+(r.tests?',t'+r.tests:'')+']').join(' '));
console.log('\nTop fan-in:');rows.sort((a,b)=>b.in-a.in).slice(0,20).forEach(r=>console.log(r.in,r.f));
console.log('\nTop fan-out:');rows.sort((a,b)=>b.out-a.out).slice(0,12).forEach(r=>console.log(r.out,r.f));
console.log('\nMissing:');rows.forEach(r=>{if(r.ext.includes('MISSING'))console.log(r.f,r.ext)});
