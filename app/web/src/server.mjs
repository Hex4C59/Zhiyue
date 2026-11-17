import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { Store, redact } from './lib/store.mjs';
import { Library } from './lib/library.mjs';
import { JobManager, resolvePython } from './lib/jobs.mjs';
import { AssistantService } from './lib/assistants.mjs';
import { previewPaper } from './lib/preview.mjs';
import { libraryPaths, resolveLibraryRoot, ensureLibrary } from './lib/paths.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.csv':'text/csv; charset=utf-8','.tsv':'text/tab-separated-values; charset=utf-8'};
const UPLOADS=new Set(['.png','.jpg','.jpeg','.webp','.gif','.pdf','.txt','.md','.csv','.tsv','.json','.docx','.pptx','.xlsx']);
function error(message,status=400){return Object.assign(new Error(message),{status});}
export function checkRequest(req) {
  const host=req.headers.host||'';
  if(!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host))throw error('仅允许通过本机地址访问。',403);
  const origin=req.headers.origin;
  if(origin&&origin!==`http://${host}`)throw error('不接受其他网站发起的请求。',403);
  if(req.headers['sec-fetch-site']==='cross-site')throw error('不接受跨站请求。',403);
  if(!['GET','HEAD'].includes(req.method)&&req.url!=='/api/uploads'&&!String(req.headers['content-type']).startsWith('application/json'))throw error('请使用JSON请求。',415);
}
async function readBody(req,max=2_000_000){
  if(Number(req.headers['content-length'])>max)throw error('文件或请求过大。',413);
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>max)throw error('文件或请求过大。',413);chunks.push(chunk);}
  return Buffer.concat(chunks);
}
async function readJson(req){const b=await readBody(req);try{return JSON.parse(b.toString('utf8')||'{}');}catch{throw error('JSON格式不正确。');}}
function json(res,value,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}

