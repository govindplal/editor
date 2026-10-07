"""Re-transcribe chosen spans with Whisper large-v3 when the ingest transcript is wrong or has gaps
(mixed-language speech, names, unclear words). Short spans (1.5-4 s) work best; whisper hallucinates on long
non-English chunks, so cross-check the two modes and treat disagreements as unsure.

usage: asr.py <audio16k.wav> <s:e,s:e,...> [--lang ml] [--modes translate,transcribe-en]
  translate      -> English translation of <lang> speech (meaning)
  transcribe-en  -> literal English-alphabet hearing (names, English words inside Manglish/Hinglish)
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sherpa_onnx, soundfile as sf
import transcribe

wav, spans = sys.argv[1], sys.argv[2]
args = sys.argv[3:]
lang = args[args.index("--lang") + 1] if "--lang" in args else "en"
modes = (args[args.index("--modes") + 1] if "--modes" in args else ("translate,transcribe-en" if lang != "en" else "transcribe-en")).split(",")
m = transcribe.ensure("sherpa-onnx-whisper-large-v3") + "/large-v3-"
a, sr = sf.read(wav, dtype="float32")
chunks = [tuple(map(float, c.split(":"))) for c in spans.split(",")]
for mode in modes:
    task, lg = ("translate", lang) if mode == "translate" else ("transcribe", mode.split("-", 1)[1] if "-" in mode else lang)
    r = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=m + "encoder.int8.onnx", decoder=m + "decoder.int8.onnx",
                                                   tokens=m + "tokens.txt", language=lg, task=task, num_threads=os.cpu_count() or 4)
    print(f"===== {mode}", flush=True)
    for s, e in chunks:
        st = r.create_stream(); st.accept_waveform(sr, a[int(s * sr):int(e * sr)]); r.decode_stream(st)
        print(f"{s:6.2f}-{e:6.2f} | {st.result.text.strip()}", flush=True)
