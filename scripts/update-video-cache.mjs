/**
 * 유튜브 영상 목록 사본 만들기
 *
 * 홈페이지를 만들 때(빌드) 유튜브에서 목록을 가져오는데, 유튜브가
 * 심심찮게 404·500 을 돌려줍니다. 그러면 영상 영역이 통째로 비어 버립니다.
 * 관리자 화면에서 뭘 저장할 때마다 홈페이지를 다시 만들기 때문에,
 * 그때마다 영상이 사라졌다 나타났다 하게 됩니다.
 *
 * 그래서 목록을 파일로 받아 저장소에 넣어 둡니다. 빌드할 때 유튜브가
 * 응답하지 않으면 이 사본을 대신 씁니다.
 *
 *   node scripts/update-video-cache.mjs
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";

// 구세군오산교회 유튜브 채널. site/src/data/church.ts 의 youtubeChannelId 와 같은 값입니다.
const CHANNEL_ID = "UCQnRcl2lhJfYNjYBEKs4ePw";
const OUT = "site/src/data/videos-cache.json";
const FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const RETRIES = 5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    // 유튜브 제목이 자모 분해형(NFD)으로 오는 경우가 있어 완성형으로 통일합니다
    .normalize("NFC");
}

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1].trim()) : "";
}

// 교회 이름은 '구세군오산교회' 하나로 통일합니다.
// ('오산영문' 만 바꾸면 '구세군오산영문' 도 함께 처리됩니다)
const unifyChurchName = (s) => s.replace(/오산\s*영문/g, "오산교회");

function parse(xml) {
  return xml
    .split("<entry>")
    .slice(1, 16)
    .map((block) => {
      const id = pick(block, "yt:videoId");
      const title = unifyChurchName(pick(block, "title"));
      const thumb = block.match(/<media:thumbnail\s+url="([^"]+)"/);
      return {
        id,
        title,
        published: pick(block, "published"),
        thumbnail: thumb
          ? thumb[1]
          : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${id}`,
        isShort: /쇼츠|shorts/i.test(title),
        category: /설교/.test(title) ? "sermon" : "event",
      };
    })
    .filter((v) => v.id);
}

// 유튜브 채널을 아직 연결하지 않았으면 할 일이 없습니다
if (!CHANNEL_ID) {
  console.log("유튜브 채널이 설정되지 않아 건너뜁니다. (CHANNEL_ID 가 비어 있음)");
  process.exit(0);
}

let videos = null;
let lastError = "";

for (let attempt = 1; attempt <= RETRIES; attempt++) {
  try {
    const res = await fetch(FEED, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        Accept: "application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (res.ok) {
      const parsed = parse(await res.text());
      if (parsed.length > 0) {
        videos = parsed;
        break;
      }
      lastError = "영상이 하나도 없습니다";
    } else {
      lastError = `HTTP ${res.status}`;
    }
  } catch (err) {
    lastError = String(err.message || err);
  }
  if (attempt < RETRIES) await sleep(1000 * attempt);
}

if (!videos) {
  // 못 가져왔으면 기존 사본을 그대로 둡니다. 덮어써서 비우면 안 됩니다.
  console.error(`[video-cache] 가져오기 실패 — 기존 사본 유지. 원인: ${lastError}`);
  process.exit(existsSync(OUT) ? 0 : 1);
}

const next = JSON.stringify({ videos }, null, 2) + "\n";
const prev = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";

if (prev === next) {
  console.log(`[video-cache] 바뀐 내용 없음 (영상 ${videos.length}건)`);
} else {
  writeFileSync(OUT, next);
  console.log(`[video-cache] 갱신 완료 — 영상 ${videos.length}건`);
}
