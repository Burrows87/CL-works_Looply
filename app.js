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

// ================= AVAILABILITY =================

const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const slots = ["Mattina", "Pomeriggio", "Sera"];

const availability = {};

function createDaysUI() {

  const container = document.getElementById("daysContainer");

  days.forEach(day => {

    const div = document.createElement("div");

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

    div.appendChild(dayBtn);
    div.appendChild(slotDiv);

    container.appendChild(div);
  });

}

// ================= SAVE =================

window.saveAvailability = async function () {

  if (!currentUser) return alert("Non loggato");

  await db.collection("availability").doc(currentUser).set({
    userId: currentUser,
    data: availability
  });

  alert("Salvato!");

  checkMatches();
};

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

async function showMatch(day, slots, userId) {

  currentMatchUser = userId;

  const userDoc = await db.collection("users").doc(userId).get();
  const user = userDoc.data();

  document.getElementById("matchText").innerText =
    `${user.name} - ${day} (${slots.join(", ")})`;

  document.getElementById("matchPopup").classList.remove("hidden");
}

window.closeMatch = function () {
  document.getElementById("matchPopup").classList.add("hidden");
};

// ================= WHATSAPP =================

window.sendWhatsApp = async function () {

  const otherDoc = await db.collection("users").doc(currentMatchUser).get();
  const other = otherDoc.data();

  const meDoc = await db.collection("users").doc(currentUser).get();
  const me = meDoc.data();

  const msg = `Ciao ${other.name}! Sono ${me.name} da Looply 😊`;

  const url = `https://wa.me/${other.phone}?text=${encodeURIComponent(msg)}`;

  window.open(url, "_blank");
};

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
