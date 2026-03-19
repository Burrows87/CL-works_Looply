let currentSlide = 0;

const slidesData = [
  { title: "Benvenuto in Looply 🤙", text: "Trova amici disponibili insieme a te." },
  { title: "Segna quando sei libero 📅", text: "Scegli giorni e momenti della settimana." },
  { title: "Ricevi match 🔥", text: "Looply ti mostra chi è disponibile con te." }
];

/* ---------------- SLIDES ---------------- */

function showSlide(i){
  currentSlide = i;

  document.getElementById("slideTitle").innerText = slidesData[i].title;
  document.getElementById("slideText").innerText = slidesData[i].text;

  document.getElementById("ctaFinal").style.display =
    (i === slidesData.length - 1) ? "block" : "none";

  renderDots();
}

function nextSlide(){
  if(currentSlide < slidesData.length - 1){
    showSlide(currentSlide + 1);
  }
}

function prevSlide(){
  if(currentSlide > 0){
    showSlide(currentSlide - 1);
  }
}

function renderDots(){
  const dots = document.getElementById("dots");
  dots.innerHTML = "";

  slidesData.forEach((_, i)=>{
    const d = document.createElement("span");
    d.innerText = "●";
    if(i === currentSlide) d.classList.add("active");
    dots.appendChild(d);
  });
}

function finishSlides(){
  localStorage.setItem("slidesSeen","true");
  document.getElementById("slides").classList.add("hidden");
  document.getElementById("formLogin").classList.remove("hidden");
}

/* ---------------- LOGIN ---------------- */

document.getElementById("terms").onchange = checkLogin;
document.getElementById("privacy").onchange = checkLogin;

function checkLogin(){
  const t = document.getElementById("terms").checked;
  const p = document.getElementById("privacy").checked;
  document.getElementById("enterBtn").disabled = !(t && p);
}

function login(){
  const name = document.getElementById("username").value;
  if(!name) return alert("Inserisci nome");

  localStorage.setItem("user", name);

  document.getElementById("formLogin").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
}

/* ---------------- DAYS ---------------- */

const daysList = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

const daysContainer = document.getElementById("days");

daysList.forEach(day=>{
  const btn = document.createElement("button");
  btn.innerText = day;

  btn.onclick = ()=>{
    btn.classList.toggle("selected");
  };

  daysContainer.appendChild(btn);
});

/* ---------------- SETTINGS ---------------- */

function openSettings(){
  document.getElementById("app").classList.add("hidden");
  document.getElementById("settings").classList.remove("hidden");
}

function goBack(){
  document.getElementById("settings").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
}

function saveSettings(){
  const notify = document.getElementById("notifyToggle").checked;
  localStorage.setItem("notifications", notify);
}

/* ---------------- PERSONALIZATION ---------------- */

function changeTheme(){
  const theme = document.getElementById("themeSelect").value;

  if(theme === "dark"){
    document.body.style.background = "#121212";
    document.body.style.color = "#ffffff";
  } else {
    document.body.style.background = "#ffffff";
    document.body.style.color = "#000000";
  }

  localStorage.setItem("theme", theme);
}

function changeColor(){
  const color = document.getElementById("colorPicker").value;

  document.documentElement.style.setProperty('--primary', color);
  localStorage.setItem("primaryColor", color);
}

/* ---------------- INIT ---------------- */

window.onload = () => {

  const slidesSeen = localStorage.getItem("slidesSeen");

  if(!slidesSeen){
    document.getElementById("slides").classList.remove("hidden");
    showSlide(0);
  } else {
    document.getElementById("formLogin").classList.remove("hidden");
  }

  const theme = localStorage.getItem("theme");
  const color = localStorage.getItem("primaryColor");

  if(theme){
    document.getElementById("themeSelect").value = theme;
    changeTheme();
  }

  if(color){
    document.getElementById("colorPicker").value = color;
    document.documentElement.style.setProperty('--primary', color);
  }
};
