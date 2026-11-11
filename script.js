
(function(){
var KEY="noteku:web:v1";
var COLORS=["ungu","biru","hijau","oranye","merah","abu"];
var $=function(i){return document.getElementById(i)};
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function sample(){
  var t=Date.now();
  return{theme:"system",tasks:[],dayIcons:{},
    cats:[{id:"pribadi",name:"Pribadi"},{id:"kerja",name:"Kerja"},{id:"belanja",name:"Belanja"},{id:"ide",name:"Ide"}],
    notes:[
      {sample:true,id:uid(),title:"Selamat datang di NoteKu By Yordan",content:"Ketuk catatan untuk mengubahnya. Ketuk + untuk membuat catatan baru.",color:"ungu",category:"pribadi",favorite:true,checklist:[],createdAt:t,updatedAt:t},
      {sample:true,id:uid(),title:"Belanja mingguan",content:"",color:"hijau",category:"belanja",favorite:false,checklist:[{id:uid(),text:"Beras",done:true},{id:uid(),text:"Telur",done:false},{id:uid(),text:"Sayur",done:false}],createdAt:t-1,updatedAt:t-1}
    ]};
}
var S;
try{var r=JSON.parse(localStorage.getItem(KEY));S=(r&&Array.isArray(r.notes)&&Array.isArray(r.cats))?r:sample();}catch(e){S=sample();}
S.tasks=S.tasks||[];S.dayIcons=S.dayIcons||{};
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){toast("Penyimpanan penuh. Hapus rekaman atau data lama.");}sbChanged();}


var view="catatan",q="",cf="Semua",ed=null,armed=false,sel=[],vis=[],lp=false,lpT=null,sx=0,sy=0,tt=null,hist=false,skipPop=false,tmpPhoto=null;
function catName(id){var c=S.cats.filter(function(x){return x.id===id})[0];return c?c.name:"Tanpa kategori";}
function fmt(t){try{return new Date(t).toLocaleDateString("id-ID",{day:"numeric",month:"short"});}catch(e){return "";}}

