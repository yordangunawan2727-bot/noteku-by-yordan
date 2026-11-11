(function(){
var KEY="noteku:web:v1";
var GCLIENT=String(window.NOTEKU_GOOGLE_CLIENT_ID||"").trim(),GSCOPE="openid email profile https://www.googleapis.com/auth/drive.appdata",gtok="",gexp=0;
var COLORS=["ungu","biru","hijau","oranye","merah","abu"];
var $=function(i){return document.getElementById(i)};
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function sample(){
  var t=Date.now();
  return{theme:"system",tasks:[],dayIcons:{},
    cats:[{id:"pribadi",name:"Pribadi"},{id:"kerja",name:"Kerja"},{id:"belanja",name:"Belanja"},{id:"ide",name:"Ide"}],
    notes:[
      {id:uid(),title:"Selamat datang di NoteKu By Yordan",content:"Ketuk catatan untuk mengubahnya. Ketuk + untuk membuat catatan baru.",color:"ungu",category:"pribadi",favorite:true,checklist:[],createdAt:t,updatedAt:t},
      {id:uid(),title:"Belanja mingguan",content:"",color:"hijau",category:"belanja",favorite:false,checklist:[{id:uid(),text:"Beras",done:true},{id:uid(),text:"Telur",done:false},{id:uid(),text:"Sayur",done:false}],createdAt:t-1,updatedAt:t-1}
    ]};
}
var S;
try{var r=JSON.parse(localStorage.getItem(KEY));S=(r&&Array.isArray(r.notes)&&Array.isArray(r.cats))?r:sample();}catch(e){S=sample();}
S.tasks=S.tasks||[];S.dayIcons=S.dayIcons||{};
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){toast("Penyimpanan penuh. Hapus rekaman atau data lama.");}}


var view="catatan",q="",cf="Semua",ed=null,armed=false,sel=[],vis=[],lp=false,lpT=null,sx=0,sy=0,tt=null,hist=false,skipPop=false,tmpPhoto=null;
function catName(id){var c=S.cats.filter(function(x){return x.id===id})[0];return c?c.name:"Tanpa kategori";}
function fmt(t){try{return new Date(t).toLocaleDateString("id-ID",{day:"numeric",month:"short"});}catch(e){return "";}}

