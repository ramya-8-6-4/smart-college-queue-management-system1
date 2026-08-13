const services = ["Fees Payment","Certificates","Exam Forms","ID Card","Library Services","Other Services"];

let queue = JSON.parse(localStorage.getItem("queueData")) || [
  {token:"A18",service:"Certificates",status:"Completed",time:"10:05 AM"},
  {token:"A19",service:"Fees Payment",status:"Completed",time:"10:10 AM"},
  {token:"A20",service:"Certificates",status:"Serving",time:"10:15 AM"},
  {token:"A21",service:"Certificates",status:"Waiting",time:"10:16 AM"},
  {token:"A22",service:"Certificates",status:"Waiting",time:"10:17 AM"},
  {token:"A23",service:"ID Card",status:"Waiting",time:"10:18 AM"},
  {token:"A24",service:"Exam Forms",status:"Waiting",time:"10:19 AM"}
];

let history = JSON.parse(localStorage.getItem("historyData")) || [];
let currentToken = null;
let currentName = "";
let users = JSON.parse(localStorage.getItem("queueUsers")) || [];


/* ================= QUEUE POSITION / WAIT TIME =================
   Calculates position from the actual pending queue rather than simply
   subtracting token numbers. Handles tokens like A09, A20 and wrap-around.
*/
function tokenNumber(token){
  const m = String(token || "").match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : NaN;
}

function tokenPrefix(token){
  const m = String(token || "").match(/^([A-Za-z]+)/);
  return m ? m[1].toUpperCase() : "";
}

function getCurrentQueueItems(){
  // Support the common localStorage keys used by the app.
  const keys = ["queue", "queues", "tokens", "queueTokens", "appointments"];
  for(const key of keys){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      const value = JSON.parse(raw);
      if(Array.isArray(value)) return value;
      if(value && Array.isArray(value.tokens)) return value.tokens;
      if(value && Array.isArray(value.queue)) return value.queue;
    }catch(e){}
  }
  return [];
}

function getStatusValue(item){
  return String(item?.status || item?.state || "").toLowerCase();
}

function isWaitingItem(item){
  const s = getStatusValue(item);
  return !["served","completed","cancelled","canceled","skipped","done"].includes(s);
}

function calculateQueuePosition(myToken, currentToken, queueItems){
  const mine = tokenNumber(myToken);
  const current = tokenNumber(currentToken);
  if(!Number.isFinite(mine)) return 0;

  // If actual pending queue data exists, count only tokens that are
  // genuinely ahead of the student's token.
  const prefix = tokenPrefix(myToken);
  const pending = queueItems
    .filter(isWaitingItem)
    .map(item => item?.token || item?.tokenNumber || item?.number)
    .filter(Boolean)
    .filter(t => tokenPrefix(t) === prefix || !prefix)
    .map(tokenNumber)
    .filter(Number.isFinite);

  if(pending.length){
    const uniqueAhead = [...new Set(pending)].filter(n => n !== mine && n > current && n < mine);
    return uniqueAhead.length;
  }

  // Fallback when queue records are unavailable:
  // tokens are assumed to advance numerically.
  if(Number.isFinite(current)){
    if(mine <= current) return 0; // already passed / currently served
    return Math.max(0, mine - current - 1);
  }
  return 0;
}

function calculateEstimatedWait(position, avgMinutesPerToken){
  const avg = Number(avgMinutesPerToken);
  const perToken = Number.isFinite(avg) && avg > 0 ? avg : 5;
  const minutes = Math.max(0, position * perToken);
  if(minutes === 0) return "0 mins";
  const low = Math.max(5, Math.floor(minutes / 5) * 5);
  const high = Math.max(low + 5, Math.ceil((minutes + perToken) / 5) * 5);
  return `${low} - ${high} mins`;
}

function saveUsers(){
  localStorage.setItem("queueUsers", JSON.stringify(users));
}

