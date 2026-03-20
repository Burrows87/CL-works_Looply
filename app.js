// ================= FIREBASE INIT =================

const firebaseConfig = {
  apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
  authDomain: "looply-app-21eb9.firebaseapp.com",
  projectId: "looply-app-21eb9",
  storageBucket: "looply-app-21eb9.firebasestorage.app",
  messagingSenderId: "484354825970",
  appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentMatchUser = null;

// ================= DOM READY =================

window.addEventListener("DOMContentLoaded", () => {

  const terms = document.getElementById("terms");
  const privacy = document.getElementById("privacy");
  const name = document.getElementById("username");
  const phone = document.getElementById("phone");
  const btn = document.getElementById("enterBtn");

  function checkLogin() {
    btn.disabled = !(terms.checked && privacy.checked && name.value && phone.value);
  }

  terms.onchange = checkLogin;
  privacy.onchange = checkLogin;
  name.oninput = checkLogin;
  phone.oninput = checkLogin;

  createDaysUI();

});

// ================= LOGIN =================

window.login = async function () {

  const name = document.getElementById("username").value;
  const phone = document.getElementById("phone").value;

  try {
    const result = await auth.signInAnonymously();
    currentUser = result.user.uid;

    await db.collection("users").doc(currentUser).set({
      name,
      phone
    });

    document.getElementById("formLogin").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    listenMatches();

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

// ================= FIREBASE INIT =================
// (assicurati di avere la tua config Firebase sopra se la usi)

const db = firebase.firestore();

// ================= LOGIN =================

function login() {
  const username = document.getElementById("username").value;
  const phone = document.getElementById("phone").value;
  const terms = document.getElementById("terms").checked;
  const privacy = document.getElementById("privacy").checked;

  if (!username || !phone) {
    alert("Inserisci nome e telefono");
    return;
  }

  if (!terms || !privacy) {
    alert("Devi accettare termini e privacy");
    return;
  }

  // salva utente base (opzionale)
  localStorage.setItem("user", JSON.stringify({ username, phone }));

  // switch UI
  document.getElementById("formLogin").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
}

// ================= GIORNI =================

let selectedDays = {
  venerdi: false,
  sabato: false,
  domenica: false
};

function toggleDay(day) {
  selectedDays[day] = !selectedDays[day];

  const btn = document.querySelector(`button[onclick="toggleDay('${day}')"]`);
  const select = document.getElementById(`${day}-slot`);

  if (selectedDays[day]) {
    btn.classList.add("active");
    select.disabled = false;
  } else {
    btn.classList.remove("active");
    select.disabled = true;
    select.value = "";
  }
}

// ================= RACCOLTA DATI =================

function getAvailability() {
  return {
    venerdi: selectedDays.venerdi
      ? document.getElementById("venerdi-slot").value || "any"
      : null,

    sabato: selectedDays.sabato
      ? document.getElementById("sabato-slot").value || "any"
      : null,

    domenica: selectedDays.domenica
      ? document.getElementById("domenica-slot").value || "any"
      : null
  };
}

// ================= SALVATAGGIO =================

async function saveAvailability() {
  const user = JSON.parse(localStorage.getItem("user"));
  const availability = getAvailability();

  if (!user) {
    alert("Utente non trovato");
    return;
  }

  try {
    await db.collection("users").doc(user.phone).set({
      username: user.username,
      phone: user.phone,
      availability: availability,
      updatedAt: new Date()
    });

    alert("Disponibilità salvata");

    checkMatches(user.phone);

  } catch (error) {
    console.error(error);
    alert("Errore nel salvataggio");
  }
}

// ================= MATCH (BASE) =================

async function checkMatches(myPhone) {
  const myDoc = await db.collection("users").doc(myPhone).get();
  const myData = myDoc.data();

  const snapshot = await db.collection("users").get();

  snapshot.forEach(doc => {
    const user = doc.data();

    if (user.phone === myPhone) return;

    const match = compareAvailability(myData.availability, user.availability);

    if (match) {
      showMatch(user);
    }
  });
}

function compareAvailability(a, b) {
  if (!a || !b) return false;

  return (
    (a.venerdi && b.venerdi && a.venerdi === b.venerdi) ||
    (a.sabato && b.sabato && a.sabato === b.sabato) ||
    (a.domenica && b.domenica && a.domenica === b.domenica)
  );
}

// ================= MATCH UI =================

function showMatch(user) {
  const popup = document.getElementById("matchPopup");
  const text = document.getElementById("matchText");

  text.innerText = `Hai un match con ${user.username}`;

  popup.classList.remove("hidden");

  window.currentMatch = user;
}

function closeMatch() {
  document.getElementById("matchPopup").classList.add("hidden");
}

function sendWhatsApp() {
  const user = window.currentMatch;

  if (!user) return;

  const phone = user.phone;
  const message = encodeURIComponent("Ciao! Match da Looply 👋");

  window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
}

