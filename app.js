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

// ================= STATE =================

let selectedDays = {
  venerdi: false,
  sabato: false,
  domenica: false
};

// ================= DOM READY =================

window.addEventListener("DOMContentLoaded", () => {

  const savedName = localStorage.getItem("looply_name");
  const savedPhone = localStorage.getItem("looply_phone");

  if (savedName) document.getElementById("username").value = savedName;
  if (savedPhone) document.getElementById("phone").value = savedPhone;

  document.querySelectorAll(".day-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = btn.getAttribute("data-day");
      toggleDay(day);
    });
  });

  document.querySelectorAll(".slots").forEach(container => {

    const checkboxes = container.querySelectorAll("input");

    checkboxes.forEach(cb => {

      cb.addEventListener("change", () => {

        const always = container.querySelector(".always");

        if (cb.classList.contains("always") && cb.checked) {
          checkboxes.forEach(c => {
            if (c !== always) c.checked = false;
          });
        } else if (!cb.classList.contains("always") && cb.checked) {
          if (always) always.checked = false;
        }

        const anyChecked = Array.from(checkboxes).some(c => c.checked);

        if (!anyChecked && always) {
          always.checked = true;
        }

      });

    });

  });

  setupFormValidation();
});

// ================= FORM VALIDATION =================

function setupFormValidation() {

  const btn = document.getElementById("enterBtn");

  function checkForm() {
    const name = document.getElementById("username").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const terms = document.getElementById("terms").checked;
    const privacy = document.getElementById("privacy").checked;

    btn.disabled = !(name && phone && terms && privacy);
  }

  document.getElementById("username").addEventListener("input", checkForm);
  document.getElementById("phone").addEventListener("input", checkForm);
  document.getElementById("terms").addEventListener("change", checkForm);
  document.getElementById("privacy").addEventListener("change", checkForm);

  checkForm();
}

// ================= LOGIN =================

window.login = async function () {

  const name = document.getElementById("username").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const remember = document.getElementById("rememberMe")?.checked;
  const terms = document.getElementById("terms").checked;
  const privacy = document.getElementById("privacy").checked;

  if (!name || !phone) {
    alert("Inserisci nome e telefono");
    return;
  }

  if (!terms || !privacy) {
    alert("Devi accettare termini e privacy");
    return;
  }

  try {
    const result = await auth.signInAnonymously();
    currentUser = result.user.uid;

    await db.collection("users").doc(currentUser).set({
      name,
      phone,
      createdAt: new Date(),
      termsAccepted: terms,
      privacyAccepted: privacy
    });

    if (remember) {
      localStorage.setItem("looply_name", name);
      localStorage.setItem("looply_phone", phone);
    } else {
      localStorage.removeItem("looply_name");
      localStorage.removeItem("looply_phone");
    }

    document.getElementById("formLogin").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

// ================= TOGGLE DAY =================

window.toggleDay = function(day) {

  const btn = document.querySelector(`[data-day="${day}"]`);
  const slots = document.getElementById(`${day}-slots`);

  selectedDays[day] = !selectedDays[day];

  if (selectedDays[day]) {
    btn.classList.add("active");
    slots.classList.remove("disabled");

    slots.querySelectorAll("input").forEach(cb => {
      cb.disabled = false;
      cb.checked = false;
    });

    const always = slots.querySelector(".always");
    if (always) always.checked = true;

  } else {
    btn.classList.remove("active");
    slots.classList.add("disabled");

    slots.querySelectorAll("input").forEach(cb => {
      cb.checked = false;
      cb.disabled = true;
    });
  }
};

// ================= GET AVAILABILITY =================

function getAvailability() {

  function getDaySlots(day) {

    if (!selectedDays[day]) return null;

    const container = document.getElementById(`${day}-slots`);

    const checked = Array.from(container.querySelectorAll("input:checked"))
      .map(cb => cb.value);

    return checked.length > 0 ? checked : ["any"];
  }

  return {
    venerdi: getDaySlots("venerdi"),
    sabato: getDaySlots("sabato"),
    domenica: getDaySlots("domenica")
  };
}

// ================= MATCHING =================

async function findMatches() {

  if (!currentUser) return [];

  const currentUserDoc = await db.collection("users").doc(currentUser).get();
  const myData = currentUserDoc.data();

  const usersSnapshot = await db.collection("users").get();

  const myAvailability = myData.availability || {};

  let matches = [];

  usersSnapshot.forEach(doc => {

    if (doc.id === currentUser) return;

    const user = doc.data();
    const otherAvailability = user.availability || {};

    const commonDays = [];

    for (let day in myAvailability) {

      if (!myAvailability[day] || !otherAvailability[day]) continue;

      const mySlots = myAvailability[day];
      const otherSlots = otherAvailability[day];

      const hasMatch =
        mySlots.includes("any") ||
        otherSlots.includes("any") ||
        mySlots.some(slot => otherSlots.includes(slot));

      if (hasMatch) {
        commonDays.push(day);
      }
    }

    if (commonDays.length > 0) {
      matches.push({
        name: user.name,
        phone: user.phone,
        days: commonDays
      });
    }

  });

  return matches;
}

async function showMatches() {

  const matches = await findMatches();

  if (matches.length === 0) {
    alert("Nessun match trovato");
    return;
  }

  const match = matches[0];

  const daysText = match.days.join(", ");

  document.getElementById("matchText").innerText =
    `Tu e ${match.name} siete liberi: ${daysText}. Scrivigli su WhatsApp!`;

  window.currentMatch = match;

  document.getElementById("matchPopup").classList.remove("hidden");
}

// ================= SAVE =================

window.saveAvailability = async function () {

  if (!currentUser) {
    alert("Utente non loggato");
    return;
  }

  const availability = getAvailability();

  try {
    await db.collection("users").doc(currentUser).set({
      availability
    }, { merge: true });

    await showMatches();

  } catch (error) {
    console.error(error);
    alert("Errore nel salvataggio");
  }
};

// ================= WHATSAPP =================

window.sendWhatsApp = function () {

  if (!window.currentMatch) return;

  const phone = window.currentMatch.phone;

  const message = encodeURIComponent(
    `Ciao! Ho visto su Looply che siamo liberi ${window.currentMatch.days.join(", ")}. Ti va di uscire?`
  );

  const url = `https://wa.me/${phone}?text=${message}`;

  window.open(url, "_blank");
};

// ================= MATCH POPUP =================

window.closeMatch = function () {
  document.getElementById("matchPopup").classList.add("hidden");
};
