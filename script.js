// ---------- KONFIG ----------
const ACCOUNTS = ["LijoDEV","EliasVD","Fred","Vale"];
const API_URL = "https://api.npoint.io/d062cc89b62071cf12ba"; // dein npoint (api.npoint.io/ID)
const POLL_MS = 3000; // wie oft nach neuen Snaps geschaut wird
// ---------- Login / Seite initialisieren ----------
function initPage(){
  const user = localStorage.getItem("loggedInUser");
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  document.getElementById("userLabel").textContent = user;
  document.getElementById("welcome").textContent = "👋 Willkommen, " + user + "!";
  wireUI();
  startCam(document.getElementById('cam')).catch(()=>{});
  renderInbox(); // lädt lokale Ansicht
  pollInbox(); // startet Polling
}
// falls nicht eingeloggt (login.html ruft diese)
function loginUser(){
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const error = document.getElementById("error");
  const users = {"LijoDEV":"buddy260313","EliasVD":"123456789101112","Fred":"YoMama","Vale":"Rocky"};
  if (users[username] && users[username] === password){
    localStorage.setItem("loggedInUser", username);
    window.location.href = "index.html";
  } else {
    error.textContent = "❌ Benutzername oder Passwort falsch!";
  }
}
function checkLogin(){
  const u = localStorage.getItem("loggedInUser");
  return !!u;
}
function logoutUser(){
  localStorage.removeItem("loggedInUser");
  window.location.href = "login.html";
}
// ---------- Kamera ----------
async function startCam(videoEl){
  const s = await navigator.mediaDevices.getUserMedia({video:true, audio:false});
  videoEl.srcObject = s;
  return s;
}
// ---------- UI-Wiring ----------
function wireUI(){
  const filterSelect = document.getElementById('filterSelect');
  const textInput = document.getElementById('textInput');
  filterSelect.onchange = ()=> { textInput.style.display = filterSelect.value === 'text' ? 'inline-block' : 'none'; };
  document.getElementById('snapBtn').onclick = takeAndOpenSendModal;
  document.getElementById('cancelSend').onclick = ()=>{ document.getElementById('sendModal').style.display='none'; };
  document.getElementById('confirmSend').onclick = confirmSend;
  document.getElementById('closeBtn').onclick = closeViewer;
  document.getElementById('replyBtn').onclick = startReplyFlow;
  document.getElementById('cancelReply').onclick = cancelReply;
  document.getElementById('sendReply').onclick = sendReply;
}
// ---------- Helper: Canvas / Filter ----------
const tempCanvas = document.createElement('canvas');
function applyFilterToContext(ctx,w,h,filter){
  if(filter === 'text'){
    const txt = (document.getElementById('textInput').value || '✨ MiniSnap!').slice(0,40);
    ctx.font = `${Math.floor(h/15)}px Comic Sans MS, Arial`;
    ctx.fillStyle = 'yellow';
    ctx.fillText(txt,20,h-30);
    return;
  }
  if(filter === 'blackwhite' || filter === 'invert' || filter === 'sepia'){
    const imgData = ctx.getImageData(0,0,w,h);
    const d = imgData.data;
    for(let i=0;i<d.length;i+=4){
      const r=d[i],g=d[i+1],b=d[i+2];
      if(filter==='blackwhite'){
        const avg = (r+g+b)/3; d[i]=d[i+1]=d[i+2]=avg;
      } else if(filter==='invert'){
        d[i]=255-r; d[i+1]=255-g; d[i+2]=255-b;
      } else if(filter==='sepia'){
        d[i]   = Math.min(255, r*0.393 + g*0.769 + b*0.189);
        d[i+1] = Math.min(255, r*0.349 + g*0.686 + b*0.168);
        d[i+2] = Math.min(255, r*0.272 + g*0.534 + b*0.131);
      }
    }
    ctx.putImageData(imgData,0,0);
    return;
  }
  if(filter === 'blur'){
    ctx.filter = 'blur(4px)';
    ctx.drawImage(tempCanvas,0,0,w,h);
    ctx.filter = 'none';
    return;
  }
  if(filter === 'sunglasses'){
    // einfache Sonnenbrille: 2 ovale dunkle Gläser + Steg
    const glassW = Math.floor(w*0.28);
    const glassH = Math.floor(h*0.12);
    const centerY = Math.floor(h*0.38);
    const leftX = Math.floor(w*0.32);
    const rightX = leftX + Math.floor(w*0.28) + 8;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    roundRect(ctx,leftX,centerY-glassH/2,glassW,glassH,glassH/2,true,false);
    roundRect(ctx,rightX,centerY-glassH/2,glassW,glassH,glassH/2,true,false);
    ctx.fillStyle = 'rgba(60,60,60,0.6)';
    ctx.fillRect(leftX+glassW-8,centerY-3, (rightX)-(leftX+glassW-8)+8,6); // stegbereich
    return;
  }
  // Farbüberlagerung
  const colors = {
    red: 'rgba(255,0,0,0.25)',
    blue: 'rgba(0,0,255,0.25)',
    yellow: 'rgba(255,255,0,0.25)',
    pink: 'rgba(255,105,180,0.25)',
    green: 'rgba(0,255,100,0.25)'
  };
  if(colors[filter]){
    ctx.fillStyle = colors[filter];
    ctx.fillRect(0,0,w,h);
  }
}
function roundRect(ctx,x,y,w,h,r,fill,stroke){
  if (r===undefined) r=5;
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
  if(fill) ctx.fill();
  if(stroke) ctx.stroke();
}
// take photo from video, returns dataURL
function takePhotoFrom(videoEl){
  const w = videoEl.videoWidth || 640;
  const h = videoEl.videoHeight || 480;
  const canvas = document.getElementById('photo');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl,0,0,w,h);
  // keep a copy on tempCanvas for some filters (blur)
  tempCanvas.width = w; tempCanvas.height = h;
  tempCanvas.getContext('2d').drawImage(canvas,0,0);
  const filter = document.getElementById('filterSelect').value;
  if(filter && filter !== 'none'){
    applyFilterToContext(ctx,w,h,filter);
  }
  return canvas.toDataURL('image/jpeg',0.9);
}
// ---------- Online: npoint helpers ----------
// read db
async function readDB(){
  try{
    const r = await fetch(API_URL);
    return await r.json();
  }catch(e){
    console.error("readDB error",e);
    return {};
  }
}
// write db (PUT)
async function writeDB(obj){
  try{
    await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj)
    });
  }catch(e){ console.error("writeDB error",e); }
}
// send snap to multiple recipients
async function sendSnapTo(recipients, imgData){
  const sender = localStorage.getItem('loggedInUser');
  if(!sender) return alert("Nicht eingeloggt.");
  const db = await readDB();
  if(!db.snaps) db.snaps = [];
  const id = Date.now() + "-" + Math.floor(Math.random()*10000);
  recipients.forEach(r => {
    db.snaps.push({ id, from: sender, to: r, img: imgData, time: new Date().toISOString() });
  });
  await writeDB(db);
}
// fetch snaps for current user
async function fetchSnapsForUser(){
  const user = localStorage.getItem('loggedInUser');
  if(!user) return [];
  const db = await readDB();
  if(!db.snaps) return [];
  return db.snaps.filter(s => s.to === user);
}
// delete snap by id for a receiver (removes that entry)
async function deleteSnapForReceiver(id, receiver){
  const db = await readDB();
  if(!db.snaps) db.snaps = [];
  db.snaps = db.snaps.filter(s => !(s.id === id && s.to === receiver));
  await writeDB(db);
}
// ---------- Send modal flow ----------
let lastTakenImg = null;
function takeAndOpenSendModal(){
  const cam = document.getElementById('cam');
  const w = cam.videoWidth;
  const h = cam.videoHeight;
  if(!w||!h) return alert("Warte bis Kamera bereit ist.");
  const img = takePhotoFrom(cam);
  lastTakenImg = img;
  document.getElementById('sendPreview').innerHTML = `<img src="${img}" style="width:120px;border-radius:8px">`;
  // populate recipients
  const logged = localStorage.getItem('loggedInUser');
  const list = document.getElementById('sendList'); list.innerHTML = "";
  ACCOUNTS.forEach(a=>{
    if(a===logged) return;
    const div = document.createElement('label'); div.className='recipient';
    div.innerHTML = `<input type="checkbox" value="${a}"> <span style="font-weight:700">${a}</span>`;
    list.appendChild(div);
  });
  document.getElementById('sendModal').style.display='flex';
}
async function confirmSend(){
  const list = Array.from(document.querySelectorAll('#sendList input[type=checkbox]'));
  const selected = list.filter(i=>i.checked).map(i=>i.value);
  if(selected.length===0) return alert("Wähle mindestens einen Empfänger.");
  await sendSnapTo(selected, lastTakenImg);
  document.getElementById('sendModal').style.display='none';
  alert("Snap gesendet ✔️");
  renderInbox(); // refresh local view
}
// ---------- Inbox rendering & polling ----------
let lastInbox = [];
async function renderInbox(){
  const container = document.getElementById('inbox');
  container.innerHTML = '<div class="small">Lade...</div>';
  const snaps = await fetchSnapsForUser();
  lastInbox = snaps;
  if(snaps.length===0){
    container.innerHTML = '<div class="small">Keine Snaps — sende einen an deine Freunde!</div>';
    return;
  }
  container.innerHTML = '';
  snaps.slice().reverse().forEach(snap=>{
    const div = document.createElement('div'); div.className='snap-item';
    const img = document.createElement('img'); img.src = snap.img; img.className='thumb';
    const meta = document.createElement('div'); meta.style.flex='1';
    meta.innerHTML = `<div><strong>Von ${snap.from}</strong></div><div class="small">${new Date(snap.time).toLocaleString()}</div>`;
    const open = document.createElement('button'); open.className='open'; open.textContent='Öffnen';
    open.onclick = ()=>openSnapById(snap.id);
    div.appendChild(img); div.appendChild(meta); div.appendChild(open);
    container.appendChild(div);
  });
}
// polling
let pollInterval = null;
function pollInbox(){
  renderInbox();
  if(pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(renderInbox, POLL_MS);
}
// ---------- Open / view / delete / reply ----------
function openSnapById(id){
  const snap = lastInbox.find(s=>s.id===id);
  if(!snap) return alert("Snap nicht gefunden.");
  document.getElementById('viewImg').src = snap.img;
  document.getElementById('viewer').style.display='flex';
  document.getElementById('viewer').dataset.currentSnapId = id;
  let t = 3; document.getElementById('timer').textContent = t;
  const iv = setInterval(()=>{
    t--; document.getElementById('timer').textContent = t;
    if(t<=0){
      clearInterval(iv);
      closeViewer();
      // delete from server for this receiver
      const user = localStorage.getItem('loggedInUser');
      deleteSnapForReceiver(id,user).then(()=>renderInbox());
    }
  },1000);
}
function closeViewer(){
  const id = document.getElementById('viewer').dataset.currentSnapId;
  document.getElementById('viewer').style.display='none';
  if(id){
    const user = localStorage.getItem('loggedInUser');
    // delete if still exists (closing early counts as seen)
    deleteSnapForReceiver(id,user).then(()=>renderInbox());
  }
}
// reply flow
let replyStream = null;
async function startReplyFlow(){
  const id = document.getElementById('viewer').dataset.currentSnapId;
  if(!id) return;
  // find snap to know who to reply to
  const snap = lastInbox.find(s=>s.id===id);
  if(!snap) return alert("Snap nicht gefunden.");
  const to = snap.from;
  document.getElementById('replyToLabel').textContent = to;
  document.getElementById('replyModal').dataset.to = to;
  document.getElementById('replyModal').style.display='flex';
  try{
    replyStream = await startCam(document.getElementById('replyCam'));
  }catch(e){
    document.getElementById('replyModal').style.display='none';
    alert("Kamera für Reply nicht verfügbar.");
  }
}
function cancelReply(){
  document.getElementById('replyModal').style.display='none';
  if(replyStream){ replyStream.getTracks().forEach(t=>t.stop()); replyStream=null; document.getElementById('replyCam').srcObject=null; }
}
async function sendReply(){
  const to = document.getElementById('replyModal').dataset.to;
  if(!to) return;
  // take image from replyCam
  const video = document.getElementById('replyCam');
  const w = video.videoWidth || 640; const h = video.videoHeight || 480;
  const canvas = document.getElementById('photo'); canvas.width=w; canvas.height=h;
  const ctx = canvas.getContext('2d'); ctx.drawImage(video,0,0,w,h);
  // mark as reply
  ctx.font = `${Math.floor(h/18)}px Arial`; ctx.fillStyle='white'; ctx.fillText('Reply',20,40);
  const img = canvas.toDataURL('image/jpeg',0.9);
  // send to 'to'
  const sender = localStorage.getItem('loggedInUser');
  const db = await readDB(); if(!db.snaps) db.snaps=[];
  const id2 = Date.now() + "-" + Math.floor(Math.random()*10000);
  db.snaps.push({ id: id2, from: sender, to: to, img: img, time: new Date().toISOString() });
  await writeDB(db);
  cancelReply();
  alert('Antwort gesendet ✔️');
  renderInbox();
}
// ---------- init export for login.html to call ----------
if(typeof window !== 'undefined'){
  window.loginUser = loginUser;
  window.checkLogin = checkLogin;
  window.logoutUser = logoutUser;
}