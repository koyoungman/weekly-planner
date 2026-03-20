// firebaseConfig는 firebase-config.js 에서 로드 (gitignore 처리)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const eventsRef = db.ref('/events');

// Firebase push key를 id 필드에도 함께 저장
function dbAdd(event) {
  const ref = eventsRef.push();
  return ref.set({ ...event, id: ref.key });
}

function dbUpdate(id, event) {
  return eventsRef.child(id).set(event);
}

function dbRemove(id) {
  return eventsRef.child(id).remove();
}

function dbSubscribe(callback) {
  eventsRef.on('value', snap => callback(snap.val()));
}
