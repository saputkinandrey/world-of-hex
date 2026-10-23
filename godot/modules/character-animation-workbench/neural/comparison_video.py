"""Compose validated Legacy/Neural frames; encode each comparison only once."""
import argparse
import json
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont
from preprocess import OUTPUT, REPO, sha
from recipe import attempt_folder


def main(attempt=None):
    legacy = REPO/'tmp/animation-workbench/frozen-legacy/repo/tmp/animation-workbench/segmentation'
    neural = OUTPUT/'render/repo/tmp/animation-workbench/segmentation'
    target = attempt_folder(OUTPUT/'comparison',attempt)
    target.mkdir(exist_ok=True)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
    for mode in ('chunks','texture'):
        video = target/('legacy-neural-'+mode+'.mp4')
        if video.exists():
            raise FileExistsError('Preserving previously encoded comparison; use --attempt LABEL: '+str(video))
        manifests = [json.loads((root/mode/'manifest.json').read_text()) for root in (legacy,neural)]
        for field in ('fps','size','directions','sources','clips'):
            if manifests[0][field] != manifests[1][field]:
                raise ValueError('Legacy/Neural conditions differ: '+field)
        if manifests[0]['clips']['sequence'] != 293 or manifests[0]['size'] != [2048,512]:
            raise ValueError('Unexpected comparison sequence contract')
        frames = target/('video-frames-'+mode)
        frames.mkdir(exist_ok=True)
        for index in range(293):
            result = Image.new('RGB',(2048,1088),(18,22,28))
            draw = ImageDraw.Draw(result)
            draw.text((10,4),'Frozen Legacy | S / N / SW / NW',font=font,fill='white')
            draw.text((10,548),'Independent Neural | gray / static = Unknown, not an inferred bone',font=font,fill='white')
            for root,offset in ((legacy,32),(neural,576)):
                path = root/mode/'sequence'/f'frame-{index:04d}.png'
                with Image.open(path) as image:
                    if image.size != (2048,512):
                        raise ValueError('Inconsistent source frame: '+str(path))
                    result.paste(image.convert('RGB'),(0,offset))
            # Replace overflowing diagnostic captions; clip names remain on
            # the aligned Legacy row. Do not touch either character image.
            draw.rectangle((0,576,2047,622),fill=(25,30,37))
            for column,(direction,name) in enumerate(zip(('S','N','SW','NW'),('South','North','SouthWest','NorthWest'))):
                count = manifests[1]['known_pixels'][name]
                draw.text((column*512+20,592),f'{direction} | Neural: {count} source pixels owned',font=font,fill='white')
            result.save(frames/f'frame-{index:04d}.png')
        saved = sorted(frames.glob('frame-*.png'))
        if len(saved) != 293:
            raise ValueError('Incomplete composed frame set')
        for path in saved:
            with Image.open(path) as image:
                if image.size != (2048,1088):
                    raise ValueError('Composed frame dimension mismatch: '+str(path))
        subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-framerate','30',
            '-i',str(frames/'frame-%04d.png'),'-c:v','libx264','-threads','2','-crf','18',
            '-pix_fmt','yuv420p','-movflags','+faststart',str(video)],check=True)
        (target/(mode+'-video.json')).write_text(json.dumps({'frames':293,'fps':30,
            'size':[2048,1088],'conditions':manifests,'video_sha256':sha(video),
            'frame_set_verified_before_encoding':True},indent=2)+'\n')
        print('Encoded '+str(video),flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--attempt')
    main(parser.parse_args().attempt)