export async function serveFile(req,res,file,{download=false,filename}={}) {
  const stat=await fsp.stat(file);if(!stat.isFile())throw error('文件不存在。',404);
  const mime=MIME[path.extname(file).toLowerCase()]||'application/octet-stream';
  const headers={'Content-Type':mime,'Accept-Ranges':'bytes','Content-Disposition':`${download?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(filename||path.basename(file))}`,'Cache-Control':'private, no-cache'};
  const range=req.headers.range;
  let start=0,end=stat.size-1,status=200;
  if(range){
    const m=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(!m||(!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return res.end();}
    if(!m[1])start=Math.max(0,stat.size-Number(m[2]));
    else {start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return res.end();}
    status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
  }
  headers['Content-Length']=stat.size?end-start+1:0;res.writeHead(status,headers);
  if(req.method==='HEAD'||!stat.size)return res.end();
  const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
}

export function extractFile(python,file,pages) {
  return new Promise((resolve,reject)=>{
    const args=[path.join(HERE,'lib/extract.py'),file,...(pages?['--pages',pages.join(',')]:[])];
    const proc=spawn(python,args,{shell:false,windowsHide:true,env:{...process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8'}});
    let output='';let stderr='';let overflow=false;let bytes=0;
    const decoder=new StringDecoder('utf8');
    const timer=setTimeout(()=>{proc.kill();reject(new Error('文件解析超过45秒，请缩小页范围。'));},45000);
    proc.stdout.on('data',b=>{bytes+=b.length;if(bytes>800000){overflow=true;proc.kill();return;}output+=decoder.write(b);});
    proc.stdout.on('end',()=>{output+=decoder.end();});
    proc.stderr.on('data',b=>{stderr=(stderr+b.toString('utf8')).slice(-3000);});
    proc.on('error',e=>{clearTimeout(timer);reject(e);});
    proc.on('close',code=>{clearTimeout(timer);if(overflow)return reject(new Error('文件提取结果超过限制。'));try{const data=JSON.parse(output);if(code!==0||data.error)throw new Error(data.error||redact(stderr)||'文件解析失败。');resolve(data);}catch(e){reject(e);}});
  });
}

export async function createApp({root:configuredRoot,stateDir:configuredStateDir,connectPi=true,piClient}={}) {
  const root=configuredRoot??resolveLibraryRoot(HERE);
  const paths=libraryPaths(root);
  const stateDir=configuredStateDir??paths.data;
  await ensureLibrary(paths);
  const connections=new Set();
  const library=new Library({root,stateDir});
  const emit=event=>{
    if(event.type==='job'&&['completed','failed'].includes(event.job.status))library.refresh();
    const data=`data: ${JSON.stringify(event)}\n\n`;for(const res of connections)if(!res.writableEnded)res.write(data);
  };
  const python=resolvePython();
  const jobs=new JobManager({root,stateDir,emit,python});
  const chats=new AssistantService({root,stateDir,library,jobs,emit,extract:(file,pages)=>extractFile(python,file,pages),piClient});
  const uploads=new Store(path.join(stateDir,'uploads.json'),{files:[]});
  const validUploads=ids=>{
    if(!Array.isArray(ids)||ids.length>8)throw error('每次最多附加8个文件。');
    return ids.map(id=>{const file=uploads.data.files.find(f=>f.id===id);if(!file||!fs.existsSync(file.path))throw error('附件不存在，请重新上传。');return file;});
  };
  const findUpload=id=>{
    if(typeof id!=='string'||!id)throw error('请选择要导入的 PDF。');
    const file=uploads.data.files.find(f=>f.id===id);
    if(!file||!fs.existsSync(file.path))throw error('附件不存在，请重新上传。');
    return file;
  };
  const boot=()=>chats.connect().catch(()=>emit({type:'status',...chats.snapshot()}));
  if(connectPi)boot();
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self'; object-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'");
    try{
      checkRequest(req);const url=new URL(req.url,`http://${req.headers.host}`);const route=url.pathname;const method=req.method;
      if(method==='GET'&&route==='/api/events'){
        res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});
        res.write(`data: ${JSON.stringify({type:'connected',approvals:[...chats.approvals.values()].map(({id,chatId,method,params})=>({id,chatId,method,params}))})}\n\n`);
        connections.add(res);const timer=setInterval(()=>res.write(': keepalive\n\n'),20000);timer.unref();req.on('close',()=>{clearInterval(timer);connections.delete(res);});return;
      }
      if(method==='GET'&&route==='/api/library')return json(res,await library.getLibrary());
      if(method==='POST'&&route==='/api/categories'){
        const {name}=await readJson(req);
        return json(res,await library.createCategory(name),201);
      }
      if(method==='POST'&&route==='/api/categories/rename'){
        const {category,subcategory,name}=await readJson(req);
        return json(res,await library.renameCategory(category,subcategory,name));
      }
      if(method==='GET'&&route==='/api/status')return json(res,{...chats.snapshot(),python,node:process.version,root});
      if(method==='POST'&&route==='/api/agents/pi/connect')return json(res,await chats.connect());
      if(method==='GET'&&route==='/api/agents/pi/settings')return json(res,await chats.settings());
      if(method==='POST'&&route==='/api/agents/pi/settings/key'){
        const {provider,key}=await readJson(req);
        if(typeof provider!=='string'||!/^[A-Za-z0-9._-]{1,100}$/.test(provider))throw error('服务商名称不合法。');
        if(typeof key!=='string'||!key.trim()||key.length>4096||/[\u0000-\u001f\u007f]/.test(key)){
          throw error('请输入有效的 API 密钥。');
        }
        return json(res,await chats.saveKey(provider,key.trim()));
      }
      if(method==='POST'&&route==='/api/agents/pi/settings/key/remove'){
        const {provider}=await readJson(req);
        if(typeof provider!=='string'||!/^[A-Za-z0-9._-]{1,100}$/.test(provider))throw error('服务商名称不合法。');
        return json(res,await chats.removeKey(provider));
      }
      if(method==='POST'&&route==='/api/agents/pi/settings/model'){
        const {model}=await readJson(req);
        if(typeof model!=='string'||!model||model.length>200||/[\u0000-\u001f\u007f]/.test(model)){
          throw error('请选择模型。');
        }
        return json(res,await chats.setDefaultModel(model));
      }
      if(method==='GET'&&route==='/api/chats')return json(res,chats.list());
      if(method==='POST'&&route==='/api/chats')return json(res,chats.create(await readJson(req)),201);
      const chatMatch=/^\/api\/chats\/([\w-]+)(?:\/(messages|interrupt))?$/.exec(route);
      if(chatMatch){
        const [,id,action]=chatMatch;
        if(method==='GET'&&!action)return json(res,chats.get(id));
        if(method==='POST'&&action==='messages'){const data=await readJson(req);const result=await chats.send(id,{...data,attachments:validUploads(data.attachmentIds||[])});return json(res,result,202);}
        if(method==='POST'&&action==='interrupt')return json(res,await chats.interrupt(id));
      }
      const noteDraft=/^\/api\/note-drafts\/([\w-]+)$/.exec(route);
      if(method==='POST'&&noteDraft){const {action}=await readJson(req);return json(res,await chats.resolveNoteDraft(noteDraft[1],action));}
      const approval=/^\/api\/approvals\/([\w-]+)$/.exec(route);
      if(method==='POST'&&approval)return json(res,chats.approve(approval[1],await readJson(req)));
      const paper=/^\/api\/papers\/(L\d+)$/.exec(route);
      if(method==='PATCH'&&paper)return json(res,await library.updatePaper(paper[1],await readJson(req)));
      const preview=/^\/api\/papers\/(L\d+)\/(preview|text-layer)$/.exec(route);
      if((method==='GET'||method==='HEAD')&&preview){
        const entry=await library.getPaper(preview[1]);if(!entry)throw error('文献不存在。',404);
        const page=Number(url.searchParams.get('page')||1);
        if(!Number.isSafeInteger(page)||page<1)throw error('请指定正整数PDF页序。');
        const rendered=await previewPaper({root,python,file:await library.safeFile(entry.file),page});
        if(preview[2]==='text-layer')return json(res,{page,totalPages:rendered.totalPages,...rendered.textLayer});
        res.setHeader('X-PDF-Pages',String(rendered.totalPages));
        return await serveFile(req,res,rendered.file);
      }
      if((method==='GET'||method==='HEAD')&&route==='/api/file')return await serveFile(req,res,await library.safeFile(url.searchParams.get('path')||''));
      if(method==='GET'&&route==='/api/text'){
        const relative=url.searchParams.get('path')||'';const file=await library.safeFile(relative);
        if(!['.md','.txt','.json'].includes(path.extname(file).toLowerCase()))throw error('此文件请通过阅读器打开。');
        const stat=await fsp.stat(file);if(stat.size>3_000_000)throw error('文本文件过大。',413);
        return json(res,{path:relative,text:await fsp.readFile(file,'utf8')});
      }
      if(method==='POST'&&route==='/api/uploads'){
        let name;try{name=decodeURIComponent(req.headers['x-filename']||'');}catch{throw error('文件名编码无效。');}
        name=path.basename(name.replaceAll('\\','/')).replace(/[\x00-\x1f]/g,'').slice(0,180);
        const ext=path.extname(name).toLowerCase();if(!UPLOADS.has(ext))throw error('支持图片、PDF、文本、CSV、Word、Excel和PowerPoint文件。',415);
        const data=await readBody(req,25*1024*1024);if(!data.length)throw error('文件为空。');
        const magic=data.subarray(0,16);
        if(ext==='.pdf'&&!data.subarray(0,1024).includes(Buffer.from('%PDF-')))throw error('文件内容不是有效PDF。');
        let mime=MIME[ext]||'application/octet-stream';
        if(mime.startsWith('image/')){
          const ok=ext==='.png'?magic.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):['.jpg','.jpeg'].includes(ext)?magic[0]===255&&magic[1]===216:ext==='.webp'?magic.toString('ascii',0,4)==='RIFF'&&magic.toString('ascii',8,12)==='WEBP':magic.toString('ascii',0,3)==='GIF';
          if(!ok)throw error('图片内容与扩展名不匹配。');
        }
        const id=randomUUID();const file=path.join(stateDir,'uploads',id+ext);await fsp.writeFile(file,data,{flag:'wx',mode:0o600});
        const record={id,name,mime,size:data.length,path:file,createdAt:new Date().toISOString()};uploads.data.files.push(record);uploads.save();
        return json(res,{id,name,mime,size:data.length},201);
      }
      const upload=/^\/api\/uploads\/([\w-]+)$/.exec(route);
      if((method==='GET'||method==='HEAD')&&upload){const file=validUploads([upload[1]])[0];return await serveFile(req,res,file.path,{filename:file.name,download:!file.mime.startsWith('image/')});}
      if(method==='POST'&&route==='/api/library/import'){
        const {uploads:items,category}=await readJson(req);
        if(!Array.isArray(items)||!items.length)throw error('请选择要导入的 PDF。');
        if(items.length>100)throw error('一次最多导入 100 个 PDF。');
        const resolved=items.map(item=>{
          if(!item||typeof item!=='object')throw error('导入条目无效。');
          const file=findUpload(item.uploadId);
          if(path.extname(file.name).toLowerCase()!=='.pdf')throw error('只能导入 PDF 文件。',415);
          return {...item,uploadPath:file.path};
        });
        const result=await jobs.startLocalImports({uploads:resolved,category});
        return json(res,{
          job:result.job,
          skipped:result.skipped.map(s=>({uploadId:resolved[s.index]?.uploadId,...s})),
        },202);
      }
      if(method==='GET'&&route==='/api/downloads')return json(res,{batches:await jobs.listBatches(),jobs:jobs.listJobs()});
      if(method==='POST'&&route==='/api/downloads')return json(res,await jobs.startDownload(await readJson(req)),202);
      if(method==='POST'&&route==='/api/downloads/action')return json(res,await jobs.startAction(await readJson(req)),202);
      if(method==='POST'&&route==='/api/catalog/refresh'){const job=await jobs.refreshCatalog();return json(res,job,202);}
      const jobMatch=/^\/api\/jobs\/([\w-]+)$/.exec(route);
      if(method==='GET'&&jobMatch){const job=jobs.getJob(jobMatch[1]);if(!job)throw error('任务不存在。',404);return json(res,job);}
      if(method==='GET'&&route==='/api/health')return json(res,{ok:true});
      if((method==='GET'||method==='HEAD')&&!route.startsWith('/api/')){
        const staticFiles = {
          '/': 'index.html', '/index.html': 'index.html',
          '/js/app.js': '../dist/app.js',
          '/css/styles.css': 'css/styles.css',
        };
        const file=staticFiles[route];if(!file)throw error('页面不存在。',404);return await serveFile(req,res,path.resolve(HERE,'../public',file));
      }
      throw error('接口不存在。',404);
    }catch(e){if(!res.headersSent)json(res,{error:redact(e.message)},e.status||e.statusCode||(e.code==='ENOENT'?404:400));else res.end();}
  });
  server.requestTimeout=120000;server.headersTimeout=15000;
  let closing;
  return {server,library,jobs,chats,emit,close:()=>closing??=(async()=>{
    await chats.client.close();
    for(const res of connections)res.end();
    const stopped=new Promise(resolve=>server.close(resolve));
    server.closeIdleConnections();
    await jobs.close();
    await stopped;
  })()};
}

