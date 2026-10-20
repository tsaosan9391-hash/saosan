/**
 * ★ 홈페이지 주소 ★
 *
 * 도메인이 바뀌면 이 파일 한 줄만 고치면 됩니다.
 * 사이트 설정과 관리자 로그인 설정이 모두 이 값을 가져다 씁니다.
 *
 * 예) 자체 도메인을 연결했다면
 *     export const SITE_URL = "https://구세군오산교회.kr";
 *
 * ⚠️ 끝에 슬래시(/)를 붙이지 마세요.
 * ⚠️ 이 값을 바꾼 뒤에는 GitHub 앱의 callback 주소도 함께 바꿔야 합니다.
 *    https://github.com/settings/developers → 해당 앱 →
 *    Authorization callback URL 을 "새주소/api/callback" 으로 수정
 */
// TODO: 도메인이 아직 정해지지 않았습니다. Cloudflare 첫 배포 뒤 나오는
//       workers.dev 주소(예: https://osan-church.<계정이름>.workers.dev)나
//       새로 연결한 도메인으로 이 한 줄을 바꿔 주세요.
// GitHub Pages 미리보기로 만들 때는 워크플로가 SITE_URL_OVERRIDE 로 주소를 넘겨줍니다.
// (.github/workflows/deploy-pages.yml)
export const SITE_URL =
  process.env.SITE_URL_OVERRIDE || "https://osan-church.workers.dev";

/** GitHub 저장소 (관리자 화면이 글을 저장할 위치) */
export const GITHUB_REPO = "tsaosan9391-hash/saosan";
export const GITHUB_BRANCH = "main";
