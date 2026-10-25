"""
설교 쇼츠 재료 준비 (GitHub Actions 에서 실행)

shorts/request.json 의 mode 에 따라
  prepare : 설교 전체 받아쓰기 + 장면 사진 + 예시 쇼츠 내려받기
  clip    : 고른 구간(start~end)만 고화질로 받아 자막용 단어 시각까지 뽑기
결과는 shorts/output/ 에 저장합니다.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

REQ = json.loads(Path("shorts/request.json").read_text(encoding="utf-8"))
OUT = Path("shorts/output")
WORK = Path("/tmp/shorts")
OUT.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)

# 유튜브가 가끔 특정 방식의 요청을 막아서, 막히면 다른 방식으로 다시 시도합니다
CLIENTS = [None, "tv,web_safari", "mweb", "web_embedded", "android_vr"]


def run(cmd):
    print("+", " ".join(map(str, cmd)), flush=True)
    return subprocess.run(cmd, check=False).returncode


# 유튜브가 GitHub 서버의 요청을 '로봇'으로 보고 막는 경우가 많아,
# 저장소 비밀값 YT_COOKIES(유튜브 로그인 쿠키)가 있으면 함께 보냅니다.
COOKIES = []
if os.environ.get("YT_COOKIES", "").strip():
    cookie_file = WORK / "cookies.txt"
    cookie_file.write_text(os.environ["YT_COOKIES"].strip() + "\n", encoding="utf-8")
    COOKIES = ["--cookies", str(cookie_file)]


def download(video_id, dest, fmt, extra=(), required=True):
    # 유튜브 대신 구글 드라이브 등에 올린 원본 파일 주소를 쓸 수도 있습니다
    source = REQ.get("source_url") if video_id == REQ.get("video") else None
    if source:
        if "drive.google.com" in source:
            cmd = ["gdown", "--fuzzy", source, "-O", str(dest)]
        else:
            cmd = ["curl", "-sSL", "-o", str(dest), source]
        if run(cmd) != 0:
            sys.exit("원본 파일을 내려받지 못했습니다")
        if extra:  # 구간만 필요하면 잘라 냅니다
            start, end = REQ["start"], REQ["end"]
            full = WORK / "source-full.mp4"
            Path(dest).rename(full)
            run(["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-to", str(end),
                 "-i", full, "-c:v", "libx264", "-crf", "18", "-c:a", "aac", dest])
        return True
    url = f"https://www.youtube.com/watch?v={video_id}"
    for client in CLIENTS:
        cmd = ["yt-dlp", "-f", fmt, "--merge-output-format", "mp4",
               "-o", str(dest), "--force-overwrites", *COOKIES, *extra]
        if client:
            cmd += ["--extractor-args", f"youtube:player_client={client}"]
        if run(cmd + [url]) == 0 and Path(dest).exists():
            return True
    if required:
        sys.exit(f"영상 {video_id} 를 내려받지 못했습니다")
    print(f"영상 {video_id} 를 내려받지 못해 건너뜁니다", flush=True)
    return False


def transcribe(audio, model_name, words):
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _ = model.transcribe(
        str(audio), language="ko", word_timestamps=words, vad_filter=True,
        beam_size=5,
    )
    result = []
    for s in segments:
        item = {"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()}
        if words:
            item["words"] = [
                {"start": round(w.start, 2), "end": round(w.end, 2), "word": w.word}
                for w in s.words
            ]
        result.append(item)
        print(f"[{s.start:7.1f}] {s.text.strip()}", flush=True)
    return result


def fmt_time(t):
    return f"{int(t // 60):02d}:{t % 60:04.1f}"


if REQ["mode"] == "prepare":
    # 예시 쇼츠: 짧으니 통째로 저장해 양식을 살펴봅니다
    # (예시는 없어도 진행합니다)
    if download(REQ["reference"], OUT / "reference.mp4", "bv*[height<=1920]+ba/b",
                required=False):
        run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json",
             OUT / "reference.mp4"])

    sermon = WORK / "sermon.mp4"
    download(REQ["video"], sermon, "bv*[height<=720]+ba/b[height<=720]/b")
    info = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", sermon],
        capture_output=True, text=True, check=True)
    duration = float(json.loads(info.stdout)["format"]["duration"])
    (OUT / "sermon-info.json").write_text(json.dumps({"duration": duration}), encoding="utf-8")

    # 화면 구성을 보려고 1분마다 한 장씩 작은 사진을 뜹니다
    frames = OUT / "sermon-frames"
    frames.mkdir(exist_ok=True)
    run(["ffmpeg", "-v", "error", "-y", "-i", sermon, "-vf", "fps=1/60,scale=480:-2",
         "-q:v", "5", frames / "f%03d.jpg"])

    audio = WORK / "sermon.wav"
    run(["ffmpeg", "-v", "error", "-y", "-i", sermon, "-ac", "1", "-ar", "16000", audio])
    segs = transcribe(audio, "small", words=False)
    (OUT / "transcript.json").write_text(json.dumps(segs, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "transcript.txt").write_text(
        "\n".join(f"[{fmt_time(s['start'])}] {s['text']}" for s in segs), encoding="utf-8")

elif REQ["mode"] == "clip":
    start, end = REQ["start"], REQ["end"]
    clip = OUT / "clip.mp4"
    download(REQ["video"], clip, "bv*[height<=1080]+ba/b",
             ["--download-sections", f"*{start}-{end}", "--force-keyframes-at-cuts"])
    audio = WORK / "clip.wav"
    run(["ffmpeg", "-v", "error", "-y", "-i", clip, "-ac", "1", "-ar", "16000", audio])
    segs = transcribe(audio, "large-v3", words=True)
    (OUT / "clip-words.json").write_text(json.dumps(segs, ensure_ascii=False, indent=1), encoding="utf-8")
