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
