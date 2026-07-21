# 상담심리사 홈페이지

허훈 상담심리사의 개인 홈페이지입니다. 정적 HTML/CSS/JS 프런트엔드에, 문구를 웹에서 바로
수정할 수 있는 **관리자 편집 기능**(비밀번호 로그인)을 Vercel 서버리스 함수 + Vercel의
Redis 데이터베이스로 붙였습니다. 호스팅은 **Vercel**을 사용합니다(무료 요금제로 충분).

## 폴더 구조

```
counselor-site/
├── index.html            # 공개 페이지 골격
├── css/style.css          # 전체 스타일
├── js/render.js           # 콘텐츠를 읽어 화면에 렌더링 (수정 불필요)
├── data/content.json      # 콘텐츠 기본값(seed) — Redis가 비어있을 때 사용됨
├── admin/                 # 관리자 로그인·편집 페이지 (/admin)
│   ├── index.html
│   ├── admin.js
│   └── admin.css
├── api/                   # Vercel 서버리스 함수
│   ├── content.js         # GET(공개) / PUT(로그인 필요) — 콘텐츠 조회·저장
│   ├── login.js           # POST — 비밀번호 확인 후 세션 발급
│   ├── logout.js          # POST — 세션 삭제
│   ├── session.js         # GET — 로그인 상태 확인
│   └── _lib/               # 쿠키·세션 공용 헬퍼
├── assets/                # 프로필 사진, 히어로 배경 등 이미지
├── package.json           # redis(node-redis) 의존성
└── favicon.svg
```

## 1. 문구 수정 방법 — 관리자 페이지에서 바로 수정 (권장)

1. 사이트 주소 뒤에 `/admin`을 붙여 접속합니다. 예: `https://(내사이트).vercel.app/admin`
2. 비밀번호를 입력해 로그인합니다. (비밀번호는 Vercel 프로젝트의 환경변수 `ADMIN_PASSWORD`로 설정 — 5장 참고)
3. 소개 문구, 학력·자격·경력, 활동, 상담기법, 연구·칼럼, 문의 문구 등을 화면에서 바로 수정합니다.
   목록 항목은 "+ 항목 추가" 버튼으로 늘리고, "삭제" 버튼으로 지울 수 있습니다.
4. 하단의 **저장하기**를 누르면 즉시 실제 사이트에 반영됩니다. 코드나 git을 몰라도 됩니다.

> 로그인 세션은 7일간 유지됩니다. 다른 사람이 접근하지 못하도록 비밀번호는 안전하게 보관하세요.

### (참고) 코드로 직접 수정하고 싶을 때

`data/content.json`은 관리자 페이지에서 아직 한 번도 저장하지 않았을 때 사용되는 **기본값**입니다.
이 파일을 직접 고쳐 git에 올려도 되지만, 관리자 페이지에서 한 번이라도 저장하면 그 이후에는
Redis에 저장된 내용이 우선 표시됩니다. 되도록 관리자 페이지 사용을 권장합니다.

## 2. 로컬에서 미리보기

- 가장 간단한 방법: `index.html`을 브라우저로 엽니다. (이 경우 `/api`가 없어 `data/content.json` 기본값으로 보입니다.)
- 또는 터미널에서 이 폴더로 이동한 뒤:
  ```
  python -m http.server 8000
  ```
  `http://localhost:8000` 접속. (관리자 로그인·저장 기능은 Vercel에 배포해야 동작합니다.)

## 3. 문의(Contact) 동작 방식

- 입력 폼 없이 이메일 주소(`hhu2004@gmail.com`)만 안내합니다. 방문자가 이메일 버튼을 누르면
  본인 메일 앱이 열리고, 방문자가 직접 "전송"을 눌러야 메일이 발송됩니다.
- 전화번호는 정책상 사이트 어디에도 표기하지 않습니다.

## 4. Vercel로 배포하기

1. [vercel.com](https://vercel.com)에서 GitHub 계정으로 로그인합니다.
2. **Add New → Project**에서 이 GitHub 저장소(`Doubleh-rayn/moonlight-psycounselor`)를 선택해 Import합니다.
   프레임워크는 자동 감지되지 않으면 **Other**로 두면 됩니다(별도 빌드 명령 필요 없음).
3. **Deploy**를 누르면 몇 분 내 `https://(프로젝트명).vercel.app` 주소로 사이트가 공개됩니다.
   이 시점에는 아직 관리자 저장 기능이 동작하지 않습니다(5장 진행 필요).

### 개인 도메인 연결 (선택)

Vercel 프로젝트 설정의 **Domains**에서 개인 도메인을 무료로 연결할 수 있습니다. 도메인 자체
구입 비용(연 1~2만원대)만 별도로 듭니다.

## 5. 관리자 편집 기능 활성화 (Redis + 비밀번호 설정)

관리자 페이지가 실제로 저장을 하려면 **Redis(무료 데이터베이스)**와 **관리자 비밀번호**를
한 번만 연결해주면 됩니다.

1. Vercel 프로젝트 페이지 → **Storage** 탭 → **Create Database** → **Redis**(Vercel 공식) 선택.
2. "고가용성"을 **None · 무료 요금제 친화적**으로 바꾸면 **무료 — 30MB** 플랜이 나타납니다. 선택 후 생성.
3. 생성된 데이터베이스를 이 프로젝트에 **Connect**합니다. (환경변수 `REDIS_URL`이 자동으로 추가됩니다.)
4. 프로젝트 **Settings → Environment Variables**에서 새 변수를 추가합니다.
   - Key: `ADMIN_PASSWORD`
   - Value: 원하는 비밀번호 (다른 사람이 추측하기 어려운 것으로)
   - Environment: Production(및 필요 시 Preview)에 체크
5. **Settings → Deployments**에서 최신 배포를 **Redeploy**합니다. (환경변수는 재배포 후 적용됩니다.)
6. 이제 `/admin`에서 방금 설정한 비밀번호로 로그인하면 저장 기능이 정상 동작합니다.

> 비밀번호는 절대 코드나 git, 대화 기록에 남기지 마세요. Vercel 환경변수에만 저장하세요.
> 비밀번호를 바꾸고 싶으면 이 환경변수 값만 수정하고 재배포하면 됩니다.

## 6. GitHub 저장소의 역할

코드는 계속 GitHub 저장소(`Doubleh-rayn/moonlight-psycounselor`)에서 관리합니다. Vercel이 이
저장소를 보고 있으므로, `main` 브랜치에 새 커밋을 올리면(Claude Code가 대신 올려줄 수 있음)
Vercel이 자동으로 재배포합니다. 단, **관리자 페이지에서 저장한 문구는 git과 별개로 Redis에
저장**되므로, 코드를 새로 올려도 사라지지 않습니다.

## 7. 참고 링크

- Vercel 문서: https://vercel.com/docs
- Vercel Redis(Marketplace) 문서: https://vercel.com/marketplace/redis
