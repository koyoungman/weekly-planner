# 시간표 웹앱 (Timetable Web App)

## 프로젝트 개요

주간 시간표를 여러 사람과 공유하며 실시간으로 편집할 수 있는 웹 애플리케이션.
이미지 내보내기를 통해 Widgetsmith 등 iOS 위젯 앱에 붙여넣기 가능.

- **타겟 플랫폼**: 브라우저 (PC / 모바일)
- **호스팅**: Netlify (정적 파일 배포, 드래그앤드롭)
- **데이터 저장 및 동기화**: Firebase Realtime Database (실시간)
- **빌드 도구**: 없음 (순수 HTML/CSS/JS, 번들러 불필요)

---

## 기술 스택

- **언어**: HTML / CSS / Vanilla JavaScript (프레임워크 없음)
- **스타일**: CSS Grid 기반 시간표 레이아웃
- **DB**: Firebase Realtime Database
- **이미지 출력**: html2canvas
- **외부 라이브러리 (모두 CDN)**:
  - Firebase App: `https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js`
  - Firebase Database: `https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js`
  - html2canvas: `https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js`
  - Google Fonts (Noto Sans KR): `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap`

---

## 파일 구조

```
timetable/
├── index.html                    # 메인 진입점 (HTML 구조 + 스크립트 로드)
├── style.css                     # 시간표 레이아웃 및 전체 UI 스타일
├── firebase.js                   # Firebase 초기화 및 DB 헬퍼 함수
├── firebase-config.js            # Firebase 설정값 (gitignore 처리, 공유 금지)
├── firebase-config.example.js   # 설정 예시 파일 (git에 포함)
└── app.js                        # 앱 로직 (렌더링, 모달, 이벤트 처리)
```

> `firebase-config.js`는 `.gitignore`에 등록되어 있으므로 git에 올라가지 않음.
> 새로 클론한 경우 `firebase-config.example.js`를 복사해 설정값을 채워야 함.

---

## Firebase 설정

### firebase-config.js 구조
Firebase 설정값은 `firebase-config.js`에만 집중시킨다. 이 파일은 gitignore 처리되어 있음.

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### firebase.js 구조
`firebase-config.js`가 먼저 로드된 뒤 `firebaseConfig`를 사용해 초기화한다.

```js
// firebaseConfig는 firebase-config.js 에서 로드 (gitignore 처리)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const eventsRef = db.ref('/events');

// Firebase push key를 id 필드에도 함께 저장
function dbAdd(event) {
  const ref = eventsRef.push();
  return ref.set({ ...event, id: ref.key });
}
function dbUpdate(id, event) { return eventsRef.child(id).set(event); }
function dbRemove(id) { return eventsRef.child(id).remove(); }
function dbSubscribe(callback) { eventsRef.on('value', snap => callback(snap.val())); }
```

### Firebase Realtime Database 보안 규칙
Firebase 콘솔 → Realtime Database → 규칙 탭에서 아래로 설정.
가족 내부 공유 용도이므로 인증 없이 단순 읽기/쓰기 허용.

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

---

## 데이터 구조 (Firebase Realtime Database)

Firebase 경로: `/events/{pushKey}`

```json
{
  "events": {
    "-NxAbc123": {
      "id": "-NxAbc123",
      "title": "피아노",
      "days": ["mon"],
      "startTime": "13:00",
      "endTime": "13:30",
      "color": "#FFD166"
    },
    "-NxDef456": {
      "id": "-NxDef456",
      "title": "등원",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "startTime": "08:30",
      "endTime": "09:00",
      "color": "#e8eaf0"
    }
  }
}
```

- `id`: Firebase push key (자동 생성, UUID 불필요)
- `days`: 요일 배열 (`"mon"`,`"tue"`,`"wed"`,`"thu"`,`"fri"`)
- `days`가 5개 전부이면 시간표 전체 너비 span 블록으로 렌더링
- `color`: HEX 색상 문자열

---

## 핵심 기능 요구사항

### 1. 시간표 표시
- 요일 컬럼: 월 / 화 / 수 / 목 / 금
- 시간 행: 08:00 ~ 20:00, 30분 단위 (총 24슬롯)
- CSS Grid: `grid-template-columns: 56px repeat(5, 1fr)`
- 정시(00분)만 시간 레이블 표시, 30분은 빈 레이블

