/********************************
 *       FIREBASE SETUP        *
 ********************************/
const firebaseConfig = {
  apiKey:    "AIzaSyAergJXFvSJ02ssEknNHIy3z98URLgACh8",
  authDomain:"chess-web-78351.firebaseapp.com",
  databaseURL:"https://chess-web-78351-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chess-web-78351",
  storageBucket:"chess-web-78351.appspot.com",
  messagingSenderId:"148362297683",
  appId:     "1:148362297683:web:9c1f7f8e7b561aad8ba1a6"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/********************************
 *        GLOBAL STATE         *
 ********************************/
const boardContainer = document.getElementById("board-container");
const waitingModal   = document.getElementById("waiting-modal");
const winnerModal    = document.getElementById("winner-modal");
const winnerText     = document.getElementById("winner-text");
const restartBtn     = document.getElementById("modal-restart-btn");
const capWhiteDiv    = document.getElementById("captured-white");
const capBlackDiv    = document.getElementById("captured-black");
const whiteClockDiv  = document.getElementById("white-clock");
const blackClockDiv  = document.getElementById("black-clock");

let boardState = [];
let selectedSquare = null;
let validMoves = [];
let turn = "white";
let castlingRights = {wK:true,wQ:true,bK:true,bQ:true};
let enPassantTarget = null;
let halfmoveClock = 0, fullmoveNumber = 1;
let whiteTime = 600, blackTime = 600, clockInterval=null;
let myColor = null, gameId = null, isRemote=false;
const currentUID = `uid_${Date.now()}`;

/* piece image map */
const pieceImages = {
  wP:"/wP.svg", wR:"/wR.svg", wN:"/wN.svg",
  wB:"/wB.svg", wQ:"/wQ.svg", wK:"/wK.svg",
  bP:"/bP.svg", bR:"/bR.svg", bN:"/bN.svg",
  bB:"/bB.svg", bQ:"/bQ.svg", bK:"/bK.svg"
};

/********************************
 *         HELPERS             *
 ********************************/
function formatTime(sec){
  const m=Math.floor(sec/60).toString().padStart(2,"0");
  const s=(sec%60).toString().padStart(2,"0");
  return `${m}:${s}`;
}
function updateClocks(){
  whiteClockDiv.textContent = formatTime(whiteTime);
  blackClockDiv.textContent = formatTime(blackTime);
  if(turn==="white"){
    whiteClockDiv.classList.add("active-clock");
    blackClockDiv.classList.remove("active-clock");
  } else {
    blackClockDiv.classList.add("active-clock");
    whiteClockDiv.classList.remove("active-clock");
  }
}
function startClock(){
  clearInterval(clockInterval);
  clockInterval = setInterval(()=>{
    if(turn==="white"){ whiteTime--; if(whiteTime<0) endGame("Black"); }
    else { blackTime--; if(blackTime<0) endGame("White"); }
    updateClocks();
  },1000);
}
function stopClock(){ clearInterval(clockInterval); }
function openModal(w){
  winnerText.textContent = `Winner: ${w}`;
  winnerModal.style.display = "flex";
  stopClock();
}
function endGame(winner){
  openModal(winner);
  if(gameId) db.ref(`games/${gameId}`).update({winner, status:"finished"});
}
function isWhite(c){ return c&&c.startsWith("w"); }
function isBlack(c){ return c&&c.startsWith("b"); }
function opp(s){ return s==="white"?"black":"white"; }
function getSquare(r,c){
  return document.querySelector(`.square[data-row="${r}"][data-col="${c}"]`);
}

/********************************
 *     RENDER & HIGHLIGHT      *
 ********************************/
function createBoard(){
  boardContainer.innerHTML="";
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const sq=document.createElement("div");
      sq.className="square "+((r+c)%2===0?"light":"dark");
      sq.dataset.row=r; sq.dataset.col=c;
      sq.addEventListener("click", ()=>onSquareClick(r,c));
      boardContainer.appendChild(sq);
    }
  }
}
function render(){
  document.querySelectorAll("img.piece").forEach(x=>x.remove());
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const code = boardState[r][c];
    if(code){
      const img=document.createElement("img");
      img.src=pieceImages[code]; img.className="piece";
      if(myColor==="black") img.style.transform="rotate(180deg)";
      getSquare(r,c).appendChild(img);
    }
  }
}
function updateHighlights(){
  document.querySelectorAll(".selected, .highlight")
    .forEach(el=>el.classList.remove("selected","highlight"));
  if(selectedSquare){
    const {r,c} = selectedSquare;
    getSquare(r,c).classList.add("selected");
    validMoves.forEach(m=>getSquare(m.row,m.col).classList.add("highlight"));
  }
}