function registerStudent(){
  const name = document.getElementById("registerName").value.trim();
  const id = document.getElementById("registerId").value.trim().toLowerCase();
  const password = document.getElementById("registerPassword").value;
  const confirm = document.getElementById("registerConfirm").value;

  if(!name || !id || !password){
    toast("Please fill all registration fields.");
    return;
  }
  if(password !== confirm){
    toast("Passwords do not match.");
    return;
  }
  if(users.some(u => u.id === id)){
    toast("Account already exists. Please login.");
    return;
  }

  users.push({name, id, password});
  saveUsers();
  document.getElementById("loginId").value = id;
  document.getElementById("loginPassword").value = password;
  toast("Registration successful! You can login now.");
  showScreen("loginScreen");
}


function saveData(){
  localStorage.setItem("queueData", JSON.stringify(queue));
  localStorage.setItem("historyData", JSON.stringify(history));
}

function renderServices(){
  document.getElementById("services").innerHTML = services.map((s,i)=>
    `<div class="service" onclick="getToken('${s}')"><span>${["💳","📄","📝","🪪","📚","🔗"][i]}</span><b>${s}</b></div>`
  ).join("");

  document.getElementById("serviceManagement").innerHTML = services.map(s=>
    `<div class="manage-item"><span>${s}</span><button onclick="removeService('${s}')">🗑</button></div>`
  ).join("");
}

function login(){
  const id = document.getElementById("loginId").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;

  if(!id || !password){
    toast("Please enter Email / Roll Number and Password.");
    return;
  }

  const user = users.find(u => u.id === id && u.password === password);
  if(!user){
    toast(users.length ? "Invalid login details. Please register first." : "No account found. Please register first.");
    return;
  }

  currentName = user.name;
  showScreen("serviceScreen");
  toast("Welcome, " + currentName + "!");
}

