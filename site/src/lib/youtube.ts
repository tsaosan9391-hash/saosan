/**
 * 유튜브 채널 RSS에서 공개 영상 목록을 가져옵니다.
 *
 * 빌드 시점에 1회만 호출되므로 방문자 브라우저에서는 아무 요청도 발생하지 않습니다.
 * RSS는 최근 15건, '공개' 영상만 반환합니다.
 * '일부공개' 예배 영상은 여기에 나오지 않으므로 CMS에서 링크를 직접 등록합니다.
 */

import videosCache from "../data/videos-cache.json";

export type Video = {
  id: string;
  title: string;
  published: string;
  thumbnail: string;
  url: string;
  isShort: boolean;
  /** 제목에 '설교'가 들어있으면 말씀 영상, 아니면 행사·소식 영상 */
  category: "sermon" | "event";
};

/** 제목만 보고 설교 영상인지 가려냅니다. 교회에서 이미 제목에 '설교'를 넣어 올리고 있어 정확히 걸러집니다. */
export function classifyVideo(title: string): Video["category"] {
  return /설교/.test(title) ? "sermon" : "event";
}

const FEED = (channelId: string) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

function decodeEntities(s: string): string {
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

/**
 * 교회 이름을 '구세군오산교회' 하나로 통일합니다.
 *
 * 유튜브에 '구세군오산영문'처럼 영문(營門) 표기로 올라간 영상이 있으면,
 * 홈페이지에 보여줄 때만 현재 이름으로 바꿔 씁니다.
 * (유튜브 쪽 제목 자체는 그대로이므로, 원하시면 유튜브에서 직접 고치시면 됩니다)
 *
 * '오산영문' 만 바꾸면 '구세군오산영문' 도 함께 처리됩니다.
 */
export function unifyChurchName(text: string): string {
  return text.replace(/오산\s*영문/g, "오산교회");
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1].trim()) : "";
}

/** 유튜브 RSS 는 가끔 404·500 을 돌려줍니다. 그때마다 잠깐 쉬고 다시 시도합니다. */
const RETRIES = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 채널 영상 목록(최대 15건)을 한 번만 가져와 재사용합니다.
 *
 * 홈 화면과 교회영상 페이지가 각각 부르면 한 번 만들 때 요청이 두 번
 * 나가고, 그만큼 실패할 확률도 두 배가 됩니다. 그래서 결과를 붙들어 두고
 * 같이 씁니다.
 */
let feedCache: Promise<Video[]> | null = null;

async function loadFeed(channelId: string): Promise<Video[]> {
  let lastError = "";

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      // 사람이 쓰는 브라우저처럼 요청합니다. 이름 없이 보내면 유튜브가
      // 자동 프로그램으로 보고 막는 경우가 있습니다.
      const res = await fetch(FEED(channelId), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          Accept:
            "application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        },
      });

      if (res.ok) {
        const xml = await res.text();
        const entries = xml.split("<entry>").slice(1);
        return entries.slice(0, 15).map((block) => {
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
            // 제목에 '쇼츠'가 들어간 설교 클립을 구분
            isShort: /쇼츠|shorts/i.test(title),
            category: classifyVideo(title),
          };
        });
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = String(err);
    }

    if (attempt < RETRIES) await sleep(500 * attempt);
  }

  // 유튜브가 끝내 응답하지 않으면 저장해 둔 사본을 씁니다.
  //
  // 관리자 화면에서 뭘 저장할 때마다 홈페이지를 다시 만드는데, 그때마다
  // 유튜브가 실패하면 영상이 통째로 사라졌다 나타났다 합니다. 사본이 있으면
  // 최소한 화면이 비지는 않습니다. (사본은 scripts/update-video-cache.mjs 로 갱신)
  const cached = ((videosCache.videos ?? []) as Video[]).map((v) => ({
    ...v,
    title: unifyChurchName(v.title),
  }));
  console.warn(
    `[youtube] RSS 가져오기 실패(${RETRIES}회 시도, 마지막 오류: ${lastError}) — ` +
      `저장해 둔 사본 ${cached.length}건을 대신 씁니다.`,
  );
  return cached;
}

export async function fetchChannelVideos(
  channelId: string,
  limit = 12,
): Promise<Video[]> {
  // 유튜브 채널을 아직 연결하지 않았으면 아무것도 가져오지 않습니다
  if (!channelId) return [];
  if (!feedCache) feedCache = loadFeed(channelId);
  return (await feedCache).slice(0, limit);
}

/**
 * 유튜브 주소에서 영상 ID를 뽑아냅니다.
 * watch?v= / youtu.be / shorts / embed 형식을 모두 처리합니다.
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /\/shorts\/([\w-]{11})/,
    /\/embed\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * 관리자가 직접 등록한 영상(주소만 입력)을 자동 수집 목록과 같은 형태로 바꿉니다.
 * 주소에서 영상 번호를 못 읽어내면 null 을 돌려주어 목록에서 빠지게 합니다.
 */
export function toVideo(entry: {
  title: string;
  date: Date;
  youtubeUrl: string;
  category: "sermon" | "event";
}): Video | null {
  const id = extractVideoId(entry.youtubeUrl);
  if (!id) return null;
  return {
    id,
    title: unifyChurchName(entry.title),
    published: entry.date.toISOString(),
    // 썸네일은 '일부공개' 영상도 주소로 바로 불러올 수 있습니다
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    url: entry.youtubeUrl,
    isShort: false,
    category: entry.category,
  };
}

/**
 * 자동 수집 목록과 직접 등록 목록을 하나로 합칩니다.
 * 같은 영상이 양쪽에 있으면 직접 등록한 쪽(제목·분류를 관리자가 정한 것)을 씁니다.
 * 결과는 최신순으로 정렬됩니다.
 */
export function mergeVideos(
  feed: readonly Video[],
  registered: readonly Video[],
): Video[] {
  const registeredIds = new Set(registered.map((v) => v.id));
  return [...registered, ...feed.filter((v) => !registeredIds.has(v.id))].sort(
    (a, b) =>
      new Date(b.published).getTime() - new Date(a.published).getTime(),
  );
}

/** 'YYYY.MM.DD' 형식으로 변환 */
export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
