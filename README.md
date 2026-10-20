# 구세군오산교회 홈페이지

> 구세군 대구사랑교회 홈페이지(2026)를 포크해 오산교회용으로 바꾼 저장소입니다.

정적 사이트 + 깃 기반 관리자 화면. 서버 없이 운영되며 호스팅 비용이 들지 않습니다.

- **기획 문서**: [PLAN.md](./PLAN.md)
- **기술**: Astro 5 · Tailwind CSS 4 · Sveltia CMS · Cloudflare Pages

---

## 폴더 구조

```
saosan/
├─ PLAN.md              기획 문서 (결정 사항·자료 정리)
├─ 자료/                 원본 자료 (주보, 로고, 폰트)
└─ site/                홈페이지 본체
   ├─ public/
   │  ├─ admin/         관리자 화면 설정
   │  ├─ fonts/         구세군체 웹폰트 (woff2)
   │  └─ images/        웹용 이미지
   └─ src/
      ├─ data/church.ts    교회 기본정보 · 예배시간 · 비전 · 사관
      ├─ content/notices/  공지사항 (파일 1개 = 글 1개)
      ├─ content/videos/   영상 직접 등록 (일부공개·예전 영상)
      ├─ pages/            각 페이지
      └─ components/       머리글 · 바닥글 등
```

## 내 컴퓨터에서 실행

```bash
npm --prefix site install
npm --prefix site run dev
```

`http://localhost:4321` 로 접속합니다.

---

## 내용 수정하는 법

### 예배 시간, 주소, 전화번호가 바뀌었을 때

관리자 화면(`/admin`) → 사이트 설정에서 고칩니다.
(파일로는 `site/src/data/settings/*.json`, 기본값은 `site/src/data/church.ts`)

### 공지사항 올리기

`site/src/content/notices/` 에 마크다운 파일을 하나 만듭니다.
파일 이름이 곧 주소가 됩니다.

```markdown
---
title: 제목
date: 2026-08-02
category: 공지 # 공지 / 행사 / 모집 / 기도
pinned: false # true 로 하면 목록 맨 위 고정
summary: 목록에 보일 한 줄 요약
---

본문 내용
```

**게재하지 않는 항목** (개인정보 보호)

- 헌금자 명단, 봉사위원 명단
- 사관 개인 연락처, 휴가·부재 일정
- 개인 경조사, 환우, 심방 대상
- 타 교회 내부 행사

### 영상 올리기

유튜브에 **공개**로 올린 최근 영상은 등록할 필요가 없습니다. 홈페이지가
채널에서 자동으로 불러옵니다. 제목에 '설교'가 들어 있으면 설교 목록으로,
아니면 행사 스케치 목록으로 자동 분류됩니다.

다만 유튜브가 자동으로 내주는 목록은 **채널 전체에서 최근 15개까지**가
한계입니다. 그래서 다음 두 경우는 직접 등록해야 합니다.

1. **일부공개** 영상 — 채널 목록에 뜨지 않음
2. 최근 15개보다 **예전에 올린** 영상

관리자 화면의 **‘영상 직접 추가’** 에서 주소를 붙여넣으면 됩니다.
파일로 직접 만들 때는 `site/src/content/videos/` 에 이렇게 씁니다.

```markdown
---
category: event # sermon(설교) / event(행사 스케치)
title: 2026 여름성경학교 스케치
date: 2026-02-01
youtubeUrl: https://www.youtube.com/watch?v=xxxxxxxxxxx
---
```

등록한 영상은 자동으로 불러온 영상들과 **한 목록으로 합쳐져** 날짜순으로
나옵니다. 같은 영상이 양쪽에 있으면 직접 등록한 쪽이 우선합니다.

> ⚠️ 일부공개 영상을 등록하면 홈페이지 방문자 누구나 볼 수 있습니다.
> 성도 개인이 드러나는 장면이 있는지 확인 후 등록해 주세요.

목록에 몇 개까지 보여줄지는 관리자 화면 → 사이트 설정 → **‘영상 노출 개수’**
에서 정합니다.

---

## 배포 설정 (Cloudflare Pages)

저장소를 연결한 뒤 아래 값으로 설정합니다.

| 항목 | 값 |
| --- | --- |
| 프레임워크 사전 설정 | Astro |
| 빌드 명령 | `npm run build` |
| 빌드 출력 디렉터리 | `dist` |
| 루트 디렉터리 | `site` |

### 영상 목록 자동 갱신

영상은 세 군데에서 채워집니다.

1. **홈페이지를 만들 때** 유튜브에서 가져옵니다.
2. **화면이 열린 뒤** `/api/videos` 로 최신 목록을 받아 조용히 갈아끼웁니다.
   그래서 새 영상을 올리면 다시 만들지 않아도 반영됩니다.
