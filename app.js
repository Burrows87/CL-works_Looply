window.onload = function () {

// ================= FIREBASE INIT =================

const firebaseConfig = {
  apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
  authDomain: "looply-app-21eb9.firebaseapp.com",
  projectId: "looply-app-21eb9",
  storageBucket: "looply-app-21eb9.firebasestorage.app",
  messagingSenderId: "484354825970",
  appId: "1:484354825970:web:79bc652c6b39fb57d27a6b",
  
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// ================= GLOBAL =================

let currentUser = null;

// ================= CHECK LOGIN =================

function checkLogin() {
  const t = document.getElementById("terms").checked;
  const p = document.getElementById("privacy").checked;
  const name = document.getElementById("username").value;
  const phone = document.getElementById("phone").value;

  document.getElementById("enterBtn").disabled = !(t && p && name && phone);
}

// listeners input
document.getElementById("terms").onchange = checkLogin;
document.getElementById("privacy").onchange = checkLogin;
document.getElementById("username").oninput = checkLogin;
document.getElementById("phone").oninput = checkLogin;

// ================= LOGIN =================

window.login = async function () { 

  const name = document.getElementById("username").value;
  const phone = document.getElementById("phone").value;

  if (!name || !phone) {
    alert("Inserisci nome e telefono");
    return;
  }

  try {
    const result = await auth.signInAnonymously();
    currentUser = result.user.uid;

    await db.collection("users").doc(currentUser).set({
      name: name,
      phone: phone
    });

    // UI switch
    document.getElementById("formLogin").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    listenMatches();

  } catch (error) {
    console.error(error);
    alert("Errore login: " + error.message);
  }
}

// ================= AVAILABILITY =================

const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const slots = ["Mattina", "Pomeriggio", "Sera"];

const availability = {};

const container = document.getElementById("daysContainer");

days.forEach(day => {

  const wrapper = document.createElement("div");
  wrapper.className = "day-block";

  const dayBtn = document.createElement("button");
  dayBtn.innerText = day;

  const slotDiv = document.createElement("div");
  slotDiv.style.display = "none";

  dayBtn.onclick = () => {
    dayBtn.classList.toggle("selected");

    if (dayBtn.classList.contains("selected")) {
      availability[day] = [];
      slotDiv.style.display = "block";
    } else {
      delete availability[day];
      slotDiv.style.display = "none";
    }
  };

  slots.forEach(slot => {

    const btn = document.createElement("button");
    btn.innerText = slot;

    btn.onclick = () => {

      btn.classList.toggle("selected");

      if (!availability[day]) availability[day] = [];

      if (btn.classList.contains("selected")) {
        availability[day].push(slot);
      } else {
        availability[day] = availability[day].filter(s => s !== slot);
      }

    };

    slotDiv.appendChild(btn);
  });

  wrapper.appendChild(dayBtn);
  wrapper.appendChild(slotDiv);
  container.appendChild(wrapper);

});

// ================= SAVE =================

async function saveAvailability() {

  if (!currentUser) {
    alert("Utente non loggato");
    return;
  }

  try {
    await db.collection("availability").doc(currentUser).set({
      userId: currentUser,
      data: availability
    });

    alert("Disponibilità salvata!");

    checkMatches();

  } catch (error) {
    console.error(error);
    alert("Errore salvataggio");
  }
}

// ================= MATCH =================

async function checkMatches() {

  const snapshot = await db.collection("availability").get();

  snapshot.forEach(doc => {

    const other = doc.data();

    if (other.userId === currentUser) return;

    const match = findMatch(availability, other.data);

    if (match) {
      showMatch(match.day, match.slots, other.userId);
    }

  });

}

function findMatch(a, b) {

  for (let day in a) {

    if (b[day]) {
      const common = a[day].filter(s => b[day].includes(s));

      if (common.length > 0) {
        return { day, slots: common };
      }
    }
  }

  return null;
}

// ================= MATCH UI =================

let currentMatchUser = null;

async function showMatch(day, slots, userId) {

  currentMatchUser = userId;

  const userDoc = await db.collection("users").doc(userId).get();
  const user = userDoc.data();

  document.getElementById("matchText").innerText =
  `${user.name} - ${day} (${slots.join(", ")})`;

  document.getElementById("matchPopup").classList.remove("hidden");
}

// ================= WHATSAPP =================

async function sendWhatsApp() {

  const userDoc = await db.collection("users").doc(currentMatchUser).get();
  const other = userDoc.data();

  const meDoc = await db.collection("users").doc(currentUser).get();
  const me = meDoc.data();

  const message = `Ciao ${other.name}! Sono ${me.name} da Looply 😊`;

  const url = `https://wa.me/${other.phone}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank");
}

// ================= MATCH LISTENER =================

function listenMatches() {

  db.collection("availability").onSnapshot(snapshot => {

    snapshot.forEach(doc => {

      const other = doc.data();

      if (other.userId === currentUser) return;

      const match = findMatch(availability, other.data);

      if (match) {
        showMatch(match.day, match.slots, other.userId);
      }

    });

  });

}
