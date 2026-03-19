// ---------------- FIREBASE CONFIG ----------------

const firebaseConfig = {
  apiKey: "XXX",
  authDomain: "XXX",
  projectId: "XXX"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

// ---------------- LOGIN ----------------

document.getElementById("terms").onchange = checkLogin;
document.getElementById("privacy").onchange = checkLogin;

function checkLogin(){
  const t = terms.checked;
  const p = privacy.checked;
  enterBtn.disabled = !(t && p);
}

let currentUser = null;

async function login(){

  const name = username.value;
  const phone = document.getElementById("phone").value;

  if(!name || !phone) return alert("Inserisci dati");

  const user = await firebase.auth().signInAnonymously();
  currentUser = user.user.uid;

  await db.collection("users").doc(currentUser).set({
    name,
    phone
  });

  formLogin.classList.add("hidden");
  app.classList.remove("hidden");

  listenMatches();
}

// ---------------- DAYS ----------------

const days = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
const slots = ["Mattina","Pomeriggio","Sera"];

const availability = {};

const container = document.getElementById("daysContainer");

days.forEach(day => {

  const div = document.createElement("div");
  div.className = "day-block";

  const btn = document.createElement("button");
  btn.innerText = day;

  const timeDiv = document.createElement("div");

  btn.onclick = ()=>{
    btn.classList.toggle("selected");

    if(btn.classList.contains("selected")){
      availability[day] = [];
      timeDiv.style.display = "block";
    } else {
      delete availability[day];
      timeDiv.style.display = "none";
    }
  };

  slots.forEach(s=>{
    const t = document.createElement("button");
    t.innerText = s;

    t.onclick = ()=>{
      t.classList.toggle("selected");

      if(!availability[day]) availability[day] = [];

      if(t.classList.contains("selected")){
        availability[day].push(s);
      } else {
        availability[day] = availability[day].filter(x=>x!==s);
      }
    };

    timeDiv.appendChild(t);
  });

  timeDiv.style.display = "none";

  div.appendChild(btn);
  div.appendChild(timeDiv);

  container.appendChild(div);
});

// ---------------- SAVE + MATCH ----------------

async function saveAvailability(){

  await db.collection("availability").doc(currentUser).set({
    userId: currentUser,
    data: availability
  });

  checkMatches();
}

async function checkMatches(){

  const snapshot = await db.collection("availability").get();

  snapshot.forEach(doc => {

    const other = doc.data();

    if(other.userId === currentUser) return;

    const match = findMatch(availability, other.data);

    if(match){
      showMatch(match.day, match.slots, other.userId);
    }

  });
}

function findMatch(a, b){

  for(let day in a){

    if(b[day]){

      const common = a[day].filter(s => b[day].includes(s));

      if(common.length > 0){
        return { day, slots: common };
      }
    }
  }

  return null;
}

// ---------------- MATCH UI ----------------

let currentMatchUser = null;

async function showMatch(day, slots, userId){

  currentMatchUser = userId;

  const userDoc = await db.collection("users").doc(userId).get();
  const user = userDoc.data();

  matchText.innerText = `${user.name} - ${day} (${slots.join(", ")})`;

  matchSuggestions.innerHTML = "";

  slots.forEach(s=>{
    let text = "";

    if(s==="Mattina") text="☕ Colazione";
    if(s==="Pomeriggio") text="🍕 Pizza";
    if(s==="Sera") text="🍸 Aperitivo";

    const p = document.createElement("p");
    p.innerText = text;
    matchSuggestions.appendChild(p);
  });

  matchPopup.classList.remove("hidden");
}

function closeMatch(){
  matchPopup.classList.add("hidden");
}

// ---------------- WHATSAPP ----------------

async function sendWhatsApp(){

  const userDoc = await db.collection("users").doc(currentMatchUser).get();
  const other = userDoc.data();

  const me = await db.collection("users").doc(currentUser).get();

  const myName = me.data().name;

  const msg = `Ciao ${other.name}! Sono ${myName} da Looply 😊 Ci organizziamo?`;

  const url = `https://wa.me/${other.phone}?text=${encodeURIComponent(msg)}`;

  window.open(url, "_blank");
}

// ---------------- REAL TIME LISTENER ----------------

function listenMatches(){

  db.collection("availability").onSnapshot(snapshot => {

    snapshot.forEach(doc => {

      const other = doc.data();

      if(other.userId === currentUser) return;

      const match = findMatch(availability, other.data);

      if(match){
        showMatch(match.day, match.slots, other.userId);
      }

    });

  });
}
