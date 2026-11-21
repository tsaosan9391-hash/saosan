import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * 공지사항 게시판
 * 주보의 '교회소식(광고)' 중 게재 가능한 항목을 한 건씩 등록합니다.
 * 파일명이 곧 주소가 됩니다. (예: 2026-08-28-하계부흥성회.md -> /news/2026-08-28-하계부흥성회)
 */
const notices = defineCollection({
  // 밑줄로 시작하는 파일은 예시/메모용이므로 제외
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/notices" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(["공지", "행사", "모집", "기도"]).default("공지"),
    /** 목록 맨 위에 고정 */
    pinned: z.boolean().default(false),
    /** 목록에 보일 한 줄 요약. 없으면 본문 앞부분을 사용 */
    summary: z.string().optional(),
  }),
});

/**
 * 직접 등록하는 영상
 *
 * 유튜브 채널의 '공개' 영상은 자동으로 불러오지만, 다음 두 경우는
 * 자동으로 잡히지 않으므로 여기에 링크를 등록합니다.
 *   1. '일부공개' 영상 (채널 목록에 뜨지 않음)
 *   2. 최근 15개보다 예전에 올린 영상 (유튜브가 그 이상 제공하지 않음)
 *
 * 등록한 영상은 자동으로 불러온 목록과 하나로 합쳐져, 날짜 순으로
 * 함께 나옵니다. 같은 영상이 양쪽에 있으면 여기 등록한 내용이 우선합니다.
 */
const videos = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/videos" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    /** 유튜브 주소 — 일부공개 영상도 그대로 붙여넣으면 됩니다 */
    youtubeUrl: z.string().url(),
    /** 설교 목록에 넣을지, 행사 스케치 목록에 넣을지 */
    category: z.enum(["sermon", "event"]).default("sermon"),
  }),
});

/**
 * 사진 갤러리
 * 여름성경학교, 유스캠프, 주일 예배 풍경처럼 행사 단위로 사진을 묶어 올립니다.
 * 사진은 관리자 화면에서 올리면 site/public/images/uploads 에 저장되고,
 * 홈페이지를 만들 때 위치정보(GPS)가 자동으로 제거됩니다. (scripts/strip-exif.mjs)
 */
const galleries = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/galleries" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // 사진 여러 장을 한 번에 선택·드래그로 올릴 수 있도록 파일 경로의
    // 배열로만 받습니다. (사진마다 설명을 달 수는 없지만, 한 장씩
    // 올려야 하는 번거로움이 없어집니다. 앨범 제목으로 충분히 설명됩니다.)
    photos: z.array(z.string()).min(1),
    // 기본값을 '비공개'로 둡니다. 사진을 올리고 나서 얼굴·이름표 등을
    // 한 번 확인한 뒤 직접 공개로 바꾸도록 하기 위한 안전장치입니다.
    published: z.boolean().default(false),
    // 지역을 섬긴 활동(식사봉사, 나눔행사 등)이면 체크합니다.
    // 사역 소개 페이지의 '섬김의 현장'에 사진이 함께 나옵니다.
    service: z.boolean().default(false),
    // 샛별어린이집 앨범이면 체크합니다. '행사 사진' 대신 샛별어린이집 페이지에 나옵니다.
    daycare: z.boolean().default(false),
  }),
});

export const collections = { notices, videos, galleries };
