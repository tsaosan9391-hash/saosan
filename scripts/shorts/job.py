"""
설교 쇼츠 재료 준비 (GitHub Actions 에서 실행)

shorts/request.json 의 mode 에 따라
  prepare : 설교 전체 받아쓰기 + 장면 사진 + 예시 쇼츠 내려받기
  clip    : 고른 구간(start~end)만 고화질로 받아 자막용 단어 시각까지 뽑기
결과는 shorts/output/ 에 저장합니다.
"""
import json
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


def download(video_id, dest, fmt, extra=()):
    url = f"https://www.youtube.com/watch?v={video_id}"
    for client in CLIENTS:
        cmd = ["yt-dlp", "-f", fmt, "--merge-output-format", "mp4",
               "-o", str(dest), "--force-overwrites", *extra]
        if client:
            cmd += ["--extractor-args", f"youtube:player_client={client}"]
        if run(cmd + [url]) == 0 and Path(dest).exists():
            return
    sys.exit(f"영상 {video_id} 를 내려받지 못했습니다")


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
    download(REQ["reference"], OUT / "reference.mp4", "bv*[height<=1920]+ba/b")
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
