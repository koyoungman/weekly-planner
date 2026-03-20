# 주간 시간표 웹앱 (Weekly Planner)

주간 시간표를 여러 사람과 공유하고 실시간으로 편집할 수 있는 웹 애플리케이션입니다.

## 주요 기능

- **실시간 동기화**: Firebase Realtime Database를 통해 여러 기기에서 동시 편집
- **일정 관리**: 요일별 시간 블록 추가 / 수정 / 삭제
- **다중 요일 지원**: 하나의 일정을 여러 요일에 동시 등록
- **색상 커스터마이징**: 프리셋 팔레트 및 커스텀 컬러 피커
- **이미지 내보내기**: PNG로 저장해 Widgetsmith 등 iOS 위젯에 활용 가능
- **모바일 대응**: 가로 스크롤로 모바일에서도 사용 가능

## 기술 스택

| 항목 | 내용 |
|------|------|
| 언어 | HTML / CSS / Vanilla JavaScript |
| 레이아웃 | CSS Grid |
| 데이터베이스 | Firebase Realtime Database |
| 이미지 출력 | html2canvas |
| 호스팅 | Netlify |
| 폰트 | Noto Sans KR (Google Fonts) |

## 파일 구조

```
timetable/
├── index.html                    # 메인 진입점
├── style.css                     # 시간표 레이아웃 및 UI 스타일
├── firebase.js                   # Firebase 초기화 및 DB 헬퍼
├── firebase-config.js            # Firebase 설정값 (git 제외)
└── firebase-config.example.js   # 설정 예시 파일
```

## 로컬 설정 방법

1. 저장소 클론
   ```bash
   git clone https://github.com/koyoungman/weekly-planner.git
   ```

2. `firebase-config.example.js`를 `firebase-config.js`로 복사
   ```bash
   cp timetable/firebase-config.example.js timetable/firebase-config.js
   ```

3. `firebase-config.js`에 Firebase 프로젝트 설정값 입력

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
   > Firebase 콘솔 → 프로젝트 설정 → 내 앱에서 확인할 수 있습니다.

4. `index.html`을 브라우저에서 열거나 로컬 서버로 실행

## Firebase 설정

Firebase 콘솔 → Realtime Database → 규칙 탭에서 아래와 같이 설정합니다.

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## 배포 (Netlify)

1. [app.netlify.com](https://app.netlify.com) 접속
2. **Sites → Add new site → Deploy manually**
3. `timetable/` 폴더 전체를 드래그 앤 드롭
4. 생성된 URL을 공유

---

> Built with [Claude Code](https://claude.ai/code) by Anthropic
