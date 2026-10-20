# 구세군오산교회 홈페이지 — 작업 규칙

이 문서는 이 저장소에서 세션이 어디서 열리든(로컬 / 원격·클라우드) 자동으로
Claude가 읽는 지침입니다. 배경 설명은 [PLAN.md](PLAN.md) 참고.

## 출처

- 이 저장소는 **구세군 대구사랑교회** 홈페이지(`sarmydglove/daegu-sarang-church`)를
  포크해 오산교회용으로 바꾼 것이다. 코드 구조·관리자 화면은 그대로 물려받았다.
- 대구사랑교회의 계정(`sarmydglove`)·도메인(`구세군대구사랑교회.kr`)·Cloudflare
  리소스(KV id, worker 이름)·유튜브 채널은 **이 프로젝트와 무관**하다. 어디서든
  다시 보이면 잘못 설정된 신호다.

## 계정 · 저장소

- GitHub 저장소: `tsaosan9391-hash/saosan` (`site/site-url.mjs`의 `GITHUB_REPO`).
- Cloudflare worker 이름: `osan-church` (`wrangler.jsonc`).

## 커밋 · 푸시 전 항상

1. `git fetch origin` 먼저 실행. 관리자가 `/admin` CMS로 실시간 편집하면
   원격이 로컬보다 앞서 있을 수 있다. 사용자가 방금 저장한 콘텐츠를
   덮어쓰거나 잃지 않도록 확인한다.
2. `git restore --staged --worktree -- site/public/images/uploads/` 로,
   빌드 과정에서 생기는 이미지 재처리 부산물을 커밋에서 제외한다.
   (새 사진을 의도적으로 추가할 때는 예외)
3. 커밋 메시지는 한국어로, 무엇을 왜 바꿨는지 한 줄로.

## 배포

- `main`에 push하면 Cloudflare Workers Build가 git 연동으로 자동 배포한다
  (`npm run build` → `wrangler deploy`). **수동으로 `wrangler deploy`를
  직접 실행하지 말 것** — 원본 프로젝트에서 이걸로 `workers_dev`가 꺼지며
  사이트가 내려간 사고가 있었다. `wrangler.jsonc`에는 `"workers_dev": true`를
  명시적으로 유지한다.
- **도메인은 아직 미정.** Cloudflare를 통해 새로 만들 예정이다. 정해지면
  `site/site-url.mjs`의 `SITE_URL` 한 줄과 GitHub OAuth 앱 callback 주소를 바꾼다.
- 관리자 로그인에는 Cloudflare "Variables and Secrets"에
  `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` 등록이 필요하다. 로그인이
  503/Unexpected Error를 내면 이것부터 의심한다.
- 방문자 카운터 KV는 `VISITS`(id `ba4f8254…`)로 `wrangler.jsonc`에 연결돼 있다. 없어도 사이트는 동작한다.

## 공개 콘텐츠 방침 (반드시 준수)

- **연락처는 교회 대표전화(031-374-7404)와 이메일**만. 이메일은 아직 미정이라
  비워 두었고, 비어 있으면 화면에서 자동으로 숨는다.
- 절대 게재 금지: 헌금자 명단, 봉사위원 명단(성결회 기도·식사 봉사 순서 등),
  사관 개인 휴대폰 번호, 사관의 휴가·부재 일정(리트릿·회의·면담 등으로 교회를
  비우는 날짜 포함), 개인 신상사(생일·칠순·환우 등), 다른 교회의 순수 내부
  행사, 헌금 계좌번호, 운영위원회 등 내부 회의.
- 주보에서 소식을 site/src/content/notices에 옮길 때는 위 기준으로 거른다.
  애매하면 사용자에게 확인.
- 사진 갤러리는 기본 비공개 — 관리자가 직접 공개로 바꿔야 노출된다.

## 명칭 통일

- 어디서든 **"구세군오산교회"** 하나로 표기 (영문: The Salvation Army Osan Corps).
  `church.name` (site/src/data/church.ts)을 쓰고 직접 하드코딩하지 않는다.
- '영문(營門)'이라는 구세군 전통 용어는 교회 소개 페이지(`about.astro`)
  용어 안내에만 설명용으로 남긴다. 유튜브 제목의 '오산영문'은
  `unifyChurchName()`이 표시할 때만 치환한다.

## 유튜브

- 채널 ID `UCQnRcl2lhJfYNjYBEKs4ePw`. `church.ts`의 `youtube`/`youtubeChannelId`,
  `worker/index.js`·`scripts/update-video-cache.mjs`의 `CHANNEL_ID`가 같은 값이어야
  한다. `.github/workflows/update-video-cache.yml`이 매일 영상 목록 사본을 갱신한다.
- 인스타그램 주소는 `settings/basic.json`의 `instagram`(관리자 화면에서 편집).

## 기타

- 이 사이트는 비개발자 관리자가 운영하는 것을 전제로 설계됐다. 교회 정보
  대부분은 `site/src/data/settings/*.json`으로 분리해 CMS에서 편집 가능하게
  한다 — 새 기능을 만들 때도 이 원칙을 따른다.
- 한글 도메인을 쓰게 되면 퓨니코드 정규화가 필요한 곳이 있다(robots.txt,
  admin config.yml의 base_url 등) — `new URL(SITE_URL).origin` 패턴을 따른다.