/********************************
 *      LEGAL MOVES LOGIC      *
 ********************************/
// ... include your complete getLegalMoves as you provided above ...
// ... include isSquareAttacked, isInCheck etc exactly as in your code ...

/********************************
 *       MAKE & SYNC MOVE      *
 ********************************/
function makeMoveInternal(from,to,meta,isRemoteMove=false){
  // exactly your makeMoveInternal logic ...
  // at end, if !isRemoteMove then:
  if(!isRemoteMove && gameId){
    db.ref(`games/${gameId}/state`).set({boardState, turn});
  }
}

/********************************
 *     CLICK HANDLER & INIT    *
 ********************************/
function onSquareClick(r,c){
  if(!myColor || turn!==myColor) return;
  // exactly your onSquareClick logic ...
}

function initGameLocal(){
  // clear captured
  capWhiteDiv.innerHTML=""; capBlackDiv.innerHTML="";
  whiteTime=blackTime=600; turn="white";
  updateClocks(); startClock();
  boardState = [
    ["bR","bN","bB","bQ","bK","bB","bN","bR"],
    ["bP","bP","bP","bP","bP","bP","bP","bP"],
    ["","","","","","","",""],["","","","","","","",""],
    ["","","","","","","",""],["","","","","","","",""],
    ["wP","wP","wP","wP","wP","wP","wP","wP"],
    ["wR","wN","wB","wQ","wK","wB","wN","wR"]
  ];
  selectedSquare=null; validMoves=[]; castlingRights={wK:true,wQ:true,bK:true,bQ:true}; 
  enPassantTarget=null; halfmoveClock=0; fullmoveNumber=1;
  render(); updateHighlights();
}

/********************************
 *    MATCHMAKING & SYNC      *
 ********************************/
function startMatchmaking(){
  waitingModal.style.display="flex";
  const gamesRef = db.ref("games");
  // try join waiting
  gamesRef.orderByChild("status").equalTo("waiting").limitToFirst(1)
    .once("value",snap=>{
      const val=snap.val();
      if(val){
        const key=Object.keys(val)[0];
        gameId=key; myColor="black";
        db.ref(`games/${gameId}/players/black`).set({uid:currentUID})
          .then(()=>db.ref(`games/${gameId}`).update({status:"playing"}))
          .then(()=>onMatchFound());
      } else {
        const newG = gamesRef.push();
        gameId=newG.key; myColor="white";
        newG.set({status:"waiting",players:{white:{uid:currentUID}},state:null,winner:null});
      }
    });
}

function onMatchFound(){
  waitingModal.style.display="none";
  if(myColor==="black") boardContainer.style.transform="rotate(180deg)";
  if(myColor==="white"){
    initGameLocal();
    db.ref(`games/${gameId}/state`).set({boardState,turn});
  }
  // listen updates
  db.ref(`games/${gameId}/state`).on("value",snap=>{
    const s=snap.val();
    boardState=s.boardState; turn=s.turn;
    updateClocks(); render(); updateHighlights();
  });
  db.ref(`games/${gameId}/winner`).on("value",snap=>{
    if(snap.val()) openModal(snap.val());
  });
}

// restart
restartBtn.addEventListener("click",()=>{
  db.ref(`games/${gameId}/state`).off();
  db.ref(`games/${gameId}/winner`).off();
  gameId=myColor=null;
  boardContainer.style.transform="rotate(0deg)";
  initGameLocal(); startMatchmaking();
  winnerModal.style.display="none";
});

// load
window.addEventListener("load",()=>{
  createBoard();
  initGameLocal();
  startMatchmaking();
});