function renderList(){
  var l=$("list");if(!l)return;
  var s=q.trim().toLowerCase();
  var items=S.notes.filter(function(n){
    if(view==="kalender")return n.date===calSel;
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
  S.cats.map(function(c){var n=S.notes.filter(function(x){return x.category===c.id}).length;return '<div class="it"><span data-a="gocat" data-id="'+c.id+'" style="flex:1;cursor:pointer">'+esc(c.name)+' <span class="small">('+n+' catatan)</span></span><button data-a="delcat" data-id="'+c.id+'">Hapus</button></div>'}).join("")+'</div>';
}
function vSet(){
  var tasks=S.notes.reduce(function(a,n){return a+n.checklist.length},0),favs=S.notes.filter(function(n){return n.favorite}).length;
  return profileCard()+accountHtml()+'<div class="stats"><div><b>'+S.notes.length+'</b>Catatan</div><div><b>'+favs+'</b>Favorit</div><div><b>'+S.cats.length+'</b>Kategori</div><div><b>'+tasks+'</b>Tugas</div></div>'+
  '<h4>Tampilan</h4><div class="themes">'+[["light","Terang"],["dark","Gelap"],["system","Sistem"]].map(function(t){return '<button data-a="theme" data-t="'+t[0]+'" class="'+(S.theme===t[0]?"on":"")+'">'+t[1]+'</button>'}).join("")+'</div>'+
  (dip?'<h4>Aplikasi</h4><button class="btn block" data-a="install">Pasang NoteKu By Yordan di layar utama</button>':'')+'<h4>Warna aksen</h4>'+accHtml()+'<h4>Font</h4>'+fontHtml()+'<h4>Keamanan</h4>'+pinHtml()+'<h4>Data</h4><p class="small">Catatan tersimpan di browser perangkat ini. Menghapus data browser akan menghapus catatan, jadi simpan backup secara berkala. Masuk dengan Google di bagian Akun untuk sinkron antar perangkat.</p><div class="row" style="margin:0 0 10px"><button class="btn ghost" style="flex:1" data-a="exp">Salin backup</button><button class="btn ghost" style="flex:1" data-a="imp">Pulihkan</button></div><button class="btn danger block" data-a="reset">'+(armed?"Ketuk lagi untuk hapus semua":"Hapus semua data")+'</button>';
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
  openFull('<div class="edtop"><button class="back" data-a="back" aria-label="Selesai dan simpan">\u2713</button><input id="et" class="etitle" placeholder="Judul" value="'+esc(n.title)+'" aria-label="Judul"><div class="cwrap"><button class="cbtn" id="cb" data-a="cpick" style="background:var(--c-'+n.color+')" aria-label="Pilih warna"></button><div class="cpop" id="cp">'+COLORS.map(function(c){return '<button class="dot'+(c===n.color?" on":"")+'" data-a="color" data-c="'+c+'" style="background:var(--c-'+c+')" aria-label="Warna '+c+'"></button>'}).join("")+'</div></div>'+(isNew?"":'<button class="ic" data-a="del" id="ed" aria-label="Hapus" style="color:var(--danger)">\uD83D\uDDD1\uFE0F</button>')+'</div>'+
  '<select id="ec" aria-label="Kategori">'+S.cats.map(function(c){return '<option value="'+c.id+'"'+(c.id===n.category?" selected":"")+'>'+esc(c.name)+'</option>'}).join("")+'<option value=""'+(n.category===""?" selected":"")+'>Tanpa kategori</option></select>'+
  '<textarea id="eb" placeholder="Tulis catatan di sini" aria-label="Isi catatan">'+esc(n.content)+'</textarea>'+
  '<button class="btn ghost" data-a="rec" id="rb">\uD83C\uDF99 Rekam suara</button><div id="au"></div>');
}
function saveNote(){
  var title=$("et").value.trim(),content=$("eb").value.trim();
  abortRec();
  if(!title&&!content&&!ed.checklist.length&&!ed.audio.length){closeSheet();return;}
  var now=Date.now(),cat=$("ec").value,dt=ed.date||"";
  if(ed.id){var n=S.notes.filter(function(x){return x.id===ed.id})[0];if(n){n.title=title;n.content=content;n.category=cat;n.date=dt;n.audio=ed.audio;n.color=ed.color;n.favorite=ed.fav;n.checklist=ed.checklist;n.updatedAt=now;delete n.sample;}}
  else S.notes.unshift({id:uid(),date:dt,audio:ed.audio,title:title,content:content,color:ed.color,category:cat,favorite:ed.fav,checklist:ed.checklist,createdAt:now,updatedAt:now});
  save();closeSheet();R();
}
var MN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function ds(y,m,d){return y+"-"+(m+1<10?"0":"")+(m+1)+"-"+(d<10?"0":"")+d;}
function todayStr(){var d=new Date();return ds(d.getFullYear(),d.getMonth(),d.getDate());}
var calY=new Date().getFullYear(),calM=new Date().getMonth(),calSel=todayStr();
function vCal(){
  var start=new Date(calY,calM,1).getDay(),today=todayStr(),by={};
  S.notes.forEach(function(n){if(n.date){by[n.date]=(by[n.date]||0)+1;}});
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
  '<b>Daftar centang</b>'+
  ts.map(function(t){return '<div class="cli"><input type="checkbox" data-a="tkdone" data-id="'+t.id+'"'+(t.done?" checked":"")+' aria-label="Selesai"><span style="flex:1;'+(t.done?'text-decoration:line-through;color:var(--muted)':'')+'">'+esc(t.text)+'</span><button data-a="tkdel" data-id="'+t.id+'" aria-label="Hapus item">×</button></div>'}).join("")+
  '<div style="display:flex;gap:8px;margin-top:8px"><input class="search" id="tkn" placeholder="Buat item daftar centang" aria-label="Item baru" style="margin:0;flex:1;min-width:0"><button class="btn" data-a="tkadd">Tambah</button></div></div>';
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
  return '<button class="box prof" data-a="prof" aria-label="Buka profil">'+avatar(56,p.photo)+'<div><b>'+esc(p.name||"Atur profil")+'</b><br><span class="small">'+esc(p.email||"Tambahkan alamat Gmail")+'</span></div></button>';
}
function openProfile(){
  var p=S.profile||{};tmpPhoto=null;
  openSheet('<h2>Profil</h2><div style="display:flex;align-items:center;gap:14px;margin-bottom:12px"><span id="pav">'+avatar(72,p.photo)+'</span><span class="btn ghost" style="position:relative;overflow:hidden;cursor:pointer">Pilih foto<input id="pf" type="file" accept="image/*" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;margin:0;padding:0;border:0"></span></div><input id="pn" placeholder="Nama" value="'+esc(p.name||"")+'" aria-label="Nama"><input id="pe" type="email" placeholder="Alamat Gmail" value="'+esc(p.email||"")+'" aria-label="Alamat Gmail"><p class="small">Profil hanya tersimpan di perangkat ini. Alamat Gmail belum diverifikasi karena belum ada login Google. Alamat ini dipakai sebagai tujuan saat lu mengirim backup ke Gmail.</p><div class="row"><button class="btn ghost" data-a="close">Batal</button><div class="g"><button class="btn danger" data-a="delphoto">Hapus foto</button><button class="btn" data-a="saveprof">Simpan</button></div></div>');
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
  return '<div class="shg">'+s("https://wa.me/?text="+e,"💬","WhatsApp")+s("https://t.me/share/url?url=%20&text="+e,"✈️","Telegram")+s("https://mail.google.com/mail/?view=cm&fs=1&su=Catatan%20NoteKu%20By%20Yordan&body="+e,"✉️","Gmail")+'<button class="shb" data-a="sms"><i>📱</i>SMS</button>'+'<button class="shb" data-a="sysshare"><i>🔗</i>Lainnya</button></div>';
}
function smsShare(){
  if(navigator.share){$("bkm").textContent="Pilih aplikasi Pesan di menu yang terbuka.";sysShare();return;}
  var txt=$("bk").value,m=$("bkm"),went=false,on=function(){went=true};
  window.addEventListener("blur",on,{once:true});
  document.addEventListener("visibilitychange",on,{once:true});
  var f=document.createElement("iframe");f.style.display="none";f.src="sms:?body="+encodeURIComponent(txt);document.body.appendChild(f);
  setTimeout(function(){
    if(f.parentNode)f.parentNode.removeChild(f);
    if(!went){m.textContent="SMS tidak bisa dibuka langsung dari halaman ini. Gunakan menu bagikan HP dan pilih aplikasi Pesan.";sysShare();}
  },1000);
}
function sysShare(){
  var txt=$("bk").value,m=$("bkm"),fail="Menu bagikan HP tidak bisa dibuka di sini. Salin teks lalu kirim lewat aplikasi lain.";
  if(!navigator.share){m.textContent=fail;return;}
  try{navigator.share({text:txt}).then(function(){sel=[];closeSheet();chrome();renderList();},function(err){if(err&&err.name!=="AbortError")m.textContent=fail;});}catch(x){m.textContent=fail;}
}
function shareSheet(txt){
  openSheet('<h2>Bagikan catatan</h2>'+shareLinks(txt)+'<p class="small">Untuk Bluetooth, ketuk Lainnya lalu pilih Bluetooth. Atau salin teks dan kirim lewat aplikasi lain.</p><textarea id="bk" readonly>'+esc(txt)+'</textarea><p class="small" id="bkm"></p><div class="row"><button class="btn ghost" data-a="close">Tutup</button><button class="btn" data-a="copy">Salin teks</button></div>');
}
function selShare(){
  var txt=selText();
  try{
    
  }catch(e){}
  shareSheet(txt);
}
function selFav(){var ns=selNotes(),all=ns.every(function(n){return n.favorite});ns.forEach(function(n){n.favorite=!all});save();chrome();renderList();toast(all?"Dihapus dari favorit":"Ditambahkan ke favorit");}
function selCat(){
  openSheet('<h2>Pindah kategori</h2><select id="mc" aria-label="Kategori">'+S.cats.map(function(c){return '<option value="'+c.id+'">'+esc(c.name)+'</option>'}).join("")+'<option value="">Tanpa kategori</option></select><div class="row"><button class="btn ghost" data-a="close">Batal</button><button class="btn" data-a="domove">Pindahkan</button></div>');
}
function doMove(){var c=$("mc").value,k=sel.length;selNotes().forEach(function(n){n.category=c;n.updatedAt=Date.now()});sel=[];save();closeSheet();R();toast(k+" catatan dipindahkan");}
function selDel(){
  if(!armed){armed=true;chrome();return;}
  var n=sel.length;S.notes=S.notes.filter(function(x){return sel.indexOf(x.id)<0});sel=[];armed=false;save();R();toast(n+" catatan dihapus");
}
function openExport(){
  var data=JSON.stringify({app:"noteku",version:1,cats:S.cats,notes:S.notes,tasks:S.tasks,dayIcons:S.dayIcons});
  openSheet('<h2>Backup data</h2><p class="small">Salin teks di bawah, lalu simpan di tempat aman, misalnya kirim ke diri sendiri lewat WhatsApp. Untuk memulihkan, ketuk Pulihkan di Pengaturan dan tempel teksnya.</p><textarea id="bk" readonly>'+esc(data)+'</textarea>'+gmailBackup(data)+'<p class="small" id="bkm"></p><div class="row"><button class="btn ghost" data-a="close">Tutup</button><button class="btn" data-a="copy">Salin teks</button></div>');
}
function copyBackup(){
  var ta=$("bk"),m=$("bkm"),fail="Gagal menyalin otomatis. Teks sudah terpilih, tekan lama lalu pilih Salin.";
  ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);
  var ok=false;
  try{ok=document.execCommand("copy");}catch(e){}
  if(ok){m.textContent="Tersalin.";return;}
  if(navigator.clipboard){navigator.clipboard.writeText(ta.value).then(function(){m.textContent="Tersalin."},function(){m.textContent=fail});return;}
  m.textContent=fail;
}
function openImport(){
  armed=false;
  openSheet('<h2>Pulihkan data</h2><p class="small">Tempel teks backup di bawah. Catatan yang ada sekarang akan diganti.</p><textarea id="ib" placeholder="Tempel teks backup di sini"></textarea><p class="small" id="bkm"></p><div class="row"><button class="btn ghost" data-a="close">Batal</button><button class="btn" data-a="doimp">Pulihkan</button></div>');
}
function doImport(){
  var m=$("bkm"),d;
  try{d=JSON.parse($("ib").value);}catch(e){m.textContent="Teks backup tidak valid.";return;}
  if(!d||d.app!=="noteku"||!Array.isArray(d.notes)||!Array.isArray(d.cats)){m.textContent="Ini bukan backup NoteKu By Yordan.";return;}
  if(!armed){armed=true;m.textContent="Ditemukan "+d.notes.length+" catatan. Ketuk Pulihkan sekali lagi untuk mengganti data sekarang.";return;}
  S.notes=d.notes.map(function(n){return{id:String(n.id||uid()),title:String(n.title||""),date:String(n.date||""),audio:(Array.isArray(n.audio)?n.audio:[]).filter(function(a){return a&&typeof a.data==="string"&&a.data.indexOf("data:audio/")===0}).map(function(a){return{id:uid(),data:a.data,dur:+a.dur||0}}),content:String(n.content||""),color:COLORS.indexOf(n.color)>-1?n.color:"ungu",category:String(n.category||""),favorite:!!n.favorite,checklist:(Array.isArray(n.checklist)?n.checklist:[]).map(function(c){return{id:uid(),text:String(c.text||""),done:!!c.done}}),createdAt:+n.createdAt||Date.now(),updatedAt:+n.updatedAt||Date.now()}});
  S.cats=d.cats.map(function(c){return{id:String(c.id||uid()),name:String(c.name||"Kategori")}});
  S.tasks=Array.isArray(d.tasks)?d.tasks.map(function(t){return{id:String(t.id||uid()),date:String(t.date||""),text:String(t.text||""),done:!!t.done}}):[];
  S.dayIcons={};if(d.dayIcons&&typeof d.dayIcons==="object"){Object.keys(d.dayIcons).forEach(function(k){var v=d.dayIcons[k];if(v&&typeof v.e==="string")S.dayIcons[k]={e:v.e.slice(0,8),t:String(v.t||"").slice(0,60)};});}
  armed=false;save();closeSheet();R();
}

document.addEventListener("click",function(e){
  if(!(e.target.closest&&e.target.closest(".cwrap"))){var cp0=$("cp");if(cp0)cp0.classList.remove("open");}
  var v=e.target.closest("[data-v]");
  if(v){view=v.getAttribute("data-v");q="";armed=false;R();return;}
  if(e.target===$("m")){closeSheet();return;}
  var t=e.target.closest("[data-a]");if(!t)return;
  var a=t.getAttribute("data-a"),id=t.getAttribute("data-id");
  if(a==="fab"){openEditor(null,view==="kalender"?calSel:"");}
  else if(a==="open"){if(lp){lp=false;return;}if(sel.length)toggleSel(id);else openEditor(id);}
  else if(a==="selclear"){sel=[];armed=false;chrome();renderList();}
  else if(a==="selall"){sel=sel.length>=vis.length?[]:vis.slice();armed=false;chrome();renderList();}
  else if(a==="selfav")selFav();
  else if(a==="selcopy")selCopy();
  else if(a==="selshare")selShare();
  else if(a==="selcat")selCat();
  else if(a==="seldel")selDel();
  else if(a==="domove")doMove();
  
  else if(a==="view"){S.view=S.view==="list"?"grid":"list";save();R();}
  else if(a==="exp")openExport();
  else if(a==="imp")openImport();
  else if(a==="copy")copyBackup();
  else if(a==="doimp")doImport();
  else if(a==="sysshare")sysShare();
  else if(a==="sms")smsShare();
  else if(a==="calprev"){calM--;if(calM<0){calM=11;calY--;}R();}
  else if(a==="calnext"){calM++;if(calM>11){calM=0;calY++;}R();}
  else if(a==="day"){calSel=t.getAttribute("data-d");var pp=calSel.split("-");calY=+pp[0];calM=+pp[1]-1;R();}
  else if(a==="gofav"){view="catatan";cf="__fav";q="";R();}
  else if(a==="gocat"){view="catatan";cf=id;q="";R();}
  else if(a==="prof")openProfile();
  else if(a==="acc"){S.accent=t.getAttribute("data-k");save();theme();R();}
  else if(a==="dayicon")openIcon();
  else if(a==="pickico"){S.dayIcons[calSel]={e:t.getAttribute("data-e"),t:$("ict").value.trim()};save();closeSheet();R();}
  else if(a==="customico"){var ce=$("ice").value.trim();if(ce){S.dayIcons[calSel]={e:ce,t:$("ict").value.trim()};save();closeSheet();R();}}
  else if(a==="delico"){delete S.dayIcons[calSel];save();closeSheet();R();}
  else if(a==="tkadd")addTask();
  else if(a==="tkdone"){var tk=S.tasks.filter(function(x){return x.id===id})[0];if(tk){tk.done=t.checked;save();R();}}
  else if(a==="tkdel"){S.tasks=S.tasks.filter(function(x){return x.id!==id});save();R();}
  else if(a==="install"){if(dip){dip.prompt();dip=null;}R();}
  else if(a==="login")googleLogin();
  else if(a==="syncnow"){sbTry=0;syncNow(true);}
  else if(a==="logout")sbLogout(t);
  else if(a==="pinset")openPin();
  else if(a==="savepin")savePin();
  else if(a==="offpin")offPin();
  else if(a==="unlock")unlock();
  else if(a==="forgot")forgot();
  else if(a==="rec")toggleRec();
  else if(a==="delau"){ed.audio.splice(+t.getAttribute("data-i"),1);renderAudio();}
  else if(a==="saveprof")saveProf();
  else if(a==="delphoto"){tmpPhoto="";$("pav").innerHTML=avatar(72,"");}
  else if(a==="chip"){cf=t.getAttribute("data-c");R();}
  else if(a==="close")closeSheet();
  else if(a==="save"||a==="back")saveNote();
  else if(a==="cpick"){$("cp").classList.toggle("open");}
  else if(a==="color"){ed.color=t.getAttribute("data-c");$("cb").style.background="var(--c-"+ed.color+")";document.querySelectorAll("#cp .dot").forEach(function(d){d.classList.toggle("on",d===t)});$("cp").classList.remove("open");}
  else if(a==="del"){if(!armed){armed=true;t.textContent="Yakin?";return;}S.notes=S.notes.filter(function(x){return x.id!==ed.id});save();closeSheet();armed=false;R();}
  
  else if(a==="addcat"){var nm=$("nc").value.trim();if(nm){S.cats.push({id:uid(),name:nm});save();R();}}
  else if(a==="delcat"){S.cats=S.cats.filter(function(c){return c.id!==id});var f=S.cats.length?S.cats[0].id:"";S.notes.forEach(function(n){if(n.category===id)n.category=f});if(cf===id)cf="Semua";save();R();}
  else if(a==="theme"){S.theme=t.getAttribute("data-t");save();theme();R();}
  else if(a==="reset"){if(!armed){armed=true;R();return;}var th=S.theme,pr=S.profile;S=sample();S.theme=th;S.profile=pr;armed=false;save();R();}
});
document.addEventListener("input",function(e){if(e.target.id==="q"){q=e.target.value;renderList();}});
document.addEventListener("change",function(e){if(e.target.id==="pf")pickPhoto(e.target.files&&e.target.files[0]);if(e.target.id==="fs"){S.font=e.target.value;save();theme();}if(e.target.id==="so"){S.sort=e.target.value;save();renderList();}});
function lpClear(){if(lpT){clearTimeout(lpT);lpT=null;}}
document.addEventListener("pointerdown",function(e){
  lp=false;lpClear();
  var c=e.target.closest&&e.target.closest(".card");if(!c)return;
  var id=c.getAttribute("data-id");sx=e.clientX;sy=e.clientY;
  lpT=setTimeout(function(){lpT=null;lp=true;toggleSel(id);},1000);
});
document.addEventListener("pointermove",function(e){if(lpT&&(Math.abs(e.clientX-sx)>10||Math.abs(e.clientY-sy)>10))lpClear();});
["pointerup","pointercancel","scroll"].forEach(function(t){document.addEventListener(t,lpClear,true);});
document.addEventListener("contextmenu",function(e){if(e.target.closest&&e.target.closest(".card"))e.preventDefault();});
function pushH(){if(hist)return;try{history.pushState({nk:1},"");hist=true;}catch(e){}}
window.addEventListener("popstate",function(){
  if(skipPop){skipPop=false;return;}
  if($("m").classList.contains("open")){hist=false;if(ed)saveNote();else closeSheet();}
});
var ACC={biru:["#2563eb","#60a5fa"],hijau:["#15803d","#4ade80"],oranye:["#ea580c","#fb923c"],pink:["#db2777","#f472b6"],teal:["#0f766e","#2dd4bf"]};
var FONTS={sistem:'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif',serif:'Georgia,"Times New Roman",serif',mono:'ui-monospace,Menlo,Consolas,monospace',nunito:'Nunito,system-ui,sans-serif',caveat:'Caveat,"Comic Sans MS",cursive',merri:'Merriweather,Georgia,serif'};
function isDark(){return S.theme==="dark"||(S.theme!=="light"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);}
function theme(){
  var d=document.documentElement,st=d.style,a=ACC[S.accent];
  if(S.theme==="light"||S.theme==="dark")d.setAttribute("data-theme",S.theme);else d.removeAttribute("data-theme");
  if(a){st.setProperty("--accent",a[isDark()?1:0]);st.setProperty("--accent-text",isDark()?"#0b1220":"#fff");}
  else{st.removeProperty("--accent");st.removeProperty("--accent-text");}
  document.body.style.fontFamily=FONTS[S.font]||FONTS.sistem;
  if(/nunito|caveat|merri/.test(S.font||"")&&!document.getElementById("gf")){var l=document.createElement("link");l.id="gf";l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=Nunito&family=Caveat&family=Merriweather&display=swap";document.head.appendChild(l);}
}
function accHtml(){return '<div class="swc">'+[["ungu","#7c3aed"],["biru","#2563eb"],["hijau","#15803d"],["oranye","#ea580c"],["pink","#db2777"],["teal","#0f766e"]].map(function(c){return '<button data-a="acc" data-k="'+c[0]+'" class="'+((S.accent||"ungu")===c[0]?"on":"")+'" style="background:'+c[1]+'" aria-label="Warna '+c[0]+'"></button>'}).join("")+'</div>';}
function fontHtml(){return '<select class="search" id="fs" aria-label="Font">'+[["sistem","Sistem"],["serif","Serif (Georgia)"],["mono","Mono"],["nunito","Nunito (bulat)"],["caveat","Caveat (tulisan tangan)"],["merri","Merriweather (klasik)"]].map(function(f){return '<option value="'+f[0]+'"'+((S.font||"sistem")===f[0]?" selected":"")+'>'+f[1]+'</option>'}).join("")+'</select><p class="small">Nunito, Caveat, dan Merriweather butuh internet saat pertama dipilih.</p>';}
function pinHtml(){return '<button class="btn ghost block" data-a="pinset">'+(S.pin?"Ubah atau matikan PIN":"Atur PIN")+'</button><p class="small">PIN mengunci aplikasi saat dibuka. PIN tersimpan di perangkat ini dan tidak bisa dipulihkan jika lupa.</p>';}

function hashPin(p){
  var t="noteku:"+p;
  if(window.crypto&&crypto.subtle&&window.TextEncoder)return crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)).then(function(b){return [].slice.call(new Uint8Array(b)).map(function(x){return ("0"+x.toString(16)).slice(-2)}).join("");});
  var h=0;for(var i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return Promise.resolve("x"+h);
}
function openPin(){
  openSheet('<h2>Kunci PIN</h2>'+(S.pin?'<input id="pc" type="password" inputmode="numeric" maxlength="6" placeholder="PIN saat ini" aria-label="PIN saat ini">':'')+'<input id="pn1" type="password" inputmode="numeric" maxlength="6" placeholder="PIN baru (4 sampai 6 angka)" aria-label="PIN baru"><p class="small" id="pms">Jika lupa PIN, satu-satunya cara adalah menghapus semua data. Simpan backup dulu.</p><div class="row"><button class="btn ghost" data-a="close">Batal</button><div class="g">'+(S.pin?'<button class="btn danger" data-a="offpin">Matikan</button>':'')+'<button class="btn" data-a="savepin">Simpan</button></div></div>');
}
function pinMsg(t){$("pms").textContent=t;}
function checkCur(cb){if(!S.pin){cb();return;}hashPin($("pc").value).then(function(h){if(h===S.pin)cb();else pinMsg("PIN saat ini salah.");});}
function savePin(){var v=$("pn1").value;if(!/^[0-9]{4,6}$/.test(v)){pinMsg("PIN baru harus 4 sampai 6 angka.");return;}checkCur(function(){hashPin(v).then(function(h){S.pin=h;save();closeSheet();R();toast("PIN disimpan");});});}
function offPin(){checkCur(function(){S.pin="";save();closeSheet();R();toast("PIN dimatikan");});}
var lockedAt=0,dip=null;
function showLock(){
  if(!S.pin)return;
  var l=$("lock");l.classList.add("on");
  l.innerHTML='<h2>NoteKu By Yordan terkunci</h2><input id="lp" type="password" inputmode="numeric" maxlength="6" placeholder="PIN" aria-label="PIN"><p class="small" id="lmsg"></p><button class="btn" data-a="unlock">Buka</button><button class="btn ghost" data-a="forgot" id="fg">Lupa PIN</button>';
}
function hideLock(){$("lock").classList.remove("on");$("lock").innerHTML="";}
function unlock(){hashPin($("lp").value).then(function(h){if(h===S.pin){hideLock();}else{$("lmsg").textContent="PIN salah.";$("lp").value="";}});}
function forgot(){
  var t=$("fg");
  if(t.getAttribute("data-arm")!=="1"){t.setAttribute("data-arm","1");t.textContent="Ketuk lagi: hapus semua data";$("lmsg").textContent="Semua catatan akan dihapus dan PIN dimatikan.";return;}
  var th=S.theme;S=sample();S.theme=th;save();hideLock();R();
}

var rec=null,recC=[],recT=null,recS=0,recStream=null;
function fmtS(s){return Math.floor(s/60)+":"+("0"+(s%60)).slice(-2);}
function renderAudio(){
  var a=$("au");if(!a||!ed)return;
  a.innerHTML=ed.audio.map(function(x,i){return '<div class="au"><audio controls preload="none" src="'+x.data+'"></audio><span class="small">'+fmtS(x.dur||0)+'</span><button data-a="delau" data-i="'+i+'" aria-label="Hapus rekaman">\u00d7</button></div>'}).join("");
}
function stopTracks(){if(recStream){recStream.getTracks().forEach(function(t){t.stop()});recStream=null;}clearInterval(recT);recT=null;}
function abortRec(){if(rec){rec.onstop=null;try{rec.stop();}catch(e){}rec=null;}stopTracks();}
function toggleRec(){
  var b=$("rb");
  if(rec){rec.stop();return;}
  if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder)){toast("Perekam suara tidak didukung di sini");return;}
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(st){
    recStream=st;recC=[];recS=0;
    var r=new MediaRecorder(st,{audioBitsPerSecond:24000});rec=r;
    r.ondataavailable=function(e){if(e.data&&e.data.size)recC.push(e.data);};
    r.onstop=function(){
      var dur=recS,blob=new Blob(recC,{type:r.mimeType||"audio/webm"}),fr=new FileReader();
      rec=null;stopTracks();var bb=$("rb");if(bb)bb.textContent="\uD83C\uDF99 Rekam suara";
      fr.onload=function(){if(ed&&dur>0){ed.audio.push({id:uid(),data:fr.result,dur:dur});renderAudio();}};
      fr.readAsDataURL(blob);
    };
    r.start();
    if(b)b.textContent="\u23F9 Berhenti (0:00)";
    recT=setInterval(function(){recS++;var x=$("rb");if(x)x.textContent="\u23F9 Berhenti ("+fmtS(recS)+")";if(recS>=90&&rec)rec.stop();},1000);
  }).catch(function(){toast("Mikrofon tidak bisa diakses di halaman ini");});
}