3. 1번이 실패하면 **저장해 둔 사본**(`site/src/data/videos-cache.json`)을 씁니다.

3번이 필요한 이유 — 유튜브 RSS 는 심심찮게 404·500 을 돌려줍니다.
관리자 화면에서 뭘 저장할 때마다 홈페이지를 다시 만드는데, 그때 마침
유튜브가 실패하면 영상이 통째로 사라져 버립니다. 사본이 있으면 그런 일이
생기지 않습니다. (실제로 이 문제가 있었고, 그래서 사본을 두게 되었습니다)

사본은 `.github/workflows/update-video-cache.yml` 이 **매일 오전 6시**에
갱신합니다. 따로 준비할 것은 없습니다. 손으로 갱신하려면:

```bash
node scripts/update-video-cache.mjs
```

---

## 도메인을 바꿀 때

주소가 바뀌어도 페이지 링크·이미지·폰트·유튜브 연동은 그대로 따라옵니다.
바꿔야 할 곳은 **두 군데뿐**입니다.

### 1. 저장소에서 (한 줄)

`site/site-url.mjs` 의 `SITE_URL` 을 새 주소로 바꾸고 커밋합니다.

```js
export const SITE_URL = "https://구세군오산교회.kr";
```

이 한 줄이 아래 세 곳에 자동 반영됩니다.

- 사이트 설정(`astro.config.mjs`) — 카카오톡·검색 공유 미리보기 주소
- 관리자 설정(`/admin/config.yml`) — 로그인 주소
- 각 페이지의 대표 주소(canonical)

### 2. GitHub 앱에서 (수동)

https://github.com/settings/developers → 해당 앱 →
**Authorization callback URL** 을 `새주소/api/callback` 로 수정합니다.

> GitHub 앱은 callback 주소를 하나만 등록할 수 있습니다.
> 그래서 주소를 바꾸는 순간부터 옛 주소로는 로그인이 안 됩니다.
> 홈페이지 자체는 양쪽 주소 모두 계속 열립니다.

### 참고

- Cloudflare 워커의 기본 주소(`*.workers.dev`)는 자체 도메인을 연결해도
  계속 살아 있습니다. 검색엔진이 같은 내용을 두 주소로 인식하지 않도록
  옛 주소에서 새 주소로 넘겨주는 설정을 하는 편이 좋습니다.
- 로그인 처리(`worker/index.js`)는 접속한 주소를 그때그때 사용하므로
  따로 고칠 것이 없습니다.
- **주보나 인쇄물에 주소를 넣기 전에** 도메인을 확정하는 편이 좋습니다.

---

## 관리자 화면 (`/admin`)

파일을 직접 다루지 않고 글쓰기 화면에서 공지·설교를 올릴 수 있습니다.
동작하려면 GitHub 로그인 중계 주소가 필요합니다.

1. GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App
   - Authorization callback URL: 로그인 중계 서버 주소 + `/callback`
2. 로그인 중계 서버 배포 (Cloudflare Workers)
3. `site/public/admin/config.yml` 의 `base_url` 주석을 풀고 주소 입력

---

## 방문자 카운터

바닥글(footer)에 '오늘 방문자 · 전체 방문자' 숫자가 표시됩니다. 값은
Cloudflare KV(무료)에 저장하고, 하루에 한 번(쿠키 기준) 새 방문에서만
숫자가 올라갑니다. (Cloudflare 대시보드 → Storage & Databases → KV 의
`VISITS` 네임스페이스이며, `wrangler.jsonc` 에 이미 연결되어 있습니다)

> 방문할 때마다 정확히 세지는 않습니다(같은 브라우저는 하루 한 번만
> 집계). 통계용이 아니라 '요즘 이만큼 찾아오시는구나' 정도의 참고용입니다.

KV 네임스페이스를 새로 만들어야 한다면(계정 이전 등):

1. `npx wrangler login` 으로 로그인한 뒤 `npx wrangler kv namespace create VISITS` 실행
2. 출력된 id 를 `wrangler.jsonc` 의 `kv_namespaces` 에 채워 넣고 커밋

KV 연결이 없어도 홈페이지는 정상 동작합니다. 숫자만 표시되지 않을 뿐입니다.

---

## 유의 사항

- **조감도 원본**(143MB)은 GitHub 파일 크기 제한(100MB)을 넘어 저장소에
  포함되지 않습니다. 별도로 백업해 주세요. 웹용 변환본은 포함되어 있습니다.
- 구세군체는 교단 공식 서체입니다. 웹폰트 사용 범위는 서체 라이선스를
  확인해 주세요.
