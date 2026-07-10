# 상담심리사 홈페이지

정적 HTML/CSS/JS로 만든 1페이지 홈페이지입니다. 서버·비용 없이 GitHub Pages로 무료 운영합니다.

## 폴더 구조

```
counselor-site/
├── index.html          # 페이지 골격
├── css/style.css        # 전체 스타일
├── js/render.js         # data/content.js를 읽어 화면에 렌더링
├── data/content.js      # ★ 내용을 수정하는 유일한 파일
├── assets/               # 프로필 사진 등 이미지
└── favicon.ico
```

## 1. 내용 수정 방법 (HTML 지식 불필요)

일상적인 수정은 **`data/content.js` 파일 하나만** 고치면 됩니다. 메모장이나 VS Code 등으로 열어서
따옴표(`" "`) 안의 글자만 바꾸면 됩니다.

- **소개 문구 변경**: `about.intro`의 따옴표 안 텍스트 수정
- **가치관 추가/삭제**: `values` 배열에 `"새 문장",` 한 줄 추가하거나 지우기
- **이력 추가**: `career` 배열에 `"연도  내용",` 추가
- **상담기법 추가**: `approaches` 배열에 아래 블록을 복사해 추가
  ```js
  {
    title: "새 상담기법 이름",
    summary: "간단한 설명 한두 문장.",
  },
  ```
- **연구/챗봇 추가**: `works` 배열에 아래 블록을 복사해 추가
  ```js
  {
    title: "제목",
    type: "챗봇",              // 챗봇 / 연구 / 프로그램 등 자유롭게
    summary: "간단한 소개.",
    link: "https://...",       // 외부 링크. 없으면 ""
  },
  ```
- **항목 삭제**: 해당 `{ ... },` 블록이나 `"문장",` 줄을 지우면 됩니다.
- **프로필 사진**: 사진 파일을 `assets/` 폴더에 넣고, `content.js`의 `about.photo` 값을
  파일명으로 맞춰주세요 (예: `assets/profile.jpg`). 사진이 없으면 `about.photo: ""`로 두면 됩니다.

수정 후 저장하고 GitHub 저장소에 다시 올리면(commit) 몇 분 내에 사이트에 반영됩니다.
Claude Code에게 "content.js의 이 부분을 이렇게 바꾸고 배포해줘"라고 요청해도 됩니다.

## 2. 로컬에서 미리보기

- 가장 간단한 방법: `index.html` 파일을 더블클릭해 브라우저로 엽니다.
- 또는 터미널에서 이 폴더로 이동한 뒤 간단한 로컬 서버를 띄워도 됩니다.
  ```
  python -m http.server 8000
  ```
  이후 브라우저에서 `http://localhost:8000` 접속.

## 3. 문의 폼 동작 방식

- 방문자가 이름·이메일·문의 내용을 입력하고 "보내기"를 누르면, 방문자의 메일 앱이 열리며
  수신자(`hhu2004@gmail.com`)와 제목·본문이 자동으로 채워집니다.
- 방문자가 메일 앱에서 실제로 "전송"을 눌러야 메일이 발송됩니다. (사이트가 자동으로 대신 보내지 않습니다.)
- 메일 앱이 없는 방문자를 위해, 폼 아래에 이메일 주소를 텍스트로도 표시해 두었습니다.
- 나중에 "폼에서 바로 자동 전송"을 원하면, 무료 폼 서비스인 [Formspree](https://formspree.io)나
  [Web3Forms](https://web3forms.com)로 교체할 수 있습니다. (월 제출 건수 제한 있음, 가입 시 조건 재확인 필요)

## 4. GitHub Pages로 배포하기 (무료)

1. [GitHub](https://github.com)에서 계정을 만들거나 로그인합니다.
2. 새 저장소(Repository)를 만듭니다. 이름 예: `counselor-site`, **Public**으로 생성합니다.
3. 이 폴더의 파일 전체를 저장소에 업로드합니다. (Claude Code가 git 명령으로 대신 올려줄 수 있습니다.)
4. 저장소 페이지에서 **Settings → Pages**로 이동합니다.
5. "Build and deployment"의 Source를 **Deploy from a branch**로, 브랜치는 `main`, 폴더는
   `/ (root)`로 설정하고 저장합니다.
6. 몇 분 뒤 `https://(내아이디).github.io/counselor-site/` 주소에서 사이트가 공개됩니다.

### 개인 도메인 연결 (선택)

`example.com` 같은 개인 도메인을 쓰고 싶다면 도메인 구입 비용(연 1~2만원대)만 별도로 들고,
GitHub Pages에서 도메인 연결 자체는 무료로 지원합니다. 기본값은 무료 `github.io` 주소입니다.

## 5. 참고 링크

- GitHub Pages 공식 문서: https://docs.github.com/pages
- Formspree: https://formspree.io
- Web3Forms: https://web3forms.com
