"""
설교 쇼츠 만들기 (세로 1080x1920)

  1) python3 scripts/shorts/render.py subs   → shorts/work/subs.json (자막 초안)
     받아쓰기는 틀린 글자가 있으니 subs.json 을 열어 손으로 고칩니다.
  2) python3 scripts/shorts/render.py        → shorts/work/short.mp4

재료: shorts/output/clip.mp4, shorts/output/clip-words.json (job.py 의 clip 결과)
제목·성경 구절은 shorts/request.json 의 title(줄 목록)·verse 로 정합니다.

화면 구성
  위   : 교회 이름 띠 + 설교 핵심 문장(제목) + 성경 구절
  가운데: 설교 영상 (뒤에는 같은 영상을 흐리게 깔아 빈 곳을 채움)
  아래  : 말하는 대로 바뀌는 큰 자막 + 교회 방패 마크
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REQ = json.loads((ROOT / "shorts/request.json").read_text(encoding="utf-8"))
SRC = ROOT / "shorts/output"
WORK = ROOT / "shorts/work"
WORK.mkdir(parents=True, exist_ok=True)

CHURCH = "구세군오산교회"
LOGO = ROOT / "site/public/images/shield-256.png"
FONTS = Path.home() / ".fonts"

W, H = 1080, 1920
VIDEO_Y = 700  # 설교 영상 윗변 위치
MAX_CHARS = 15  # 자막 한 줄 최대 글자 수
MAX_SECONDS = 2.8  # 자막 한 덩어리 최대 길이


def make_subs():
    """단어별 시각으로 자막 덩어리를 만듭니다. 문장 끝·쉼표에서 끊습니다."""
    segs = json.loads((SRC / "clip-words.json").read_text(encoding="utf-8"))
    words = [w for s in segs for w in s["words"]]
    chunks, cur = [], []

    def flush():
        if cur:
            chunks.append({
                "start": cur[0]["start"],
                "end": cur[-1]["end"],
                "text": "".join(w["word"] for w in cur).strip(),
            })
            cur.clear()

    for w in words:
        text = "".join(x["word"] for x in cur) + w["word"]
        if cur and (len(text.strip()) > MAX_CHARS or w["end"] - cur[0]["start"] > MAX_SECONDS):
            flush()
        cur.append(w)
        if w["word"].strip()[-1:] in ".?!,":
            flush()
    flush()

    # 다음 자막이 나올 때까지 앞 자막을 남겨 깜빡임을 줄입니다
    for a, b in zip(chunks, chunks[1:]):
        if b["start"] - a["end"] < 0.6:
            a["end"] = b["start"]
    for c in chunks:
        c["text"] = c["text"].rstrip(".,")
    out = WORK / "subs.json"
    out.write_text(json.dumps(chunks, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"자막 {len(chunks)}개 → {out}")


def ts(t):
    t = max(t, 0)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def esc(text):
    return text.replace("\\", "").replace("{", "(").replace("}", ")")


def build_ass(duration):
    subs = json.loads((WORK / "subs.json").read_text(encoding="utf-8"))
    title = REQ.get("title", [])
    verse = REQ.get("verse", "")
    # 색은 ASS 형식(&HAABBGGRR). 빨강 #DA0E2C, 노랑 #FFD23F
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Tag,Pretendard,40,&H00FFFFFF,&H00FFFFFF,&H002C0EDA,&H002C0EDA,-1,0,0,0,100,100,2,0,3,14,0,8,0,0,0,1
Style: Title,Pretendard ExtraBold,86,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,-1,0,1,0,4,8,60,60,0,1
Style: Verse,Pretendard SemiBold,42,&H003FD2FF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,0,3,8,60,60,0,1
Style: Sub,Pretendard Black,76,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,-1,0,1,7,4,8,50,50,0,1
Style: Church,Pretendard Bold,40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,1,0,1,0,2,4,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    end = ts(duration)
    lines = [
        f"Dialogue: 0,{ts(0)},{end},Tag,,0,0,0,,{{\\pos({W // 2},190)}}{CHURCH} · 오늘의 말씀",
    ]
    y = 290
    for t in title:
        lines.append(f"Dialogue: 0,{ts(0)},{end},Title,,0,0,0,,{{\\pos({W // 2},{y})\\fad(300,0)}}{esc(t)}")
        y += 104
    if verse:
        lines.append(f"Dialogue: 0,{ts(0)},{end},Verse,,0,0,0,,{{\\pos({W // 2},{y + 14})\\fad(300,0)}}{esc(verse)}")

    sub_y = VIDEO_Y + W * 9 // 16 + 110
    for s in subs:
        lines.append(
            f"Dialogue: 1,{ts(s['start'])},{ts(s['end'])},Sub,,0,0,0,,"
            f"{{\\pos({W // 2},{sub_y})\\fad(80,0)}}{esc(s['text'])}"
        )
    lines.append(f"Dialogue: 0,{ts(0)},{end},Church,,0,0,0,,{{\\pos({W // 2 - 106},{H - 150})}}{CHURCH}")
    path = WORK / "short.ass"
    path.write_text(head + "\n".join(lines) + "\n", encoding="utf-8")
    return path


def render():
    clip = SRC / "clip.mp4"
    duration = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clip],
        capture_output=True, text=True, check=True).stdout)
    ass = build_ass(duration)
    fade = max(duration - 0.6, 0)
    fg_h = W * 9 // 16
    graph = (
        f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
        f"boxblur=40:4,eq=brightness=-0.32:saturation=0.8[bg];"
        f"[0:v]scale={W}:{fg_h}:force_original_aspect_ratio=increase,crop={W}:{fg_h}[fg];"
        f"[bg][fg]overlay=0:{VIDEO_Y}[v1];"
        f"[1:v]scale=88:-1[logo];"
        f"[v1][logo]overlay={W // 2 - 214}:{H - 150 - 46}[v2];"
        f"[v2]ass={ass}:fontsdir={FONTS},fps=30,format=yuv420p,"
        f"fade=t=in:d=0.3,fade=t=out:st={fade}:d=0.6[v];"
        f"[0:a]loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=in:d=0.2,afade=t=out:st={fade}:d=0.6[a]"
    )
    out = WORK / "short.mp4"
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-i", clip, "-i", LOGO,
        "-filter_complex", graph, "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-profile:v", "high",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out,
    ], check=True)
    print(f"완성 → {out} ({duration:.1f}초)")


if __name__ == "__main__":
    if sys.argv[1:] == ["subs"]:
        make_subs()
    else:
        render()
