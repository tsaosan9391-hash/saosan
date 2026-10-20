/**
 * GitHub Pages 미리보기용 주소 보정
 *
 * GitHub Pages 는 https://<계정>.github.io/<저장소>/ 처럼 주소 뒤에
 * 저장소 이름이 한 칸 더 붙습니다. 그런데 홈페이지 코드는 모든 링크를
 * "/about", "/images/..." 처럼 맨 앞(/)부터 적어 두었기 때문에, 그대로
 * 올리면 링크와 사진이 전부 깨집니다.
 *
 * 그래서 빌드가 끝난 결과물(site/dist)에서 맨 앞이 / 인 주소를 찾아
 * 앞에 /<저장소>/ 를 붙여 줍니다. Cloudflare 배포에는 쓰지 않습니다.
 *
 *   node scripts/rebase-for-pages.mjs site/dist /saosan
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const [dir = "site/dist", rawBase = ""] = process.argv.slice(2);
const base = "/" + rawBase.replace(/^\/+|\/+$/g, "");
if (base === "/") {
  console.log("base 가 비어 있어 아무것도 바꾸지 않습니다.");
  process.exit(0);
}

// 사이트 맨 위 폴더 이름들. 자바스크립트 안의 문자열은 이 목록에 있는 것만 바꿔
// 나눗셈 기호나 정규식을 잘못 건드리지 않게 합니다.
const top = [
  ...new Set(
    readdirSync(dir).map((n) => n.replace(/\.(html|xml|txt)$/, "")),
  ),
]
  .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const quoted = new RegExp(`(["'\`])/(?=(?:${top})(?:[/?#"'\`]|$))`, "g");

function rewriteHtml(s) {
  return s
    // href="/..." src="/..." 등 (// 로 시작하는 외부 주소는 제외)
    .replace(/\b(href|src|action|poster|data-src)="\/(?!\/)/g, `$1="${base}/`)
    // srcset="/a.webp 1x, /b.webp 2x"
    .replace(/\bsrcset="([^"]*)"/g, (_, v) =>
      `srcset="${v.replace(/(^|,\s*)\/(?!\/)/g, `$1${base}/`)}"`,
    )
    .replace(/url\(\/(?!\/)/g, `url(${base}/`)
    .replace(quoted, `$1${base}/`);
}

const rewriteCss = (s) => s.replace(/url\(\/(?!\/)/g, `url(${base}/`);
const rewriteJs = (s) => s.replace(quoted, `$1${base}/`);

const handlers = { ".html": rewriteHtml, ".css": rewriteCss, ".js": rewriteJs };

let count = 0;
(function walk(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (handlers[extname(p)]) {
      const before = readFileSync(p, "utf8");
      const after = handlers[extname(p)](before);
      if (after !== before) {
        writeFileSync(p, after);
        count++;
      }
    }
  }
})(dir);
console.log(`${count}개 파일의 주소 앞에 ${base} 를 붙였습니다.`);
