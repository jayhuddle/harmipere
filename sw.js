// Ainult äpi enda failid: võrk eelkõige, vahemälu varuks. API, fondid ja Google'i login lähevad otse võrku.
const CACHE='pere-shell-v2',FILES=['./','index.html','config.js','manifest.webmanifest','manifest-dark.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key!=='pere-share').map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
// Äpi push (FCM data-only sõnum {title, body, url, tag}): kuva teade; koputus avab äpi.
self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?event.data.json():{};}catch(_){try{payload={data:{body:event.data.text()}};}catch(__){}}
 const data=payload.data||{},note=payload.notification||{};
 event.waitUntil(self.registration.showNotification(data.title||note.title||'Härmipere',{body:data.body||note.body||'',icon:'icons/icon-192.png',badge:'icons/badge-96.png',tag:data.tag||'pere',data:{url:data.url||'./'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL((event.notification.data&&event.notification.data.url)||'./',self.registration.scope).href;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const client of list){if(client.url.startsWith(self.registration.scope)&&'focus' in client)return client.focus();}return self.clients.openWindow(target);}));
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 // „Jaga → Härmipere”: hoia jagatud failid ja tekst ajutiselt vahemälus, leht võtab need sealt (kuni 3 faili).
 if(request.method==='POST'&&url.origin===self.location.origin&&url.pathname.endsWith('/share-target')){
  event.respondWith((async()=>{
   try{
    const form=await request.formData();
    const files=form.getAll('files').filter(file=>file&&typeof file!=='string'&&file.size);
    const text=['title','text','url'].map(key=>form.get(key)).filter(value=>typeof value==='string'&&value.trim()).join('\n');
    await caches.delete('pere-share');const cache=await caches.open('pere-share');
    await Promise.all(files.slice(0,3).map((file,index)=>cache.put('share/file-'+index,new Response(file,{headers:{'Content-Type':file.type||'application/octet-stream'}}))));
    await cache.put('share/meta',new Response(JSON.stringify({text:text.slice(0,20000),skipped:files.length>3,
     files:files.slice(0,3).map((file,index)=>({key:'share/file-'+index,name:file.name,type:file.type}))}),{headers:{'Content-Type':'application/json'}}));
   }catch(_){}
   return Response.redirect(new URL('./?share=1',self.registration.scope).href,303);
  })());
  return;
 }
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 // cache:'no-cache' sunnib serverist üle küsima (GitHub Pages lubab muidu 10 min vana koopiat).
 event.respondWith(fetch(request,{cache:'no-cache'}).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;})
  .catch(()=>caches.match(request).then(hit=>hit||caches.match('index.html'))));
});
