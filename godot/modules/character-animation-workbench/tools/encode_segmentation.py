"""Validate both complete frame sets before the final encoding pass."""
import subprocess
from encode_motion_videos import OUTPUT, verify


def main():
    folder = OUTPUT/'segmentation'
    modes = [('chunks','segmentation-chunks.mp4'),('texture','segmentation-texture-no-ligaments.mp4')]
    verified = [(folder/mode, filename, verify(folder/mode,293,1)) for mode,filename in modes]
    for frames, filename, manifest in verified:
        subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',
                        '-framerate',str(manifest['fps']),'-i',str(frames/'sequence/frame-%04d.png'),
                        '-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',
                        str(frames/filename)],check=True)
        print('Encoded '+str(frames/filename),flush=True)


if __name__ == '__main__':
    main()
