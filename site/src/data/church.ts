/**
 * 교회 기본 정보 — 사이트 전체가 이 파일 하나를 참조합니다.
 *
 * 자주 바뀌는 내용(연락처·예배시간·사관진·비전·사역 소개·메뉴 이름)은
 * ./settings/*.json 여러 파일에서 가져옵니다. 관리자 화면(/admin)의
 * '사이트 설정'에 들어가면 이 파일들이 항목별로 따로따로 클릭해서
 * 들어갈 수 있게 나뉘어 있습니다 — 한 화면에 다 몰려 있지 않습니다.
 *
 * 아래 DEFAULTS 는 어떤 파일이 비어 있거나 항목이 빠졌을 때 쓰는
 * 안전장치입니다 — 관리자 화면에서 실수로 필드를 지워도 사이트
 * 전체가 깨지지 않고, 그 항목만 기본값으로 채워집니다.
 */
import navSettings from "./settings/nav.json";
import basicSettings from "./settings/basic.json";
import worshipTimes from "./settings/worship-times.json";
import officersSettings from "./settings/officers.json";
import visionSettings from "./settings/vision.json";
import introSettings from "./settings/intro.json";
import ministrySettings from "./settings/ministry.json";
import heritageSettings from "./settings/heritage.json";
import heroSettings from "./settings/hero.json";
import videoSettings from "./settings/videos.json";
import worshipPhotosSettings from "./settings/worship-photos.json";

type Service = { name: string; time: string; photo?: string; video?: string };
type MainService = Service & { day: string };
type Officer = { role: string; rank: string; name: string };
type Ministry = { title: string; desc: string; photo?: string };
type HeritagePhoto = { src: string; caption: string };

const DEFAULTS = {
  navLabels: {
    about: "교회 소개",
    worship: "예배와 모임",
    sermons: "설교",
    ministry: "사역",
    gallery: "사진",
    news: "소식",
    visit: "오시는 길",
  } as Record<string, string>,
  slogan: "마음은 하나님께 손길은 이웃에게",
  address: "경기도 오산시 현충로72번길 24",
  zipcode: "",
  phone: "031-374-7404",
  email: "",
  mainServices: [
    { name: "주일 성결예배", day: "주일", time: "오전 11:00" },
  ] as MainService[],
  prayerServices: [] as Service[],
  groups: [] as Service[],
  officers: [] as Officer[],
  visions: [] as string[],
  heritagePhotos: [] as HeritagePhoto[],
  worshipPhotos: [] as string[],
  worshipWatermarkOpacity: 35,
  intro: {
    greeting: "",
    salvationArmy: "",
    ourChurch: "",
    missionStatement: [] as string[],
  },
  ministries: [] as Ministry[],
  videoDisplay: {
    homeSermonCount: 3,
    homeEventCount: 1,
    pageSermonCount: 12,
    pageEventCount: 12,
  },
};

/** 값이 없거나 빈 배열/빈 문자열이면 기본값을 씁니다 */
function or<T>(value: T | undefined | null, fallback: T): T {
  if (typeof value === "string") return value.trim() ? value : fallback;
  if (Array.isArray(value)) return value.length > 0 ? value : fallback;
  return value ?? fallback;
}

export const church = {
  // 홈페이지에서 부르는 이름은 '구세군오산교회' 하나로 통일합니다.
  // (구세군에서는 교회를 '영문'이라고도 부르지만, 처음 오시는 분이
  //  두 이름을 다른 곳으로 오해하지 않도록 한 가지만 씁니다)
  name: "구세군오산교회",
  // 영문 표기의 Corps 는 구세군 교회를 가리키는 세계 공통 정식 명칭입니다.
  nameEn: "The Salvation Army Osan Corps",
  slogan: or(basicSettings.slogan, DEFAULTS.slogan),
  address: or(basicSettings.address, DEFAULTS.address),
  zipcode: or(basicSettings.zipcode, DEFAULTS.zipcode),
  // 공개 방침: 교회 대표전화와 이메일만 안내. 사관 개인 연락처·헌금 계좌는 게재하지 않음.
  phone: or(basicSettings.phone, DEFAULTS.phone),
  // 비어 있으면 화면에서 이메일 안내를 숨깁니다.
  email: or(basicSettings.email, DEFAULTS.email),
  // 유튜브 연동은 기술적인 설정이라 관리자 화면에서는 다루지 않습니다.
  // 아직 채널이 없어 비워 두었습니다. 비어 있으면 '교회영상' 메뉴와
  // 영상 영역이 모두 숨겨집니다. 채널이 생기면 두 값을 채우고,
  // worker/index.js · scripts/update-video-cache.mjs 의 CHANNEL_ID 도 같이 바꿔 주세요.
  youtube: "",
  youtubeChannelId: "",
};