function renderList(){
  var l=$("list");if(!l)return;
  var s=q.trim().toLowerCase();
  var items=S.notes.filter(function(n){
    if(view==="kalender")return nd(n)===calSel;
    if(view==="favorit"&&!n.favorite)return false;
    if(cf==="__fav"){if(!n.favorite)return false;}else if(cf!=="Semua"&&n.category!==cf)return false;
    if(!s)return true;
    return (n.title+" "+n.content+" "+n.checklist.map(function(c){return c.text}).join(" ")).toLowerCase().indexOf(s)>-1;
  }).sort(function(a,b){
    if(S.sort==="lama")return a.updatedAt-b.updatedAt;
    if(S.sort==="az")return (a.title||"").toLowerCase().localeCompare((b.title||"").toLowerCase(),"id");
    return b.updatedAt-a.updatedAt;
  });
  vis=items.map(function(n){return n.id});
  if(!items.length){l.innerHTML='<div class="empty">'+(s?"Tidak ada catatan yang cocok.":view==="kalender"?"Belum ada catatan di tanggal ini. Ketuk + untuk menambah.":view==="favorit"?"Belum ada favorit. Tandai catatan dengan bintang.":"Belum ada catatan. Ketuk + untuk membuat yang pertama.")+'</div>';return;}
  l.innerHTML='<div class="grid'+(S.view==="list"?" lst":"")+'">'+items.map(function(n){
    var done=n.checklist.filter(function(c){return c.done}).length;
    return '<button class="card'+(sel.indexOf(n.id)>-1?" sel":"")+'" data-a="open" data-id="'+n.id+'" style="background:var(--c-'+n.color+')"><h3>'+(sel.indexOf(n.id)>-1?"✓ ":"")+(n.favorite?"★ ":"")+esc(n.title||"Tanpa judul")+'</h3>'+(n.content?'<p>'+esc(n.content)+'</p>':'')+(n.checklist.length?'<p>'+done+'/'+n.checklist.length+' tugas selesai</p>':'')+'<div class="meta"><span>'+esc(catName(n.category))+(n.audio&&n.audio.length?" \uD83C\uDF99":"")+'</span><span>'+fmt(n.updatedAt)+'</span></div></button>';
  }).join("")+'</div>';
}
function vNotes(){
  var chips=["Semua","__fav"].concat(S.cats.map(function(c){return c.id}));
  return '<input class="search" id="q" type="search" placeholder="Cari catatan" value="'+esc(q)+'" aria-label="Cari catatan">'+
  '<div class="tools"><select id="so" aria-label="Urutkan">'+[["baru","Terbaru"],["lama","Terlama"],["az","A sampai Z"]].map(function(o){return '<option value="'+o[0]+'"'+((S.sort||"baru")===o[0]?" selected":"")+'>'+o[1]+'</option>'}).join("")+'</select><button data-a="view" aria-label="Ganti tampilan">'+(S.view==="list"?"Tampilan grid":"Tampilan list")+'</button></div>'+
  '<div class="chips">'+chips.map(function(c){return '<button class="chip'+(c===cf?' on':'')+'" data-a="chip" data-c="'+esc(c)+'">'+esc(c==="Semua"?c:c==="__fav"?"★ Favorit":catName(c))+'</button>'}).join("")+'</div><div id="list"></div>';
}
function vCats(){
  return '<div class="row" style="margin-top:0"><input class="search" id="nc" placeholder="Nama kategori baru" style="flex:1;margin:0" aria-label="Nama kategori baru"><button class="btn" data-a="addcat">Tambah</button></div><h4>Kategori kamu</h4><div class="list"><div class="it"><span data-a="gofav" style="flex:1;cursor:pointer">★ Favorit <span class="small">('+S.notes.filter(function(n){return n.favorite}).length+' catatan)</span></span></div>'+
  S.cats.map(function(c){var n=S.notes.filter(function(x){return x.category===c.id}).length;return '<div class="it"><span data-a="gocat" data-id="'+c.id+'" style="flex:1;cursor:pointer">'+esc(c.name)+' <span class="small">('+n+' catatan)</span></span><span style="display:flex;gap:14px"><button data-a="rencat" data-id="'+c.id+'" style="color:var(--accent)">Ubah</button><button data-a="delcat" data-id="'+c.id+'">Hapus</button></span></div>'}).join("")+'</div>';
}
function vSet(){
  var tasks=S.tasks.length+S.notes.reduce(function(a,n){return a+n.checklist.length},0),favs=S.notes.filter(function(n){return n.favorite}).length;
  return profileCard()+'<div class="stats"><div><b>'+S.notes.length+'</b>Catatan</div><div><b>'+favs+'</b>Favorit</div><div><b>'+S.cats.length+'</b>Kategori</div><div><b>'+tasks+'</b>Tugas</div></div>'+
  '<h4>Tampilan</h4><div class="themes">'+[["light","Terang"],["dark","Gelap"],["system","Sistem"]].map(function(t){return '<button data-a="theme" data-t="'+t[0]+'" class="'+(S.theme===t[0]?"on":"")+'">'+t[1]+'</button>'}).join("")+'</div>'+
  (dip?'<h4>Aplikasi</h4><button class="btn block" data-a="install">Pasang NoteKu By Yordan di layar utama</button>':'')+'<h4>Warna aksen</h4>'+accHtml()+'<h4>Font</h4>'+fontHtml()+'<h4>Keamanan</h4>'+pinHtml()+'<h4>Data</h4><p class="small">Catatan tersimpan di browser perangkat ini. Menghapus data browser akan menghapus catatan, jadi simpan backup secara berkala. Sinkron antar perangkat segera hadir.</p><div class="row" style="margin:0 0 10px"><button class="btn ghost" style="flex:1" data-a="exp">Salin backup</button><button class="btn ghost" style="flex:1" data-a="imp">Pulihkan</button></div>'+gHtml()+'<button class="btn danger block" data-a="reset">'+(armed?"Ketuk lagi untuk hapus semua":"Hapus semua data")+'</button>';
}
function chrome(){
  sel=sel.filter(function(id){return S.notes.some(function(n){return n.id===id})});
  var on=sel.length>0,b=$("badge");
  $("ttl").textContent=on?sel.length+" dipilih":{catatan:"Catatan",favorit:"Favorit",kategori:"Kategori",kalender:"Kalender",pengaturan:"Pengaturan"}[view];
  if(on){b.style.display="";b.textContent="Batal";b.setAttribute("data-a","selclear");}
  else{b.style.display="none";}
  $("nav").style.display=on?"none":"";
  var sb=$("selbar");sb.style.display=on?"flex":"none";
  if(on)sb.innerHTML=[["selall","✅","Semua"],["selfav","⭐","Favorit"],["selcopy","📋","Salin"],["selshare","📤","Bagikan"],["selcat","📁","Pindah"],["seldel","🗑️",armed?"Yakin?":"Hapus"]].map(function(x){return '<button data-a="'+x[0]+'"'+(x[0]==="seldel"?' style="color:var(--danger)"':'')+'><i>'+x[1]+'</i>'+x[2]+'</button>'}).join("");
}
function R(){
  chrome();
  
  document.querySelectorAll("#nav [data-v]").forEach(function(x){x.classList.toggle("on",x.getAttribute("data-v")===view)});
  $("main").innerHTML=view==="kategori"?vCats():view==="pengaturan"?vSet():view==="kalender"?vCal():vNotes();
  renderList();
}