try{matchMedia("(prefers-color-scheme: dark)").addEventListener("change",theme);}catch(e){}
document.addEventListener("visibilitychange",function(){
  if(document.hidden){lockedAt=Date.now();return;}
  if(S.pin&&lockedAt&&Date.now()-lockedAt>30000)showLock();
});
document.addEventListener("keydown",function(e){if(e.key==="Enter"&&e.target.id==="lp")unlock();if(e.key==="Enter"&&e.target.id==="tkn")addTask();});
/* ===== LOGIN GOOGLE DAN SINKRON (Google Drive appDataFolder) ===== */
var CFG=window.NOTEKU_CONFIG||{},CID=String(CFG.GOOGLE_CLIENT_ID||"").trim();
var sbOn=!!CID,AUTHK="noteku:gauth",SYNCK="noteku:gsync";
var sbAuth=null,sbMeta={base:0,h:"",dirty:false,last:0,uid:"",fid:""},sbApplying=false,sbBusy=false,sbMsg="",sbPushT=null,sbTry=0;
function sbLoad(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}}
function sbStore(k,v){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function sbSaveMeta(){sbStore(SYNCK,sbMeta);}
function canon(o){
  if(Array.isArray(o))return "["+o.map(canon).join(",")+"]";
  if(o&&typeof o==="object")return "{"+Object.keys(o).sort().map(function(k){return JSON.stringify(k)+":"+canon(o[k]);}).join(",")+"}";
  return JSON.stringify(o===undefined?null:o);
}
function sbHashStr(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return s.length+":"+h;}
function sbSid(x){return String(x==null?"":x).replace(/[^A-Za-z0-9_-]/g,"").slice(0,64);}
function sbDate(x){return /^\d{4}-\d{2}-\d{2}$/.test(String(x))?String(x):"";}
function sbPayload(){
  var p=S.profile||{};
  return{
    cats:S.cats,tasks:S.tasks,dayIcons:S.dayIcons,
    profile:{name:p.name||"",email:p.email||""},
    notes:S.notes.filter(function(n){return !n.sample}).map(function(n){var c={};for(var k in n)if(k!=="audio")c[k]=n[k];return c;})
  };
}
function sbHash(){return sbHashStr(canon(sbPayload()));}
function fixNote(n,audio){
  return{id:sbSid(n.id)||uid(),title:String(n.title||""),content:String(n.content||""),date:sbDate(n.date),color:COLORS.indexOf(n.color)>-1?n.color:"ungu",category:sbSid(n.category),favorite:!!n.favorite,
    checklist:(Array.isArray(n.checklist)?n.checklist:[]).map(function(c){return{id:sbSid(c&&c.id)||uid(),text:String((c&&c.text)||""),done:!!(c&&c.done)}}),
    audio:audio||[],createdAt:+n.createdAt||Date.now(),updatedAt:+n.updatedAt||Date.now()};
}
function fixCat(c){return{id:sbSid(c&&c.id)||uid(),name:String((c&&c.name)||"Kategori").slice(0,40)};}
function fixTask(t){return{id:sbSid(t&&t.id)||uid(),date:sbDate(t&&t.date),text:String((t&&t.text)||"").slice(0,200),done:!!(t&&t.done)};}
function sbIcons(o){var r={};if(o&&typeof o==="object")Object.keys(o).forEach(function(k){var v=o[k];if(sbDate(k)&&v&&typeof v.e==="string")r[k]={e:v.e.slice(0,8),t:String(v.t||"").slice(0,60)};});return r;}
function sbPristine(){return S.notes.every(function(n){return n.sample})&&!S.tasks.length&&!Object.keys(S.dayIcons).length;}
function sbApply(d){
  var old={};S.notes.forEach(function(n){if(n.audio&&n.audio.length)old[n.id]=n.audio;});
  sbApplying=true;
  S.notes=(Array.isArray(d.notes)?d.notes:[]).map(function(n){return fixNote(n,old[sbSid(n.id)])});
  if(Array.isArray(d.cats)&&d.cats.length)S.cats=d.cats.map(fixCat);
  S.tasks=(Array.isArray(d.tasks)?d.tasks:[]).map(fixTask);
  S.dayIcons=sbIcons(d.dayIcons);
  if(d.profile){S.profile=S.profile||{};if(d.profile.name&&!S.profile.name)S.profile.name=String(d.profile.name).slice(0,60);if(d.profile.email&&!S.profile.email)S.profile.email=String(d.profile.email).slice(0,120);}
  save();sbApplying=false;R();
}
function sbMerge(d){
  var map={};
  S.notes.filter(function(n){return !n.sample}).forEach(function(n){map[n.id]=n;});
  (Array.isArray(d.notes)?d.notes:[]).forEach(function(r){var id=sbSid(r.id),l=map[id];if(!l||(+r.updatedAt||0)>(l.updatedAt||0))map[id]=fixNote(r,l&&l.audio);});
  var cm={},tm={};
  (Array.isArray(d.cats)?d.cats:[]).forEach(function(c){c=fixCat(c);cm[c.id]=c;});S.cats.forEach(function(c){cm[c.id]=c;});
  (Array.isArray(d.tasks)?d.tasks:[]).forEach(function(t){t=fixTask(t);tm[t.id]=t;});S.tasks.forEach(function(t){tm[t.id]=t;});
  sbApplying=true;
  S.notes=Object.keys(map).map(function(k){return map[k]});
  S.cats=Object.keys(cm).map(function(k){return cm[k]});
  S.tasks=Object.keys(tm).map(function(k){return tm[k]});
  var ic=sbIcons(d.dayIcons);Object.keys(S.dayIcons).forEach(function(k){ic[k]=S.dayIcons[k];});S.dayIcons=ic;
  save();sbApplying=false;R();
}
function sbChanged(){
  if(!sbOn||sbApplying)return;
  if(sbHash()!==sbMeta.h){
    sbMeta.dirty=true;sbSaveMeta();
    if(sbAuth){clearTimeout(sbPushT);sbPushT=setTimeout(syncNow,2500);}
  }
}
function fmtTime(t){try{return new Date(t).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});}catch(e){return "";}}
var SCOPE_DRIVE="https://www.googleapis.com/auth/drive.appdata",SCOPE="https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email";
var DRV="https://www.googleapis.com/drive/v3",UPL="https://www.googleapis.com/upload/drive/v3",FNAME="noteku-data.json";
var gNoSilent=false;
function sbExpired(){return !sbAuth||(+sbAuth.expires_at||0)-60<=Date.now()/1000;}
function gReady(){return !!(window.google&&google.accounts&&google.accounts.oauth2);}
/* mode: "login" (pilih akun), "gesture" (beri izin lagi, harus dari ketukan), "none" (diam-diam) */
function gToken(mode,hint){
  return new Promise(function(res,rej){
    if(!gReady()){rej(new Error("Layanan Google belum termuat. Periksa koneksi internet."));return;}
    var done=false,tm=setTimeout(function(){fin(rej,new Error("auth"));},mode==="none"?10000:180000);
    function fin(f,v){if(done)return;done=true;clearTimeout(tm);f(v);}
    var tc=google.accounts.oauth2.initTokenClient({client_id:CID,scope:SCOPE,
      callback:function(r){
        if(!r||r.error||!r.access_token){fin(rej,new Error("auth"));return;}
        if(!google.accounts.oauth2.hasGrantedAllScopes(r,SCOPE_DRIVE)){fin(rej,new Error("scope"));return;}
        fin(res,r);
      },
      error_callback:function(){fin(rej,new Error("auth"));}
    });
    var o={prompt:mode==="none"?"none":mode==="login"?"select_account":""};
    if(hint)o.login_hint=hint;
    try{tc.requestAccessToken(o);}catch(e){fin(rej,new Error("auth"));}
  });
}
function gStoreToken(r){
  sbAuth.access_token=r.access_token;
  sbAuth.expires_at=Math.floor(Date.now()/1000)+(+r.expires_in||3600);
  gNoSilent=false;sbStore(AUTHK,sbAuth);
}
function gMsg(e){
  var m=e&&e.message;
  if(m==="scope")return "Izin Google Drive harus dicentang agar sinkron berjalan.";
  if(m==="auth")return "Proses masuk dibatalkan.";
  if(m==="userinfo")return "Gagal membaca akun Google.";
  return m&&m!=="Failed to fetch"?m:"Tidak ada koneksi internet.";
}
function gFetch(url,o){
  o=o||{};
  var h={"Authorization":"Bearer "+sbAuth.access_token};
  if(o.type)h["Content-Type"]=o.type;
  return fetch(url,{method:o.method||"GET",headers:h,body:o.body}).then(function(r){
    if(r.status===401){sbAuth.expires_at=0;sbStore(AUTHK,sbAuth);throw new Error("expired");}
    return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null;}catch(e){}return{ok:r.ok,status:r.status,json:j};});
  });
}
function gErr(r){var e=r.json&&r.json.error;return String((e&&(e.message||e.status))||("Kesalahan "+r.status)).slice(0,160);}
function gFind(){
  return gFetch(DRV+"/files?spaces=appDataFolder&pageSize=5&orderBy=createdTime&fields="+encodeURIComponent("files(id,version)")+"&q="+encodeURIComponent("name='"+FNAME+"' and trashed=false")).then(function(r){
    if(!r.ok)throw new Error(gErr(r));
    return (r.json&&r.json.files&&r.json.files[0])||null;
  });
}
function sbInsert(){
  var p=sbPayload(),b="nk"+uid();
  var body="--"+b+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+JSON.stringify({name:FNAME,parents:["appDataFolder"],mimeType:"application/json"})+"\r\n--"+b+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+JSON.stringify(p)+"\r\n--"+b+"--";
  return gFetch(UPL+"/files?uploadType=multipart&fields=id,version",{method:"POST",type:"multipart/related; boundary="+b,body:body}).then(function(r){
    if(!r.ok||!r.json||!r.json.id)throw new Error(gErr(r));
    sbMeta.fid=r.json.id;sbMeta.base=+r.json.version||1;sbMeta.h=sbHashStr(canon(p));sbMeta.dirty=sbHash()!==sbMeta.h;sbSaveMeta();
  });
}
function sbPush(base){
  var p=sbPayload();
  return gFetch(DRV+"/files/"+sbMeta.fid+"?fields=version").then(function(r){
    if(!r.ok)throw new Error(gErr(r));
    if(+r.json.version!==base)throw new Error("retry");
    return gFetch(UPL+"/files/"+sbMeta.fid+"?uploadType=media&fields=version",{method:"PATCH",type:"application/json",body:JSON.stringify(p)});
  }).then(function(r){
    if(!r.ok||!r.json)throw new Error(gErr(r));
    sbMeta.base=+r.json.version;sbMeta.h=sbHashStr(canon(p));sbMeta.dirty=sbHash()!==sbMeta.h;sbSaveMeta();
  });
}
function sbReconcile(row){
  var cv=+row.version||0,d=row.data||{},first=sbMeta.base===0;
  var changed=first?!sbPristine():(sbMeta.dirty&&sbHash()!==sbMeta.h);
  if(!first&&cv===sbMeta.base){
    if(changed)return sbPush(cv);
    sbMeta.dirty=false;sbSaveMeta();return Promise.resolve();
  }
  if(!changed){sbApply(d);sbMeta.base=cv;sbMeta.h=sbHash();sbMeta.dirty=false;sbSaveMeta();return Promise.resolve();}
  sbMerge(d);
  return sbPush(cv);
}
function syncNow(manual){
  manual=manual===true;
  if(!sbOn||!sbAuth||sbBusy)return Promise.resolve();
  if(ed){setTimeout(syncNow,4000);return Promise.resolve();}
  if(navigator.onLine===false){sbMsg="Offline. Akan disinkronkan saat online.";refreshAcct();return Promise.resolve();}
  if(sbExpired()&&!manual&&gNoSilent){refreshAcct();return Promise.resolve();}
  sbBusy=true;sbMsg="Menyinkronkan...";refreshAcct();
  var again=false;
  var tp=sbExpired()?gToken(manual?"gesture":"none",sbAuth.user.email).then(gStoreToken):Promise.resolve();
  return tp.then(function(){
    return gFind();
  }).then(function(f){
    if(!f)return sbInsert();
    sbMeta.fid=f.id;
    return gFetch(DRV+"/files/"+f.id+"?alt=media").then(function(r){
      if(!r.ok)throw new Error(gErr(r));
      if(!r.json||!Array.isArray(r.json.notes))throw new Error("Data di Google Drive tidak terbaca, sinkron dihentikan.");
      return sbReconcile({version:f.version,data:r.json});
    });
  }).then(function(){
    sbMsg="Tersinkron";sbMeta.last=Date.now();sbTry=0;sbSaveMeta();
  }).catch(function(e){
    var m=e&&e.message;
    if(m==="retry"){again=true;sbMsg="Menyinkronkan ulang...";}
    else if(m==="auth"||m==="expired"){gNoSilent=true;sbMsg="Izin Google habis. Ketuk Beri izin lagi.";}
    else if(m==="scope"){gNoSilent=true;sbMsg="Izin Google Drive belum diberikan.";}
    else sbMsg="Gagal: "+gMsg(e);
  }).then(function(){
    sbBusy=false;refreshAcct();
    if(again&&sbTry++<3)return syncNow();
  });
}
function fmtTime(t){try{return new Date(t).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});}catch(e){return "";}}
function acctInner(){
  var exp=sbExpired()&&!sbBusy;
  var msg=exp?"Izin Google habis. Ketuk Beri izin lagi agar sinkron lanjut.":(sbMsg||"Belum disinkronkan");
  return '<b>'+esc(sbAuth.user.email||"Akun Google")+'</b><p class="small" style="margin:6px 0 10px">'+esc(msg)+(sbMeta.last?" \u00b7 terakhir "+fmtTime(sbMeta.last):"")+'</p><div class="row" style="margin:0"><button class="btn ghost" data-a="syncnow">'+(exp?"Beri izin lagi":"Sinkronkan sekarang")+'</button><button class="btn danger" data-a="logout">Keluar</button></div><p class="small" style="margin:10px 0 0">Catatan tersimpan di folder tersembunyi NoteKu di Google Drive-mu. Memo suara hanya tersimpan di HP ini. Memakai HP bersama? Setelah keluar, pakai Hapus semua data.</p>';
}
function refreshAcct(){var a=$("acct");if(a&&sbAuth)a.innerHTML=acctInner();}
function accountHtml(){
  if(!sbOn)return '';
  if(!sbAuth)return '<h4>Akun</h4><div class="box"><b>Sinkron dan backup otomatis</b><p class="small" style="margin:6px 0 10px">Masuk dengan Google untuk menyimpan catatan di Google Drive-mu sendiri dan membukanya di HP lain. Pemilik aplikasi tidak bisa melihat catatanmu. <a href="privacy.html" target="_blank" rel="noopener">Kebijakan Privasi</a></p><button class="btn block" data-a="login">Masuk dengan Google</button></div>';
  return '<h4>Akun</h4><div class="box" id="acct">'+acctInner()+'</div>';
}
function sbResetLocal(){
  var th=S.theme,ac=S.accent,fn=S.font,pn=S.pin;
  S=sample();S.theme=th;S.accent=ac;S.font=fn;S.pin=pn;
  sbMeta.base=0;sbMeta.h="";sbMeta.dirty=false;sbMeta.fid="";
  sbApplying=true;save();sbApplying=false;
}
function googleLogin(){
  if(!sbOn)return;
  gToken("login","").then(function(r){
    return fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{"Authorization":"Bearer "+r.access_token}}).then(function(x){
      return x.ok?x.json():Promise.reject(new Error("userinfo"));
    }).then(function(u){
      if(!u||!u.sub)throw new Error("userinfo");
      sbAuth={access_token:r.access_token,expires_at:Math.floor(Date.now()/1000)+(+r.expires_in||3600),user:{id:String(u.sub),email:String(u.email||"")}};
      gNoSilent=false;sbStore(AUTHK,sbAuth);
      if(sbMeta.uid&&sbMeta.uid!==sbAuth.user.id)sbResetLocal();
      sbMeta.uid=sbAuth.user.id;sbSaveMeta();
      if(!S.profile)S.profile={};
      if(!S.profile.email&&sbAuth.user.email){S.profile.email=sbAuth.user.email;save();}
      R();toast("Berhasil masuk");sbTry=0;syncNow();
    });
  }).catch(function(e){toast(gMsg(e));});
}
function sbLogout(btn){
  if(!armed){armed=true;if(btn)btn.textContent="Ketuk lagi untuk keluar";return;}
  armed=false;
  var fin=function(){
    sbAuth=null;sbStore(AUTHK,null);
    sbMeta.base=0;sbMeta.h="";sbMeta.dirty=false;sbMeta.fid="";sbMsg="";sbSaveMeta();
    R();toast("Berhasil keluar");
  };
  syncNow().then(fin,fin);
}
function sbInit(){
  if(!sbOn)return;
  var m=sbLoad(SYNCK);
  if(m&&typeof m==="object")sbMeta={base:+m.base||0,h:String(m.h||""),dirty:!!m.dirty,last:+m.last||0,uid:String(m.uid||""),fid:String(m.fid||"")};
  var a=sbLoad(AUTHK);
  if(a&&a.access_token&&a.user&&a.user.id)sbAuth={access_token:String(a.access_token),expires_at:+a.expires_at||0,user:{id:String(a.user.id),email:String(a.user.email||"")}};
  window.addEventListener("online",function(){syncNow();});
  document.addEventListener("visibilitychange",function(){if(!document.hidden)syncNow();});
  setInterval(function(){if(!document.hidden)syncNow();},90000);
  if(sbAuth)setTimeout(syncNow,1500);
}
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();dip=e;if(view==="pengaturan")R();});
window.addEventListener("appinstalled",function(){dip=null;if(view==="pengaturan")R();toast("NoteKu By Yordan terpasang");});
sbInit();
theme();R();showLock();
})();

if("serviceWorker" in navigator&&location.protocol.indexOf("http")===0){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});});}