/** 주소 앞에 우편번호를 붙여 보여줍니다. 우편번호가 없으면 주소만. */
export const fullAddress = church.zipcode
  ? `(${church.zipcode}) ${church.address}`
  : church.address;

/** 주요 예배 — 메인 화면에 크게 노출 */
export const mainServices = or(worshipTimes.mainServices, DEFAULTS.mainServices);

/** 그 외 기도회 */
export const prayerServices = or(
  worshipTimes.prayerServices,
  DEFAULTS.prayerServices,
);

/** 교회학교 및 각종 모임 */
export const groups = or(worshipTimes.groups, DEFAULTS.groups);

/** 섬기는 사관 */
export const officers = or(officersSettings.officers, DEFAULTS.officers);

/** 교회 비전 */
export const visions = or(visionSettings.visions, DEFAULTS.visions);

/** 지난 발자취 사진 — 교회 소개 페이지에 인사말과 함께 강조해 보여줍니다 */
export const heritagePhotos = or(
  heritageSettings.photos,
  DEFAULTS.heritagePhotos,
);

/** 예배 풍경 사진 — 예배와 모임 페이지에 보여줍니다 */
export const worshipPhotos = or(
  worshipPhotosSettings.photos,
  DEFAULTS.worshipPhotos,
);

/**
 * 메인 화면 맨 위(히어로) 배경 슬라이드 사진.
 * 관리자 화면에서 올리지 않으면 빈 배열이며, 이 경우 기본 사진
 * 하나만 보여줍니다(index.astro 에서 처리).
 *
 * 히어로는 가로로 넓고 납작해서, 사진의 위아래가 잘려 나갑니다.
 * 사람이 아래쪽에 몰려 있는 단체사진처럼 잘리면 안 되는 사진은
 * '배경 사진 위치 맞추기'(/admin/hero) 에서 끌어서 맞출 수 있습니다.
 *
 * posX / posY 는 사진에서 보여줄 지점을 백분율(0~100)로 적은 값입니다.
 * 가로는 0=왼쪽 50=가운데 100=오른쪽, 세로는 0=위 50=가운데 100=아래.
 * zoom 은 확대 배율(%)입니다. 100 이면 원래대로, 150 이면 1.5배 확대.
 */
export type HeroPhoto = {
  src: string;
  posX: number;
  posY: number;
  zoom: number;
};

/** 예전에 쓰던 이름 → 세로 위치(%) */
const LEGACY_POSITIONS: Record<string, number> = {
  top: 0,
  center: 50,
  bottom: 100,
};

/** 정해진 범위 안의 숫자로 맞춥니다. 값이 이상하면 기본값을 씁니다 */
function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** 0~100 사이 위치 값 */
const toPercent = (value: unknown, fallback: number) =>
  clampNumber(value, fallback, 0, 100);

/** 확대 배율(%) — 100 이 원래 크기, 최대 3배까지 */
const toZoom = (value: unknown) => clampNumber(value, 100, 100, 300);

// 값이 비어 있으면 never[] 로 추론되어 아래 검사들이 막히므로 한 번 풀어줍니다
const rawHeroPhotos = (heroSettings.photos ?? []) as unknown[];

export const heroPhotos: HeroPhoto[] = (
  Array.isArray(rawHeroPhotos) ? rawHeroPhotos : []
)
  .map((p): HeroPhoto | null => {
    // 사진 주소만 저장돼 있던 예전 방식도 그대로 읽습니다
    if (typeof p === "string") {
      return p.trim() ? { src: p, posX: 50, posY: 50, zoom: 100 } : null;
    }
    if (p && typeof p === "object") {
      const o = p as Record<string, unknown>;
      const src = String(o.src ?? "").trim();
      if (!src) return null;

      // 위쪽/가운데/아래쪽 중에 고르던 예전 방식도 그대로 읽습니다
      if (typeof o.position === "string") {
        return {
          src,
          posX: 50,
          posY: LEGACY_POSITIONS[o.position] ?? 50,
          zoom: 100,
        };
      }
      return {
        src,
        posX: toPercent(o.posX, 50),
        posY: toPercent(o.posY, 50),
        zoom: toZoom(o.zoom),
      };
    }
    return null;
  })
  .filter((p): p is HeroPhoto => p !== null);

