let zikrList = ["SubhanAllah","Alhamdulillah","Allohu Akbar"];
let index = 0;

let state = JSON.parse(localStorage.getItem("tasbeh")) || {
  count: 0,
  lastDate: new Date().toDateString(),
  streak: 1
};

const countEl = document.getElementById("count");
const zikrEl = document.getElementById("zikr");
const bar = document.getElementById("bar");

function updateUI(){
  countEl.innerText = state.count;
  bar.style.width = (state.count % 100) + "%";
  localStorage.setItem("tasbeh", JSON.stringify(state));
}

function addZikr(){
  state.count++;

  // vibration
  if(navigator.vibrate){
    navigator.vibrate(40);
  }

  // animation
  countEl.style.transform = "scale(1.2)";
  setTimeout(()=>countEl.style.transform="scale(1)",100);

  updateUI();
}

function resetZikr(){
  state.count = 0;
  updateUI();
}

function changeZikr(){
  index = (index + 1) % zikrList.length;
  zikrEl.innerText = zikrList[index];
}

/* streak system */
function checkStreak(){
  let today = new Date().toDateString();

  if(state.lastDate !== today){
    let diff = new Date(today) - new Date(state.lastDate);
    let days = diff / (1000*60*60*24);

    state.streak = days === 1 ? state.streak + 1 : 1;
    state.lastDate = today;
  }
}

checkStreak();
updateUI();