function showScreen(id){
  document.querySelectorAll(".phone .screen").forEach(s=>s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function getToken(service){
  const number = queue.length + 1;
  const token = "A" + String(number).padStart(2,"0");
  const now = new Date();
  const time = now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  const waiting = queue.filter(x=>x.status==="Waiting").length;
  currentToken = token;

  queue.push({token,service,status:"Waiting",time,owner:currentName});
  saveData();

  document.getElementById("tokenNumber").textContent = token;
  document.getElementById("tokenService").textContent = service;
  document.getElementById("waitTime").textContent = `${Math.max(5,waiting*5)} - ${Math.max(10,waiting*5+5)} mins`;
  showScreen("tokenScreen");
  renderDashboard();
  toast("Token " + token + " generated successfully!");
}

function showStatus(){
  const item = queue.find(x=>x.token===currentToken);
  if(!item) return;

  const servingIndex = queue.findIndex(x=>x.status==="Serving");
  const myIndex = queue.findIndex(x=>x.token===currentToken);
  const away = Math.max(0, myIndex - servingIndex);

  document.getElementById("myToken").textContent = currentToken;
  document.getElementById("nowServing").textContent = queue[servingIndex]?.token || "A20";
  document.getElementById("tokensAway").textContent = away;
  document.getElementById("statusWait").textContent = `${away*5} - ${away*5+5} mins`;
  showScreen("statusScreen");
}

function leaveQueue(){
  if(!currentToken) return;
  queue = queue.filter(x=>x.token!==currentToken);
  saveData();
  currentToken=null;
  toast("You left the queue.");
  showScreen("serviceScreen");
  renderDashboard();
}

function renderHistory(){
  const el=document.getElementById("historyList");
  if(history.length===0){
    el.innerHTML="<p class='small'>No completed services yet.</p>";
    return;
  }
  el.innerHTML=history.slice().reverse().map(h=>
    `<div class="status-box"><strong>${h.token}</strong><span>${h.service}</span><small>Completed</small></div>`
  ).join("");
}

function renderDashboard(){
  const waiting=queue.filter(x=>x.status==="Waiting");
  const serving=queue.find(x=>x.status==="Serving");
  document.getElementById("totalTokens").textContent=queue.length;
  document.getElementById("completed").textContent=queue.filter(x=>x.status==="Completed").length;
  document.getElementById("adminNow").textContent=serving?.token || "—";
  document.getElementById("liveServing").textContent=serving?.token || "—";

  document.getElementById("upcomingTokens").innerHTML=waiting.map((x,i)=>
    `<div>${i+1}. <b>${x.token}</b> — ${x.service}</div>`
  ).join("") || "<p class='small'>No waiting tokens</p>";

  document.getElementById("queueTable").innerHTML=queue.slice(-12).map(x=>{
    const cls=x.status==="Serving"?"serving-status":x.status==="Completed"?"completed-status":"";
    return `<tr><td><b>${x.token}</b></td><td>${x.service}</td><td><span class="status ${cls}">${x.status}</span></td><td>${x.time}</td></tr>`;
  }).join("");
}

function callNextToken(){
  const serving=queue.find(x=>x.status==="Serving");
  if(serving){
    serving.status="Completed";
    history.push(serving);
  }
  const next=queue.find(x=>x.status==="Waiting");
  if(next){
    next.status="Serving";
    toast("Now serving " + next.token + ".");
  }else{
    toast("No waiting tokens.");
  }
  saveData();
  renderDashboard();
}

function removeService(name){
  const index=services.indexOf(name);
  if(index>-1){
    services.splice(index,1);
    
/* ================= SELF-CONTAINED QR CODE =================
   Generates QR codes in the browser; no external library/API required.
*/
const QRLocal = (() => {
  const EXP = new Array(512), LOG = new Array(256);
  let x = 1;
  for(let i=0;i<255;i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x&256)x^=0x11d; }
  for(let i=255;i<512;i++) EXP[i]=EXP[i-255];

  function mul(a,b){ return a&&b ? EXP[LOG[a]+LOG[b]] : 0; }
  function polyMul(p,q){
    const r=new Array(p.length+q.length-1).fill(0);
    for(let i=0;i<p.length;i++) for(let j=0;j<q.length;j++) r[i+j]^=mul(p[i],q[j]);
    return r;
  }
  function generator(n){
    let g=[1];
    for(let i=0;i<n;i++) g=polyMul(g,[1,EXP[i]]);
    return g;
  }
  const ECC={1:10,2:16,3:26,4:18,5:24,6:16,7:18,8:22,9:22,10:26};
  // Data codewords for a single byte-mode M block for versions 1-10.
  const DATA={1:16,2:28,3:44,4:64,5:86,6:108,7:124,8:154,9:182,10:216};

  function bytes(s){
    return Array.from(new TextEncoder().encode(s));
  }
  function makeData(s,v){
    const b=bytes(s), cap=DATA[v];
    const bits=[];
    const put=(n,len)=>{for(let i=len-1;i>=0;i--)bits.push((n>>>i)&1);};
    put(4,4); put(b.length, v<10?8:16);
    b.forEach(c=>put(c,8));
    const total=cap*8;
    for(let i=0;i<Math.min(4,total-bits.length);i++)bits.push(0);
    while(bits.length%8)bits.push(0);
    const out=[];
    for(let i=0;i<bits.length;i+=8) out.push(bits.slice(i,i+8).reduce((a,c)=>(a<<1)|c,0));
    let pad=true;
    while(out.length<cap){out.push(pad?236:17);pad=!pad;}
    return out;
  }
  function ecc(data,n){
    const g=generator(n), res=new Array(n).fill(0);
    for(const b of data){
      const f=b^res[0];
      res.shift(); res.push(0);
      for(let i=0;i<n;i++) res[i]^=mul(g[i+1],f);
    }
    return res;
  }
  function codewords(s,v){
    const d=makeData(s,v), e=ecc(d,ECC[v]);
    return d.concat(e);
  }

  // Alignment pattern centers for versions 2-10.
  const ALIGN={2:[6,18],3:[6,22],4:[6,26],5:[6,30],6:[6,34],7:[6,22,38],8:[6,24,42],9:[6,26,46],10:[6,28,50]};

  function matrix(v){
    const n=17+4*v, m=Array.from({length:n},()=>Array(n).fill(null));
    const set=(r,c,val)=>{if(r>=0&&c>=0&&r<n&&c<n)m[r][c]=!!val;};
    function finder(r,c){
      for(let y=-1;y<=7;y++) for(let x=-1;x<=7;x++){
        const on=(x>=0&&x<=6&&y>=0&&y<=6&&(x===0||x===6||y===0||y===6||(x>=2&&x<=4&&y>=2&&y<=4)));
        set(r+y,c+x,on);
      }
    }
    finder(0,0); finder(n-7,0); finder(0,n-7);
    // Timing patterns
    for(let i=8;i<n-8;i++){ if(m[6][i]===null)m[6][i]=i%2===0; if(m[i][6]===null)m[i][6]=i%2===0; }
    // Alignment
    if(v>=2){
      const a=ALIGN[v];
      for(const r of a) for(const c of a){
        if(m[r][c]!==null) continue;
        for(let y=-2;y<=2;y++) for(let x=-2;x<=2;x++)
          set(r+y,c+x,Math.max(Math.abs(x),Math.abs(y))!==1);
      }
    }
    // Format info reserved areas.
    for(let i=0;i<9;i++){ if(m[i][8]===null)m[i][8]=false; if(m[8][i]===null)m[8][i]=false; }
    for(let i=0;i<8;i++){ if(m[n-1-i][8]===null)m[n-1-i][8]=false; if(m[8][n-1-i]===null)m[8][n-1-i]=false; }
    m[n-8][8]=true;
    return m;
  }

  function formatBits(mask){
    // ECC M = 00; format data = 00 + mask, BCH.
    let d=(0<<3)|mask, v=d<<10, g=0x537;
    while(v && (v.toString(2).length>=11)) v ^= g << (v.toString(2).length-11);
    const bits=((d<<10)|v)^0x5412;
    const arr=[];
    for(let i=14;i>=0;i--)arr.push((bits>>>i)&1);
    return arr;
  }

  function drawFormat(m,mask){
    const n=m.length, f=formatBits(mask);
    // Standard format coordinates.
    const a=[
      [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[7,8],[8,8],
      [8,7],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0]
    ];
    const b=[
      [n-1,8],[n-2,8],[n-3,8],[n-4,8],[n-5,8],[n-6,8],[n-7,8],
      [8,n-8],[8,n-7],[8,n-6],[8,n-5],[8,n-4],[8,n-3],[8,n-2],[8,n-1]
    ];
    a.forEach((p,i)=>m[p[0]][p[1]]=!!f[i]);
    b.forEach((p,i)=>m[p[0]][p[1]]=!!f[i]);
  }

  const MASKS=[
    (r,c)=>(r+c)%2===0,
    r=>r%2===0,
    (r,c)=>c%3===0,
    (r,c)=>(r+c)%3===0,
    (r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0,
    (r,c)=>(r*c)%2+(r*c)%3===0,
    (r,c)=>((r*c)%2+(r*c)%3)%2===0,
    (r,c)=>((r*c)%3+(r+c)%2)%2===0
  ];

  function placeData(m,cw,mask){
    const n=m.length, bits=[];
    cw.forEach(b=>{for(let i=7;i>=0;i--)bits.push((b>>>i)&1);});
    let k=0, col=n-1, up=true;
    while(col>0){
      if(col===6)col--;
      for(let z=0;z<n;z++){
        const r=up?n-1-z:z;
        for(let j=0;j<2;j++){
          const c=col-j;
          if(m[r][c]!==null)continue;
          let bit=k<bits.length?bits[k++]:0;
          if(MASKS[mask](r,c))bit^=1;
          m[r][c]=!!bit;
        }
      }
      up=!up; col-=2;
    }
  }

  function penalty(m){
    const n=m.length; let p=0;
    for(let r=0;r<n;r++) for(let c=0;c<n;c++){
      let run=1;
      if(c>0){
        if(m[r][c]===m[r][c-1]){run=2; let k=c-2; while(k>=0&&m[r][k]===m[r][c]){run++;k--;}}
        if(run>=5)p+=3+run-5;
      }
      run=1;
      if(r>0){
        if(m[r][c]===m[r-1][c]){run=2; let k=r-2; while(k>=0&&m[k][c]===m[r][c]){run++;k--;}}
        if(run>=5)p+=3+run-5;
      }
    }
    for(let r=0;r<n-1;r++)for(let c=0;c<n-1;c++)
      if(m[r][c]===m[r+1][c]&&m[r][c]===m[r][c+1]&&m[r][c]===m[r+1][c+1])p+=3;
    let dark=0; for(const row of m)for(const q of row)if(q)dark++;
    p+=Math.floor(Math.abs(100*dark/n/n-50)/5)*10;
    return p;
  }

  function build(s,v,mask){
    const m=matrix(v), cw=codewords(s,v);
    placeData(m,cw,mask); drawFormat(m,mask); return m;
  }

  function generate(text){
    let v=1;
    while(v<=10){
      try{
        const b=bytes(text), max=(DATA[v]*8-4-(v<10?8:16))/8;
        if(b.length<=Math.floor(max))break;
      }catch(e){}
      v++;
    }
    if(v>10) throw new Error("URL is too long for this QR generator.");
    let best=null,score=Infinity;
    for(let mask=0;mask<8;mask++){
      const m=build(text,v,mask), p=penalty(m);
      if(p<score){score=p;best=m;}
    }
    return best;
  }

  function render(text, target, scale=5, border=4){
    const m=generate(text), n=m.length;
    const size=(n+border*2)*scale;
    const canvas=document.createElement("canvas");
    canvas.width=size; canvas.height=size;
    canvas.setAttribute("aria-label","QueueMate access QR code");
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#fff"; ctx.fillRect(0,0,size,size);
    ctx.fillStyle="#000";
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(m[r][c])
      ctx.fillRect((c+border)*scale,(r+border)*scale,scale,scale);
    target.innerHTML="";
    target.appendChild(canvas);
  }
  return {render};
})();


function getDefaultAppUrl(){
  const saved = localStorage.getItem("queueAppUrl");
  return saved || "https://ramya-8-6-4.github.io/smart-college-queue-management-system1/";
}

function updateQrCode(){
  const input = document.getElementById("appUrl");
  const url = input ? input.value.trim() : "";
  if(!url){
    toast("Enter the app URL first.");
    return;
  }
  try{
    const parsed = new URL(url);
    if(!["http:","https:"].includes(parsed.protocol)) throw new Error();
  }catch(e){
    toast("Please enter a valid http:// or https:// URL.");
    return;
  }
  localStorage.setItem("queueAppUrl", url);
  renderQrCode(url);
  toast("QR code updated.");
}

function renderQrCode(url){
  const target=document.getElementById("appQrCode");
  if(!target || !url) return;
  try{
    QRLocal.render(url,target,5,4);
  }catch(e){
    target.innerHTML='<p class="small">This URL is too long for the built-in QR generator.</p>';
  }
}

function initializeQrCode(){
  const input=document.getElementById("appUrl");
  if(!input)return;
  const url=getDefaultAppUrl();
  input.value=url;
  renderQrCode(url);
}

renderServices();
    toast(name + " removed.");
  }
}

function toast(message){
  const t=document.getElementById("toast");
  t.textContent=message;
  t.style.display="block";
  clearTimeout(window.toastTimer);
  window.toastTimer=setTimeout(()=>t.style.display="none",2500);
}

document.querySelectorAll(".nav-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active-page"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.page).classList.add("active-page");
    renderDashboard();
  });
});

renderServices();
renderDashboard();

// Initialize QR immediately when the page loads.
initializeQrCode();

function updateQrCode(){ toast("This QR code is ready to use. It opens the QueueMate app URL shown above."); }


function updateStudentQueueStatus(myToken, currentToken, avgMinutesPerToken){
  const position = calculateQueuePosition(
    myToken,
    currentToken,
    getCurrentQueueItems()
  );
  const wait = calculateEstimatedWait(position, avgMinutesPerToken);

  const selectors = {
    away: ["#tokensAway", "#queuePosition", "#studentTokensAway", "[data-queue-away]"],
    wait: ["#estimatedWait", "#waitingTime", "#estimatedWaitingTime", "[data-estimated-wait]"]
  };

  for(const selector of selectors.away){
    const el = document.querySelector(selector);
    if(el) el.textContent = String(position);
  }
  for(const selector of selectors.wait){
    const el = document.querySelector(selector);
    if(el) el.textContent = wait;
  }
  return {position, wait};
}
