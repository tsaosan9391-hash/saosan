/**
 * 관리자 화면(/admin) GitHub 로그인 처리
 *
 * 동작 순서
 *   1. /api/auth      → GitHub 로그인 화면으로 보냄
 *   2. 사용자가 GitHub에서 승인
 *   3. /api/callback  → 받은 코드를 접근 토큰으로 교환하여 관리자 화면에 전달
 *
 * 그 외 모든 주소는 만들어 둔 홈페이지 파일을 그대로 내보냅니다.
 *
 * ⚠️ GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET 은 코드에 넣지 않습니다.
 *    Cloudflare 대시보드의 암호화된 변수로만 보관합니다.
 */

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const STATE_COOKIE = "cms_oauth_state";
const PROVIDER = "github";

/** 위조 요청을 막기 위한 1회용 난수 */
function createState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

/**
 * 로그인 결과를 관리자 화면에 전달하는 페이지.
 * 관리자 화면이 이 창을 열었으므로 postMessage 로 결과를 넘겨줍니다.
 * 같은 주소(origin)에서만 주고받도록 제한합니다.
 */
function resultPage(status, payload, origin) {
  const message = `authorization:${PROVIDER}:${status}:${JSON.stringify(payload)}`;
  const body = JSON.stringify(message);
  const allowed = JSON.stringify(origin);

  return new Response(
    `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><title>로그인 처리 중</title>
<style>
  body{font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif;
       display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#1c1c22}
  p{font-size:15px}
</style></head>
<body>
<p>로그인 처리 중입니다. 잠시만 기다려 주세요…</p>
<script>
(function () {
  var message = ${body};
  var allowedOrigin = ${allowed};

  function send(event) {
    if (event.origin !== allowedOrigin) return;
    window.opener.postMessage(message, allowedOrigin);
    window.removeEventListener("message", send, false);
  }

  if (!window.opener) {
    document.body.textContent = "이 창은 관리자 화면에서 열어야 합니다.";
    return;
  }
  window.addEventListener("message", send, false);
  window.opener.postMessage("authorizing:${PROVIDER}", allowedOrigin);
})();
</script>
</body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        // 로그인 결과 페이지는 검색에 잡히지 않도록
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}

/** 설정 누락 등으로 진행할 수 없을 때 보여줄 안내 */
function setupNoticePage(reason) {
  return new Response(
    `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><title>관리자 로그인 설정 필요</title>
<style>
  body{font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif;
       max-width:34rem;margin:12vh auto;padding:0 1.5rem;line-height:1.8;color:#1c1c22}
  h1{font-size:1.35rem;color:#da0e2c}
  code{background:#f2f0ed;padding:.15em .45em;border-radius:4px;font-size:.92em}
</style></head>
<body>
  <h1>관리자 로그인이 아직 설정되지 않았습니다</h1>
  <p>${reason}</p>
  <p>Cloudflare 대시보드에서 <code>GITHUB_CLIENT_ID</code> 와
     <code>GITHUB_CLIENT_SECRET</code> 을 암호화된 변수로 등록해 주세요.</p>
  <p>홈페이지 자체는 정상 동작합니다. <a href="/">첫 화면으로</a></p>
</body></html>`,
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}

/* ───────────────────────────────────────────────────────────
 * 유튜브 공개 영상 목록
 *
 * 홈페이지를 만들 때 한 번만 가져오면, 새 영상을 올려도
 * 다시 만들기 전까지 반영되지 않습니다.
 * 이 주소로 최신 목록을 내려주어 화면에서 바로 갱신되게 합니다.
 *
 * 유튜브는 브라우저에서 직접 부르는 것을 막아두었기 때문에(CORS)
 * 워커가 대신 불러다 줍니다.
 * ─────────────────────────────────────────────────────────── */
// 유튜브 채널을 아직 연결하지 않아 비워 두었습니다.
// 채널이 생기면 site/src/data/church.ts 의 youtubeChannelId 와 같은 값을 넣어 주세요.
const CHANNEL_ID = "";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    // 유튜브 제목이 자모 분해형(NFD)으로 오는 경우가 있어, 눈에는 같은
    // "설교"라도 문자열 비교(포함 검사)가 조용히 실패할 수 있습니다.
    // 완성형(NFC)으로 통일해 이런 오작동을 막습니다.
    .normalize("NFC");
}

function pickTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1].trim()) : "";
}

// 교회 이름은 '구세군오산교회' 하나로 통일합니다. 유튜브에 영문(營門)
// 표기('구세군오산영문')로 올라간 영상이 있으면 보여줄 때만 바꿉니다.
// ('오산영문' 만 바꾸면 '구세군오산영문' 도 함께 처리됩니다)
const unifyChurchName = (s) => s.replace(/오산\s*영문/g, "오산교회");

function parseFeed(xml, limit) {
  return xml
    .split("<entry>")
    .slice(1, limit + 1)
    .map((block) => {
      const id = pickTag(block, "yt:videoId");
      const title = unifyChurchName(pickTag(block, "title"));
      const thumb = block.match(/<media:thumbnail\s+url="([^"]+)"/);
      return {
        id,
        title,
        published: pickTag(block, "published"),
        thumbnail: thumb ? thumb[1] : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${id}`,
        // 제목에 '설교'가 들어있으면 말씀 영상, 아니면 행사·소식 영상
        category: /설교/.test(title) ? "sermon" : "event",
      };
    })
    .filter((v) => v.id);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function handleVideos(url) {
  // 유튜브 채널을 아직 연결하지 않았으면 빈 목록을 돌려줍니다
  if (!CHANNEL_ID) {
    return Response.json({ videos: [] }, { headers: { "Cache-Control": "public, max-age=600" } });
  }

  const limit = Math.min(Number(url.searchParams.get("limit")) || 12, 15);
  let lastError = "";

  // 유튜브 RSS 는 가끔 404·500 을 돌려줍니다. 한 번 실패했다고 영상 영역이
  // 비어 버리지 않도록, 잠깐 쉬었다가 세 번까지 다시 시도합니다.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(FEED_URL, {
        // ⚠️ 예전에 cf:{cacheTtl:1800} 으로 30분 캐시를 걸어 두었는데,
        //    유튜브가 한 번 404 를 주면 그 404 까지 30분 동안 캐시되어
        //    계속 실패하는 것처럼 굳어졌습니다. 그래서 캐시를 걸지 않습니다.
        //    (성공한 결과는 아래에서 우리 응답에 s-maxage 를 붙여 캐시합니다)
        // 사람이 쓰는 브라우저처럼 요청합니다. 이름만 적어 보내면
        // 유튜브가 자동 프로그램으로 보고 막는 경우가 있습니다.
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          Accept:
            "application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        },
      });

      if (res.ok) {
        const videos = parseFeed(await res.text(), limit);
        return Response.json(
          { videos },
          {
            headers: {
              // 방문자 브라우저 10분, 중간 서버 30분
              "Cache-Control": "public, max-age=600, s-maxage=1800",
            },
          },
        );
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = String(err?.message || err);
    }

    if (attempt < 3) await sleep(300 * attempt);
  }

  // 세 번 다 실패해도 화면은 만들어 둔 목록을 그대로 보여주면 됩니다.
  // 다만 원인을 모르면 고칠 수가 없어 무엇 때문에 실패했는지 짧게 남깁니다.
  // (계정 정보 같은 민감한 값은 들어가지 않습니다)
  return Response.json(
    { videos: [], error: true, reason: lastError },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/* ───────────────────────────────────────────────────────────
 * 방문자 카운터
 *
 * 하루에 한 번, 쿠키가 없는 첫 방문에서만 KV 값을 1 올립니다.
 * (새로고침·페이지 이동마다 올라가지 않도록)
 *
 * KV 네임스페이스가 아직 안 만들어져 있으면(로컬 개발 등)
 * 조용히 503 을 돌려주고, 화면에서는 숫자 대신 아예 숨깁니다.
 * ─────────────────────────────────────────────────────────── */
const VISIT_COOKIE = "visited_on";

/** 날짜 경계를 한국 시간 기준으로 맞추기 위한 보정 */
function seoulDateKey(date = new Date()) {
  const seoul = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return seoul.toISOString().slice(0, 10);
}

async function handleVisits(request, env) {
  if (!env.VISITS) {
    return Response.json(
      { error: "방문자 수 집계가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const today = seoulDateKey();
  const dayKey = `day:${today}`;
  const alreadyCounted = readCookie(request.headers.get("Cookie"), VISIT_COOKIE) === today;

  if (!alreadyCounted) {
    const [totalRaw, todayRaw] = await Promise.all([
      env.VISITS.get("total"),
      env.VISITS.get(dayKey),
    ]);
    const total = (Number(totalRaw) || 0) + 1;
    const todayCount = (Number(todayRaw) || 0) + 1;

    await Promise.all([
      env.VISITS.put("total", String(total)),
      // 하루 집계는 3일만 지나면 안 쓰이므로 자동으로 지워지게 둡니다
      env.VISITS.put(dayKey, String(todayCount), { expirationTtl: 60 * 60 * 24 * 3 }),
    ]);

    return Response.json(
      { total, today: todayCount },
      {
        headers: {
          "Set-Cookie": `${VISIT_COOKIE}=${today}; Path=/; Max-Age=86400; SameSite=Lax; Secure`,
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const [totalRaw, todayRaw] = await Promise.all([
    env.VISITS.get("total"),
    env.VISITS.get(dayKey),
  ]);
  return Response.json(
    { total: Number(totalRaw) || 0, today: Number(todayRaw) || 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = url.origin;

    // ── 유튜브 최신 영상 목록 ─────────────────────────────
    if (url.pathname === "/api/videos") {
      return handleVideos(url);
    }

    // ── 네이버 소유 확인 파일 ─────────────────────────────
    // 정적 파일로 두면 Cloudflare 가 '.html' 을 뗀 주소로 넘겨 버려서
    // 네이버 확인 로봇이 파일을 못 찾을 수 있습니다. 주소 그대로 내보냅니다.
    if (/^\/naver[0-9a-f]+\.html$/.test(url.pathname)) {
      const asset = await env.ASSETS.fetch(
        new URL(url.pathname.replace(/\.html$/, ""), url.origin),
      );
      if (asset.ok) {
        return new Response(asset.body, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      return asset;
    }

    // ── 방문자 카운터 ─────────────────────────────────────
    if (url.pathname === "/api/visits") {
      return handleVisits(request, env);
    }

    // ── 1단계: GitHub 로그인 화면으로 보내기 ──────────────
    if (url.pathname === "/api/auth") {
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        return setupNoticePage("GitHub 앱 정보가 등록되어 있지 않습니다.");
      }

      const state = createState();
      const target = new URL(AUTHORIZE_URL);
      target.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      target.searchParams.set("redirect_uri", `${origin}/api/callback`);
      // 저장소에 글을 저장해야 하므로 repo 권한이 필요합니다
      target.searchParams.set("scope", url.searchParams.get("scope") || "repo");
      target.searchParams.set("state", state);

      return new Response(null, {
        status: 302,
        headers: {
          Location: target.toString(),
          "Set-Cookie": `${STATE_COOKIE}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
          "Cache-Control": "no-store",
        },
      });
    }

    // ── 2단계: 돌아온 코드를 토큰으로 교환 ────────────────
    if (url.pathname === "/api/callback") {
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        return setupNoticePage("GitHub 앱 정보가 등록되어 있지 않습니다.");
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const saved = readCookie(request.headers.get("Cookie"), STATE_COOKIE);

      if (!code) {
        return resultPage("error", { message: "인증 코드가 없습니다." }, origin);
      }
      // 위조 요청 차단
      if (!state || !saved || state !== saved) {
        return resultPage(
          "error",
          { message: "인증 상태가 일치하지 않습니다. 다시 시도해 주세요." },
          origin,
        );
      }

      let data;
      try {
        const res = await fetch(TOKEN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "daegusarang-church-cms",
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: `${origin}/api/callback`,
          }),
        });
        data = await res.json();
      } catch {
        return resultPage(
          "error",
          { message: "GitHub와 통신하지 못했습니다." },
          origin,
        );
      }

      if (data.error || !data.access_token) {
        return resultPage(
          "error",
          { message: data.error_description || "토큰을 받지 못했습니다." },
          origin,
        );
      }

      const response = resultPage(
        "success",
        { token: data.access_token, provider: PROVIDER },
        origin,
      );
      // 사용한 1회용 값은 즉시 삭제
      response.headers.append(
        "Set-Cookie",
        `${STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      );
      return response;
    }

    // ── 그 외: 홈페이지 파일 그대로 내보내기 ──────────────
    return env.ASSETS.fetch(request);
  },
};
