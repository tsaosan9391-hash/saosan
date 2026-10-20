import type { APIRoute } from "astro";
import { SITE_URL, GITHUB_REPO, GITHUB_BRANCH } from "../../../site-url.mjs";

/**
 * 관리자 화면 설정 파일(/admin/config.yml)을 만들어 냅니다.
 *
 * 주소를 직접 적어두지 않고 site-url.mjs 에서 가져오기 때문에,
 * 도메인이 바뀌어도 그 파일 한 줄만 고치면 여기까지 함께 반영됩니다.
 */
export const GET: APIRoute = () => {
  // 한글 도메인은 GitHub OAuth 앱에 등록한 callback 주소(영문 punycode)와
  // 정확히 일치해야 로그인이 되므로 punycode 로 바꿔 씁니다.
  const origin = new URL(SITE_URL).origin;
  const yaml = `# 이 파일은 자동으로 만들어집니다. 직접 고치지 마세요.
# 내용을 바꾸려면 site/src/pages/admin/config.yml.ts 를 수정하세요.
# 홈페이지 주소를 바꾸려면 site/site-url.mjs 한 곳만 고치면 됩니다.

backend:
  name: github
  repo: ${GITHUB_REPO}
  branch: ${GITHUB_BRANCH}
  # 로그인 처리는 홈페이지와 같은 주소의 /api/auth 에서 담당합니다.
  base_url: ${origin}
  auth_endpoint: api/auth

# 사진 업로드 위치
media_folder: site/public/images/uploads
public_folder: /images/uploads

collections:
  # ── 사이트 설정 (섹션별로 파일을 나눠, 각각 따로 클릭해서 들어갑니다) ──
  - name: settings
    label: 사이트 설정
    files:
      - name: nav
        label: 메뉴 이름
        file: site/src/data/settings/nav.json
        description: 화면 위쪽 메뉴에 표시되는 이름입니다. 이동하는 주소는 바뀌지 않습니다.
        fields:
          - { label: "교회 소개 메뉴", name: about, widget: string }
          - { label: "예배와 모임 메뉴", name: worship, widget: string }
          - { label: "설교 메뉴", name: sermons, widget: string }
          - { label: "사역 메뉴", name: ministry, widget: string }
          - { label: "사진 메뉴", name: gallery, widget: string }
          - { label: "소식 메뉴", name: news, widget: string }
          - { label: "오시는 길 메뉴", name: visit, widget: string }

      - name: basic
        label: 기본 정보
        file: site/src/data/settings/basic.json
        fields:
          - label: 슬로건
            name: slogan
            widget: string
            hint: 메인 화면 큰 제목으로 쓰입니다.
          - label: 대표전화
            name: phone
            widget: string
            required: false
            hint: 교회 대표번호만 적어 주세요. 사관 개인 휴대폰 번호는 넣지 않습니다.
          - label: 이메일
            name: email
            widget: string
            required: false
            hint: 문의를 받을 이메일입니다. 비워 두면 이메일 안내가 숨겨집니다.
          - label: 주소
            name: address
            widget: string
          - label: 우편번호
            name: zipcode
            widget: string
            required: false

      - name: hero
        label: 메인 화면 배경 사진
        file: site/src/data/settings/hero.json
        description: >-
          메인 화면 맨 위 큰 배경에 나오는 사진입니다. 여러 장을 올리면
          한 장씩 자동으로 넘어가고, 방문자가 왼쪽 아래 번호를 눌러 원하는
          사진을 바로 볼 수도 있습니다. 아무것도 안 올리면 기본 예배당
          사진이 나옵니다.
          📐 사진이 잘리는 부분을 맞추려면 여기 숫자를 고치지 마시고,
          ‘배경 사진 위치 맞추기’ 화면에서 사진을 직접 끌어서 맞춰 주세요 →
          /admin/hero
        fields:
          - label: 배경 사진
            name: photos
            widget: list
            required: false
            label_singular: 사진
            summary: "{{fields.src}}"
            fields:
              - label: 사진 파일
                name: src
                widget: image
                hint: 가로로 넓은 사진이 가장 잘 어울립니다.
              - label: 가로 위치 (%)
                name: posX
                widget: number
                value_type: int
                min: 0
                max: 100
                default: 50
                required: false
                hint: >-
                  0=왼쪽, 50=가운데, 100=오른쪽.
                  직접 고치기보다 /admin/hero 에서 사진을 보며 맞추는 것이 쉽습니다.
              - label: 세로 위치 (%)
                name: posY
                widget: number
                value_type: int
                min: 0
                max: 100
                default: 50
                required: false
                hint: >-
                  0=위, 50=가운데, 100=아래.
                  사람들이 사진 아래쪽에 있으면 100 에 가깝게 하면 됩니다.
              - label: 확대 (%)
                name: zoom
                widget: number
                value_type: int
                min: 100
                max: 300
                default: 100
                required: false
                hint: >-
                  100 이 원래 크기, 150 이면 1.5배 확대입니다.
                  이것도 /admin/hero 에서 조절하는 편이 쉽습니다.

      - name: worship-times
        label: 예배 시간 · 모임
        file: site/src/data/settings/worship-times.json
        fields:
          - label: 예배 시간
            name: mainServices
            widget: list
            min: 1
            summary: "{{fields.day}} {{fields.name}} · {{fields.time}}"
            fields:
              - { label: 예배 이름, name: name, widget: string }
              - { label: 요일, name: day, widget: string, hint: "예) 주일, 수요일" }
              - { label: 시간, name: time, widget: string, hint: "예) 오전 11:00" }

          - label: 기도회
            name: prayerServices
            widget: list
            summary: "{{fields.name}} · {{fields.time}}"
            fields:
              - { label: 이름, name: name, widget: string }
              - { label: 시간, name: time, widget: string }

          - label: 교회학교 · 모임
            name: groups
            widget: list
            summary: "{{fields.name}} · {{fields.time}}"
            fields:
              - { label: 이름, name: name, widget: string }
              - { label: 시간, name: time, widget: string }
              - label: 사진 (선택)
                name: photo
                widget: image
                required: false
                hint: 예배와 모임 페이지에서 이 항목에 마우스를 올리면 배경으로 나타나는 사진입니다. 아래 영상을 넣으면 영상이 우선합니다.
              - label: 짧은 영상 (선택)
                name: video
                widget: file
                required: false
                hint: >-
                  사진 대신 짧은 영상을 배경으로 쓰고 싶을 때만 넣어주세요.
                  ⚠️ 자동 압축이 안 되니, 몇 초짜리로 미리 작게(10MB 이하 권장)
                  압축한 파일로 올려주세요. 큰 영상은 홈페이지를 느리게 만들고
                  저장소 용량도 계속 불어납니다.

      - name: officers
        label: 섬기는 사관
        file: site/src/data/settings/officers.json
        fields:
          - label: 사관 목록
            name: officers
            widget: list
            summary: "{{fields.role}} {{fields.rank}} {{fields.name}}"
            fields:
              - { label: 직책, name: role, widget: string, hint: "예) 담임사관" }
              - { label: 계급, name: rank, widget: string, required: false, hint: "예) 참령 · 정위. 비워 두면 이름만 나옵니다." }
              - { label: 성함, name: name, widget: string }

      - name: vision
        label: 교회 비전
        file: site/src/data/settings/vision.json
        fields:
          - label: 비전 항목
            name: visions
            widget: list
            hint: 항목마다 문장 하나씩 적어주세요.

      - name: intro
        label: 교회 소개 문안
        file: site/src/data/settings/intro.json
        fields:
          - label: 인사말
            name: greeting
            widget: text
            hint: 교회 소개 페이지 맨 위에 나오는 환영 인사말입니다.
          - { label: 구세군 소개, name: salvationArmy, widget: text }
          - { label: 우리 교회 소개, name: ourChurch, widget: text }
          - label: 구세군 선교선언문
            name: missionStatement
            widget: list
            hint: 항목마다 문장 하나씩 적어주세요.

      - name: worship-photos
        label: 예배 풍경 사진
        file: site/src/data/settings/worship-photos.json
        description: >-
          예배와 모임 페이지에 보여줄 사진입니다. 여러 장을 한 번에 선택하거나,
          컴퓨터의 사진 폴더를 통째로 끌어다 놓으면 한 번에 올라갑니다.
        fields:
          - label: 사진
            name: photos
            widget: image
            multiple: true
            required: false
          - label: 첫 번째 사진 진하기 (%)
            name: watermarkOpacity
            widget: number
            value_type: int
            min: 0
            max: 100
            default: 35
            required: false
            hint: >-
              첫 번째 사진은 예배와 모임 페이지 맨 위에 옅은 배경(워터마크)으로
              쓰입니다. 숫자가 클수록 사진이 진하게 보입니다. 0이면 안 보이고,
              100이면 원래 사진과 같은 진하기입니다.
          - label: 첫 번째 사진 가로 위치 (%)
            name: watermarkPosX
            widget: number
            value_type: int
            min: 0
            max: 100
            default: 50
            required: false
            hint: 0=왼쪽, 50=가운데, 100=오른쪽. 사진에서 보여주고 싶은 부분(예- 손 모양)이 잘리면 조절하세요.
          - label: 첫 번째 사진 세로 위치 (%)
            name: watermarkPosY
            widget: number
            value_type: int
            min: 0
            max: 100
            default: 50
            required: false
            hint: 0=위, 50=가운데, 100=아래. 사진에서 보여주고 싶은 부분이 잘리면 조절하세요.

      - name: heritage
        label: 지난 발자취 사진
        file: site/src/data/settings/heritage.json
        description: >-
          교회 소개 페이지 인사말 옆에 강조해서 보여줄 옛날 사진입니다.
          2~4장 정도가 적당합니다. 사진이 많다면 '사진 갤러리'를 이용해 주세요.
        fields:
          - label: 사진
            name: photos
            widget: list
            summary: "{{fields.caption}}"
            fields:
              - { label: 사진 파일, name: src, widget: image }
              - label: 설명
                name: caption
                widget: string
                hint: "예) 2026 추수감사주일"

      - name: ministry
        label: 사역 소개
        file: site/src/data/settings/ministry.json
        fields:
          - label: 사역 소개
            name: ministries
            widget: list
            summary: "{{fields.title}}"
            fields:
              - { label: 제목, name: title, widget: string }
              - { label: 설명, name: desc, widget: text }
              - label: 배경 사진 (선택)
                name: photo
                widget: image
                required: false
                hint: 이 사역 상자에 마우스를 올렸을 때 배경으로 나타나는 사진입니다.

      - name: videos
        label: 영상 노출 개수
        file: site/src/data/settings/videos.json
        description: >-
          메인 화면과 교회영상 페이지에 설교/행사 영상을 몇 개까지
          보여줄지 정합니다. ⚠️ 유튜브 제공 방식의 한계로, 채널에서
          가장 최근에 올라온 15개 영상 안에서만 가져올 수 있습니다.
          그 15개 안에 행사 영상이 2개뿐이면, 여기 숫자를 아무리 늘려도
          2개까지만 나옵니다 (더 예전 영상은 자동으로 불러올 수 없습니다).
        fields:
          - label: 메인 화면 · 설교 영상 개수
            name: homeSermonCount
            widget: number
            value_type: int
            min: 0
            default: 3
          - label: 메인 화면 · 행사 스케치 개수
            name: homeEventCount
            widget: number
            value_type: int
            min: 0
            default: 1
          - label: 교회영상 페이지 · 설교 영상 개수
            name: pageSermonCount
            widget: number
            value_type: int
            min: 0
            default: 12
          - label: 교회영상 페이지 · 행사 스케치 개수
            name: pageEventCount
            widget: number
            value_type: int
            min: 0
            default: 12

  # ── 공지사항 ────────────────────────────────────────────
  - name: notices
    label: 공지사항
    label_singular: 공지
    folder: site/src/content/notices
    create: true
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
    summary: "{{title}}"
    sortable_fields: [date, title]
    view_filters:
      - label: 고정된 글
        field: pinned
        pattern: true
    fields:
      - label: 제목
        name: title
        widget: string
        hint: 목록에 표시될 제목입니다.

      - label: 작성일
        name: date
        widget: datetime
        format: YYYY-MM-DD
        date_format: YYYY-MM-DD
        time_format: false

      - label: 분류
        name: category
        widget: select
        options: [공지, 행사, 모집, 기도]
        default: 공지

      - label: 목록 맨 위에 고정
        name: pinned
        widget: boolean
        default: false
        required: false

      - label: 한 줄 요약
        name: summary
        widget: string
        required: false
        hint: 목록에서 제목 아래에 보입니다. 비워두어도 됩니다.

      - label: 내용
        name: body
        widget: markdown

  # ── 설교 영상 ───────────────────────────────────────────
  - name: videos
    label: 영상 직접 추가
    label_singular: 영상
    folder: site/src/content/videos
    create: true
    description: >-
      유튜브 주소를 붙여넣어 영상 목록에 직접 끼워 넣는 곳입니다.
      여기서 등록한 영상은 자동으로 불러온 영상들과 한 목록으로 합쳐져
      날짜순으로 함께 나옵니다.
      ✅ 이럴 때 쓰세요 — ①'일부공개'로 올려 채널 목록에 안 뜨는 영상,
      ②최근 15개보다 예전에 올려서 자동으로 안 불러와지는 영상.
      공개로 올린 최근 영상은 등록하지 않아도 자동으로 나옵니다.
      오른쪽 위 'New 영상' 버튼을 눌러 등록해 주세요.
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
    summary: "{{date}} · {{title}}"
    sortable_fields: [date, title]
    view_filters:
      - label: 설교 영상만
        field: category
        pattern: sermon
      - label: 행사 스케치만
        field: category
        pattern: event
    fields:
      - label: 어느 목록에 넣을까요
        name: category
        widget: select
        default: sermon
        options:
          - { label: 설교 영상, value: sermon }
          - { label: 행사 스케치, value: event }

      - label: 영상 제목
        name: title
        widget: string
        hint: 홈페이지 목록에 그대로 표시됩니다.

      - label: 날짜
        name: date
        widget: datetime
        format: YYYY-MM-DD
        date_format: YYYY-MM-DD
        time_format: false
        hint: 이 날짜를 기준으로 다른 영상들과 섞여 최신순으로 정렬됩니다.

      - label: 유튜브 주소
        name: youtubeUrl
        widget: string
        pattern:
          ["^https?://(www\\\\.)?(youtube\\\\.com|youtu\\\\.be)/", "유튜브 주소를 입력해 주세요"]
        hint: >-
          영상 주소를 그대로 붙여넣으세요. '일부공개' 영상도 홈페이지에서 재생됩니다.
          ⚠️ 등록하면 홈페이지 방문자 누구나 볼 수 있습니다.
          성도 개인이 드러나는 장면이 있는지 확인 후 등록해 주세요.

  # ── 사진 갤러리 ─────────────────────────────────────────
  - name: galleries
    label: 사진 갤러리
    label_singular: 앨범
    folder: site/src/content/galleries
    create: true
    description: >-
      행사 이름으로 앨범을 하나 만들고, 그 안에 사진을 여러 장 한 번에
      올리는 방식입니다. 오른쪽 위 'New 앨범' 버튼을 눌러 새로 등록해
      주세요. ⚠️ 아이들 얼굴이 나온 사진은 부모님 동의를 확인한 뒤 올려주세요.
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
    summary: "{{title}} — {{published}}"
    sortable_fields: [date, title]
    view_filters:
      - label: 공개된 앨범만
        field: published
        pattern: true
      - label: 비공개(검토중)만
        field: published
        pattern: false
    fields:
      - label: 공개 여부
        name: published
        widget: boolean
        default: false
        hint: >-
          체크해야 홈페이지에 공개됩니다. 체크하지 않으면 방문자에게 보이지
          않으니, 사진을 다 올리고 얼굴·이름표 등을 한 번 확인한 뒤 마지막에
          체크해서 공개해 주세요.

      - label: 지역 섬김 활동
        name: service
        widget: boolean
        default: false
        required: false
        hint: >-
          식사봉사, 나눔행사처럼 지역의 이웃을 섬긴 활동이면 체크해 주세요.
          ‘사역 소개’ 페이지의 ‘섬김의 현장’에 사진이 함께 나옵니다.
          (공개로 설정한 앨범만 나옵니다)

      - label: 행사 이름
        name: title
        widget: string
        hint: 예) 2026 여름성경학교, 유스캠프, 야외예배

      - label: 날짜
        name: date
        widget: datetime
        format: YYYY-MM-DD
        date_format: YYYY-MM-DD
        time_format: false

      - label: 사진
        name: photos
        widget: image
        multiple: true
        min: 1
        hint: >-
          여러 장을 한 번에 선택하거나, 파일들을 이 칸에 통째로 끌어다 놓으면 한 번에 올라갑니다.
          첫 번째 사진이 목록의 대표 사진으로 쓰입니다.
          ⚠️ 아이들 얼굴이 나온 사진은 부모님 동의를 확인한 뒤 올려주세요.
`;

  return new Response(yaml, {
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
};