function openSheet(h){$("m").classList.remove("full");$("sheet").innerHTML=h;$("m").classList.add("open");pushH();}
function openFull(h){$("sheet").innerHTML=h;$("m").classList.add("open","full");pushH();if(ed)renderAudio();}
function closeSheet(){$("m").classList.remove("open","full");ed=null;if(hist){hist=false;skipPop=true;setTimeout(function(){skipPop=false},600);try{history.back();}catch(e){skipPop=false;}}}
function openEditor(id,date){
  var n=id?S.notes.filter(function(x){return x.id===id})[0]:null;
  var isNew=!n;
  n=n||{date:date||"",title:"",content:"",color:"ungu",category:S.cats.length?S.cats[0].id:"",favorite:false,checklist:[]};
  ed={id:id,color:n.color,fav:n.favorite,date:n.date||"",checklist:(n.checklist||[]).slice(),isNew:isNew,audio:(n.audio||[]).slice()};armed=false;
  openFull('<div class="edtop"><button class="back" data-a="back" aria-label="Selesai dan simpan">\u2713<span style="font-size:.8rem;font-weight:600"> Simpan</span></button><input id="et" class="etitle" placeholder="Judul" value="'+esc(n.title)+'" aria-label="Judul"><div class="cwrap"><button class="cbtn" id="cb" data-a="cpick" style="background:var(--c-'+n.color+')" aria-label="Pilih warna"></button><div class="cpop" id="cp">'+COLORS.map(function(c){return '<button class="dot'+(c===n.color?" on":"")+'" data-a="color" data-c="'+c+'" style="background:var(--c-'+c+')" aria-label="Warna '+c+'"></button>'}).join("")+'</div></div><button class="ic" data-a="edfav" id="efv" aria-label="Favorit">'+(n.favorite?"★":"☆")+'</button>'+(isNew?"":'<button class="ic" data-a="del" id="ed" aria-label="Hapus" style="color:var(--danger)">\uD83D\uDDD1\uFE0F</button>')+'</div>'+
  '<select id="ec" aria-label="Kategori">'+S.cats.map(function(c){return '<option value="'+c.id+'"'+(c.id===n.category?" selected":"")+'>'+esc(c.name)+'</option>'}).join("")+'<option value=""'+(n.category===""?" selected":"")+'>Tanpa kategori</option></select>'+
  '<label class="small" for="edt" style="display:block;margin-bottom:4px">Tanggal di kalender</label><input id="edt" type="date" value="'+esc(n.date||"")+'">'+
  '<textarea id="eb" placeholder="Tulis catatan di sini" aria-label="Isi catatan">'+esc(n.content)+'</textarea>'+
  '<button class="btn ghost" data-a="rec" id="rb">\uD83C\uDF99 Rekam suara</button><div id="au"></div>');
}
function saveNote(){
  var title=$("et").value.trim(),content=$("eb").value.trim();
  abortRec();
  if(!title&&!content&&!ed.checklist.length&&!ed.audio.length){closeSheet();return;}
  var now=Date.now(),cat=$("ec").value,dt=($("edt")&&$("edt").value)||"";
  if(ed.id){var n=S.notes.filter(function(x){return x.id===ed.id})[0];if(n){n.title=title;n.content=content;n.category=cat;n.date=dt;n.audio=ed.audio;n.color=ed.color;n.favorite=ed.fav;n.checklist=ed.checklist;n.updatedAt=now;}}
  else S.notes.unshift({id:uid(),date:dt,audio:ed.audio,title:title,content:content,color:ed.color,category:cat,favorite:ed.fav,checklist:ed.checklist,createdAt:now,updatedAt:now});
  save();closeSheet();R();
}
var MN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function ds(y,m,d){return y+"-"+(m+1<10?"0":"")+(m+1)+"-"+(d<10?"0":"")+d;}
function todayStr(){var d=new Date();return ds(d.getFullYear(),d.getMonth(),d.getDate());}
function nd(n){if(n.date)return n.date;if(!n.createdAt)return"";var d=new Date(n.createdAt);return ds(d.getFullYear(),d.getMonth(),d.getDate());}
var calY=new Date().getFullYear(),calM=new Date().getMonth(),calSel=todayStr();
function vCal(){
  var start=new Date(calY,calM,1).getDay(),today=todayStr(),by={};
  S.notes.forEach(function(n){var k=nd(n);if(k){by[k]=(by[k]||0)+1;}});
  S.tasks.forEach(function(t){if(!t.done)by[t.date]=(by[t.date]||0)+1;});
  var h='<div class="calh"><button data-a="calprev" aria-label="Bulan sebelumnya">◀</button><b>'+MN[calM]+' '+calY+'</b><button data-a="calnext" aria-label="Bulan berikutnya">▶</button></div><div class="calg">';
  ["MIN","SEN","SEL","RAB","KAM","JUM","SAB"].forEach(function(d,i){h+='<div class="dow'+(i===0?" sun":i===6?" sat":"")+'">'+d+'</div>';});
  for(var i=0;i<42;i++){
    var dt=new Date(calY,calM,1-start+i),s=ds(dt.getFullYear(),dt.getMonth(),dt.getDate()),dw=dt.getDay(),c=by[s]||0,dots="",ic=S.dayIcons[s];
    for(var k=0;k<Math.min(c,3);k++)dots+="<i></i>";
    h+='<button class="day'+(dt.getMonth()!==calM?" oth":"")+(dw===0?" sun":dw===6?" sat":"")+(s===today?" today":"")+(s===calSel?" selc":"")+'" data-a="day" data-d="'+s+'"><span>'+dt.getDate()+'</span>'+(ic?'<span class="ico">'+esc(ic.e)+'</span>':'')+'<span class="dots">'+dots+'</span></button>';
  }
  var p=calSel.split("-"),title=new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  return h+'</div><h4>'+esc(title)+'</h4>'+dayPanel()+'<h4>Catatan</h4><div id="list"></div>';
}
var ICONS=["🎂","🎉","🎁","❤️","⭐","✈️","🏖️","🎄","🕌","⛪","🎓","📝","📚","💼","💊","🦷","⚽","🛒","🚗","🏠","🎬","🍽️","💰","📌"];
function dayPanel(){
  var ic=S.dayIcons[calSel],ts=S.tasks.filter(function(t){return t.date===calSel});
  return '<div class="box"><div class="row" style="margin:0 0 10px"><span>'+(ic?'<span style="font-size:1.6rem">'+esc(ic.e)+'</span> <b>'+esc(ic.t||"")+'</b>':'<span class="small">Belum ada ikon untuk tanggal ini</span>')+'</span><button class="btn ghost" data-a="dayicon">'+(ic?"Ubah ikon":"+ Ikon")+'</button></div>'+
  '<b>Tugas</b>'+
  ts.map(function(t){return '<div class="cli"><input type="checkbox" data-a="tkdone" data-id="'+t.id+'"'+(t.done?" checked":"")+' aria-label="Selesai"><span style="flex:1;'+(t.done?'text-decoration:line-through;color:var(--muted)':'')+'">'+esc(t.text)+'</span><button data-a="tkdel" data-id="'+t.id+'" aria-label="Hapus item">×</button></div>'}).join("")+
  '<div style="display:flex;gap:8px;margin-top:8px"><input class="search" id="tkn" placeholder="Tambah tugas" aria-label="Tugas baru" style="margin:0;flex:1;min-width:0"><button class="btn" data-a="tkadd">Tambah</button></div></div>';
}
function addTask(){var v=$("tkn").value.trim();if(!v)return;S.tasks.push({id:uid(),date:calSel,text:v,done:false});save();R();var x=$("tkn");if(x)x.focus();}
function openIcon(){
  var cur=S.dayIcons[calSel]||{e:"",t:""};
  openSheet('<h2>Ikon tanggal</h2><div class="icg">'+ICONS.map(function(e){return '<button data-a="pickico" data-e="'+e+'" class="'+(cur.e===e?"on":"")+'">'+e+'</button>'}).join("")+'</div><input id="ict" placeholder="Keterangan (misal: Ulang tahun Andi)" maxlength="60" value="'+esc(cur.t)+'" aria-label="Keterangan"><div style="display:flex;gap:8px;margin-bottom:10px"><input id="ice" placeholder="Atau ketik emoji sendiri" maxlength="8" style="margin:0;flex:1" aria-label="Emoji sendiri"><button class="btn" data-a="customico">Pakai</button></div><p class="small">Ketuk ikon untuk memasangnya di tanggal ini.</p><div class="row"><button class="btn danger" data-a="delico">Hapus ikon</button><button class="btn ghost" data-a="close">Batal</button></div>');
}
function initials(){var n=(S.profile&&S.profile.name)||"";return n?n.trim().charAt(0).toUpperCase():"?";}
function avatar(sz,photo){
  if(photo&&String(photo).indexOf("data:image/")===0)return '<img src="'+photo+'" alt="Foto profil" style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;object-fit:cover;flex:none">';
  return '<span class="av" style="width:'+sz+'px;height:'+sz+'px;font-size:'+Math.round(sz/2.2)+'px">'+esc(initials())+'</span>';
}
function profileCard(){
  var p=S.profile||{};
  return '<button class="box prof" data-a="prof" aria-label="Buka profil">'+avatar(56,p.photo)+'<div><b>'+esc(p.name||"Atur profil")+'</b><br><span class="small">'+esc(p.email||"Tambahkan email untuk backup")+'</span></div></button>';
}
function openProfile(){
  var p=S.profile||{};tmpPhoto=null;
  openSheet('<h2>Profil</h2><div style="display:flex;align-items:center;gap:14px;margin-bottom:12px"><span id="pav">'+avatar(72,p.photo)+'</span><span class="btn ghost" style="position:relative;overflow:hidden;cursor:pointer">Pilih foto<input id="pf" type="file" accept="image/*" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;margin:0;padding:0;border:0"></span></div><input id="pn" placeholder="Nama" value="'+esc(p.name||"")+'" aria-label="Nama"><input id="pe" type="email" placeholder="Email untuk backup" value="'+esc(p.email||"")+'" aria-label="Email untuk backup"><p class="small">Profil hanya tersimpan di perangkat ini. '+(S.g?"Akun Google terhubung: "+esc(S.g.email)+". ":"Email belum diverifikasi karena belum ada login Google. ")+'Email ini hanya dipakai sebagai tujuan saat kamu mengirim backup lewat Gmail.</p><div class="row"><button class="btn ghost" data-a="close">Batal</button><div class="g">'+(p.photo?'<button class="btn danger" data-a="delphoto">Hapus foto</button>':'')+'<button class="btn" data-a="saveprof">Simpan</button></div></div>');
}
function pickPhoto(f){
  if(!f)return;
  var r=new FileReader();
  r.onload=function(){var im=new Image();im.onerror=function(){toast("Foto tidak bisa dibaca")};im.onload=function(){
    var s=Math.min(240/im.width,240/im.height,1),c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));
    c.getContext("2d").drawImage(im,0,0,c.width,c.height);
    tmpPhoto=c.toDataURL("image/jpeg",0.8);
    $("pav").innerHTML=avatar(72,tmpPhoto);
  };im.src=r.result;};
  r.readAsDataURL(f);
}
function saveProf(){
  var p=S.profile||{};
  p.name=$("pn").value.trim();p.email=$("pe").value.trim();
  if(tmpPhoto!==null)p.photo=tmpPhoto;
  S.profile=p;tmpPhoto=null;save();closeSheet();R();
}
function gmailBackup(data){
  var em=(S.profile&&S.profile.email)||"",b=encodeURIComponent(data),long=b.length>5000;
  var url="https://mail.google.com/mail/?view=cm&fs=1&su=Backup%20NoteKu%20By%20Yordan"+(em?"&to="+encodeURIComponent(em):"")+(long?"":"&body="+b);
  return '<a class="btn ghost" style="display:block;text-align:center;text-decoration:none;margin-bottom:8px" href="'+url+'" target="_blank" rel="noopener">Kirim backup ke Gmail'+(em?" ("+esc(em)+")":"")+'</a>'+(long?'<p class="small">Data terlalu panjang untuk dikirim otomatis. Ketuk Salin teks dulu, lalu tempel di isi email.</p>':'');
}
function toggleSel(id){var i=sel.indexOf(id);if(i>-1)sel.splice(i,1);else{sel.push(id);try{if(navigator.vibrate)navigator.vibrate(60);}catch(x){}}armed=false;chrome();renderList();}
function selNotes(){return S.notes.filter(function(n){return sel.indexOf(n.id)>-1});}
function noteText(n){
  var t=(n.title?n.title+"\n":"")+(n.content||"");
  if(n.checklist.length)t+=(t?"\n":"")+n.checklist.map(function(c){return (c.done?"[x] ":"[ ] ")+c.text}).join("\n");
  return t.trim();
}
function selText(){return selNotes().map(noteText).join("\n\n---\n\n");}
function toast(m){var t=$("toast");t.textContent=m;t.style.display="block";clearTimeout(tt);tt=setTimeout(function(){t.style.display="none"},2200);}
function copyText(txt,done){
  var ok=false,ta=document.createElement("textarea");
  ta.value=txt;ta.style.cssText="position:fixed;opacity:0;top:0";document.body.appendChild(ta);ta.select();
  try{ok=document.execCommand("copy");}catch(e){}
  document.body.removeChild(ta);
  if(ok){done(true);return;}
  if(navigator.clipboard){navigator.clipboard.writeText(txt).then(function(){done(true)},function(){done(false)});return;}
  done(false);
}
function selCopy(){var n=sel.length;copyText(selText(),function(ok){toast(ok?n+" catatan disalin":"Gagal menyalin");if(ok){sel=[];chrome();renderList();}});}
function shareLinks(txt){
  var e=encodeURIComponent(txt),s=function(h,i,l){return '<a class="shb" href="'+h+'" target="_blank" rel="noopener"><i>'+i+'</i>'+l+'</a>'};
  return '<div class="shg">'+s("https://wa.me/?text="+e,"💬","WhatsApp")+s("https://t.me/share/url?url=%20&text="+e,"✈️","Telegram")+s("https://mail.google.com/mail/?view=cm&fs=1&su=Catatan%20NoteKu%20By%20Yordan&body="+e,"✉️","Gmail")+'<button class="shb" data-a="sms"><i>📱</i>SMS</button>'+'<button class="shb
