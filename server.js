// Static development server for NULLBYTE. Game actions never reach real networks or systems.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT)||8080;
const MIME={
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg',
  '.ico':'image/x-icon','.md':'text/markdown; charset=utf-8'
};
const server=http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end('Bad request');return;}
  if(pathname==='/')pathname='/index.html';
  const file=path.resolve(ROOT,`.${pathname}`);
  if(!file.startsWith(ROOT+path.sep)&&file!==ROOT){res.writeHead(403).end('Forbidden');return;}
  fs.stat(file,(error,stat)=>{
    if(error||!stat.isFile()){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Not found');return;}
    res.writeHead(200,{
      'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'strict-origin-when-cross-origin',
      'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':"default-src 'self'; script-src 'self' https://telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
    });
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(PORT,'0.0.0.0',()=>console.log(`NULLBYTE is running at http://localhost:${PORT}`));