### 2. 일정 블록 렌더링
- 시작/종료 시간으로 블록 높이 결정 (`슬롯 수 × CELL_HEIGHT px`)
- 제목 + 시간 텍스트 중앙 정렬
- 배경색 명도 계산으로 텍스트 색상 자동 결정
  - `(R×0.299 + G×0.587 + B×0.114) > 160` → 어두운 텍스트, 이하 → 흰색
- 전체 요일 span 블록: `position: absolute`로 시간표 전체 너비 오버레이
- 블록 hover 시 밝기 변화 효과

### 3. 일정 추가 / 편집 모달
- 빈 셀 클릭 → 추가 모달 (클릭한 요일/시간 자동 입력)
- 기존 블록 클릭 → 편집 모달 (기존 값 자동 채움)
- `e.stopPropagation()`으로 블록 클릭이 셀 클릭으로 전파되지 않도록 처리
- 모달 필드:
  - 제목 (text input)
  - 요일 (체크박스 다중 선택: 월/화/수/목/금)
  - 시작 시간 (select, 08:00~19:30, 30분 단위)
  - 종료 시간 (select, 08:30~20:00, 30분 단위)
  - 배경 색상 (프리셋 팔레트 + 커스텀 컬러 피커)
- 편집 모달에만 삭제 버튼 노출
- `<dialog>` 태그 + `showModal()` / `close()` 사용

### 4. Firebase 실시간 동기화
- 페이지 로드 시 `dbSubscribe()`로 `/events` 실시간 구독
- 데이터 변경 시 자동으로 `render()` 재호출 → 즉시 반영
- 추가: `dbAdd(event)`
- 수정: `dbUpdate(id, event)`
- 삭제: `dbRemove(id)`
- 한 명이 수정하면 다른 브라우저에서도 즉시 갱신됨

### 5. 이미지 내보내기
- "이미지로 저장" 버튼
- `html2canvas(document.getElementById('timetable-wrapper'), { scale: 2 })`
- PNG 파일로 자동 다운로드 (`시간표.png`)

---

## UI/UX 요구사항

- 전체 배경: `#f0f2f5` (연한 회색)
- 시간표 카드: 흰색, `border-radius: 16px`, `box-shadow`
- 폰트: Noto Sans KR
- 요일 헤더: 상단 고정, 하단 구분선, 연한 배경색
- 시간 레이블: 좌측 컬럼 고정, 우측 정렬, 연한 텍스트
- 일정 블록: `border-radius: 7px`, hover 시 `filter: brightness(0.93)`
- 모달: 반투명 backdrop, `border-radius: 16px`
- 모바일 대응: 시간표 영역 가로 스크롤 허용 (`overflow-x: auto`)

---

## 구현 시 주의사항

- CDN 로드 순서 필수: `firebase-app-compat` → `firebase-database-compat` → `html2canvas` → `firebase-config.js` → `firebase.js` → `app.js`
- 시간 → 슬롯 변환: `(hour - 8) * 2 + (min >= 30 ? 1 : 0)`
- 슬롯 → 시간 변환: `hour = 8 + Math.floor(slot/2)`, `min = slot%2 === 0 ? '00' : '30'`
- Firebase `snap.val()`은 데이터 없을 때 `null` 반환 → null 체크 필수
- Firebase push key는 `-N`으로 시작하는 문자열 → id 필드에도 동일값 저장
- 전체 span 블록은 `#timetable-body`에 absolute로 붙이되, 첫 번째 day-cell의 `offsetLeft`, `offsetTop` 기준으로 위치 계산
- html2canvas 캡처 대상: `#timetable-wrapper` (카드 전체)

---

## GitHub 레포지토리

- URL: https://github.com/koyoungman/weekly-planner
- 기본 브랜치: `develop`

---

## 배포 방법 (Netlify)

1. [app.netlify.com](https://app.netlify.com) 접속 및 가입
2. **Sites → Add new site → Deploy manually**
3. `timetable/` 폴더 전체를 드래그 앤 드롭
4. 자동 URL 생성 (`https://랜덤이름.netlify.app`)
5. 해당 URL을 공유할 사람에게 전송하면 끝

> 파일 수정 후 재배포 시 동일하게 드래그앤드롭. URL은 유지됨.
> Firebase에 데이터가 저장되므로 재배포해도 시간표 데이터는 유지됨.

---

## 향후 확장 고려 (현재 구현 불필요)

- Firebase Authentication으로 편집 권한 제한 (읽기는 공개, 쓰기는 로그인 필요)
- 주차별 다른 시간표 (`/weeks/2025-W01/events`)
- 변경 이력 (Firebase timestamp 활용)
- 다크모드