from pathlib import Path
import importlib.util
import subprocess

repository = Path(__file__).resolve().parents[2]
module = repository/'godot/modules/character-animation-workbench/tools/encode_motion_videos.py'
spec = importlib.util.spec_from_file_location('motion_encoder',module)
encoder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(encoder)
frames = repository/'tmp/animation-workbench/comparison-expressive-resources'
manifest = encoder.verify(frames,293,1)
output = repository/'tmp/animation-workbench/comparison-topology-ligaments'
output.mkdir(exist_ok=True)
video = output/'topology-ligaments-four-directions.mp4'
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-framerate',str(manifest['fps']),'-i',str(frames/'sequence/frame-%04d.png'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(video)],check=True)
print(video)