/**
 * 예배와 모임 페이지 머리글의 워터마크 사진 설정 — 첫 번째 사진에만 적용.
 * opacity 는 진하기(%), posX/posY 는 히어로 사진과 같은 방식의 위치(%)입니다.
 */
export const worshipWatermark = {
  opacity: or(worshipPhotosSettings.watermarkOpacity, DEFAULTS.worshipWatermarkOpacity),
  posX: toPercent(worshipPhotosSettings.watermarkPosX, 50),
  posY: toPercent(worshipPhotosSettings.watermarkPosY, 20),
};

/**
 * 설교/행사 영상 노출 개수 설정.
 * 유튜브 RSS는 채널 전체에서 가장 최근 15개까지만 가져올 수 있는
 * 기술적 한계가 있습니다. 이 숫자를 늘려도 실제로 최근 업로드된
 * 영상 수보다 많이 나올 수는 없습니다.
 */
export const videoDisplay = {
  homeSermonCount: or(
    videoSettings.homeSermonCount,
    DEFAULTS.videoDisplay.homeSermonCount,
  ),
  homeEventCount: or(
    videoSettings.homeEventCount,
    DEFAULTS.videoDisplay.homeEventCount,
  ),
  pageSermonCount: or(
    videoSettings.pageSermonCount,
    DEFAULTS.videoDisplay.pageSermonCount,
  ),
  pageEventCount: or(
    videoSettings.pageEventCount,
    DEFAULTS.videoDisplay.pageEventCount,
  ),
};

/** 교회 소개 문안 */
export const intro = {
  greeting: or(introSettings.greeting, DEFAULTS.intro.greeting),
  salvationArmy: or(introSettings.salvationArmy, DEFAULTS.intro.salvationArmy),
  ourChurch: or(introSettings.ourChurch, DEFAULTS.intro.ourChurch),
  missionStatement: or(
    introSettings.missionStatement,
    DEFAULTS.intro.missionStatement,
  ),
};

/** 사역 소개 */
export const ministries: Ministry[] = or(
  ministrySettings.ministries,
  DEFAULTS.ministries,
);

/**
 * 구세군 관련 사이트
 * salvationarmy.or.kr / salvationarmy.kr 은 안내용 splash 페이지이며,
 * 실제 대한본영 사이트는 thesalvationarmy.or.kr 입니다. (2026-07-27 확인)
 * 외부 기관 주소라 관리자 화면에서는 다루지 않습니다.
 *
 * 자선냄비본부(jasunnambi.or.kr)는 대한본영 사이트로 통합되어, 아래
 * '구세군 자선냄비' 항목도 같은 주소를 가리킵니다. (2026-08-10)
 */
export const relatedSites = [
  {
    name: "구세군 대한본영",
    href: "https://www.thesalvationarmy.or.kr",
    desc: "대한민국 구세군 본부",
  },
  {
    name: "구세군 자선냄비",
    href: "https://www.thesalvationarmy.or.kr/",
    desc: "자선냄비본부",
  },
  {
    name: "국제구세군",
    href: "https://www.salvationarmy.org",
    desc: "International Headquarters",
  },
];

const navLabels = { ...DEFAULTS.navLabels, ...navSettings };

/**
 * 상단 네비게이션.
 * 주소(href)는 실제 페이지 경로와 맞물려 있어 코드에서만 관리합니다.
 * 이름(label)만 관리자 화면의 '사이트 설정 > 메뉴 이름'에서 바꿀 수 있습니다.
 */
export const navigation = [
  { label: navLabels.about, href: "/about" },
  { label: navLabels.worship, href: "/worship" },
  // 유튜브 채널이 없으면 '교회영상' 메뉴를 숨깁니다
  ...(church.youtubeChannelId
    ? [{ label: navLabels.sermons, href: "/sermons" }]
    : []),
  { label: navLabels.ministry, href: "/ministry" },
  { label: navLabels.gallery, href: "/gallery" },
  { label: navLabels.news, href: "/news" },
  { label: navLabels.visit, href: "/visit" },
];