export async function startServer(){
  const workspace=resolveLibraryRoot(HERE);
  const paths=libraryPaths(workspace);
  await ensureLibrary(paths);
  if(!fs.existsSync(paths.readme))await fsp.copyFile(path.resolve(HERE,'../../templates/library-README.md'),paths.readme);
  if(!fs.existsSync(paths.agents))await fsp.copyFile(path.resolve(HERE,'../../templates/library-AGENTS.md'),paths.agents);
  if(!fs.existsSync(path.join(paths.catalog,'文献索引.json'))){
    await fsp.writeFile(path.join(paths.catalog,'文献索引.json'),JSON.stringify({schema_version:1,record_count:0,records:[],issues:[]}));
  }
  const port=Number(process.env.LITERATURE_PORT||8765);
  if(!Number.isInteger(port)||port<0||port>65535)throw new Error('LITERATURE_PORT须为0–65535。');
  const app=await createApp({root:workspace});
  app.server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口${port}已被占用，请修改LITERATURE_PORT。`:e.message);app.chats.client.close();process.exitCode=1;});
  app.server.listen(port,'127.0.0.1',()=>{
    const actualPort=app.server.address().port;
    const url=`http://127.0.0.1:${actualPort}`;
    console.log(`Zhiyue：${url}`);
    if(process.env.ZHIYUE_URL)console.log(`ZHIYUE_URL=${url}`);
    if(process.argv.includes('--open-browser')){
      const command=process.platform==='win32'?'powershell.exe':process.platform==='darwin'?'open':'xdg-open';
      const args=process.platform==='win32'?['-NoProfile','-NonInteractive','-Command',`Start-Process '${url}'`]:[url];
      const opener=spawn(command,args,{shell:false,windowsHide:true,stdio:'ignore'});
      opener.on('error',()=>console.warn(`请在浏览器中打开 ${url}`));opener.unref();
    }
  });
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));
  return app;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await startServer();
