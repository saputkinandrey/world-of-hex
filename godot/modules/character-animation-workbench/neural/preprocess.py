"""Source-only preparation and categorical native-coordinate projection."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

MODULE = Path(__file__).resolve().parents[1]
REPO = MODULE.parents[2]
OUTPUT = REPO/'tmp/animation-workbench/neural'
SOURCES = {
    'south':('Char1_south_idle','Char1_body.png'),
    'north':('Char1_north_idle','Char1_body_back.png'),
    'south-west':('Char1_south_west_idle','Idle_body_SW1.png'),
    'north-west':('Char1_north_west_idle','Idle_body_NW1.png'),
}
METHODS = {'nearest':Image.Resampling.NEAREST,'bicubic':Image.Resampling.BICUBIC}


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''):
            digest.update(block)
    return digest.hexdigest()


def frame(view):
    directory, name = SOURCES[view]
    path = REPO/'godot/assets/Character/Character1/idle'/directory/name
    with Image.open(path) as atlas:
        return atlas.convert('RGBA').crop((0,0,atlas.height,atlas.height)), path


def prepare(image, mode, method, size=512, margin=0.08):
    if mode not in ('crop','canvas') or margin < 0:
        raise ValueError('Expected crop/canvas and a nonnegative content margin')
    box = image.getchannel('A').getbbox()
    if box is None:
        raise ValueError('Source has no occupied alpha')
    if mode == 'canvas':
        box = (0,0,image.width,image.height)
    else:
        pad = round(max(box[2]-box[0],box[3]-box[1])*margin)
        box = (max(0,box[0]-pad),max(0,box[1]-pad),
               min(image.width,box[2]+pad),min(image.height,box[3]+pad))
    cropped = image.crop(box)
    scale = size/max(cropped.size)
    dimensions = tuple(round(value*scale) for value in cropped.size)
    offset = [(size-dimensions[0])//2,(size-dimensions[1])//2]
    result = Image.new('RGBA',(size,size),'white')
    result.alpha_composite(cropped.resize(dimensions,METHODS[method]),tuple(offset))
    scales = [dimensions[0]/cropped.width,dimensions[1]/cropped.height]
    transform = {'crop':list(box),'scale':scales,
                 'offset':[offset[i]-box[i]*scales[i] for i in range(2)],
                 'native_size':list(image.size),'input_size':[size,size],
                 'resampling':method,'margin_fraction':margin,'mode':mode,
                 'coordinates':'edge: model = native * scale + offset; center index: model = (native + .5) * scale + offset - .5'}
    return result.convert('RGB'), transform


def project(labels, transform):
    """Sample categorical predictions at each original source pixel center."""
    width,height = transform['native_size']
    values = np.asarray(labels)
    x = np.floor((np.arange(width)+.5)*transform['scale'][0]+transform['offset'][0]).astype(int)
    y = np.floor((np.arange(height)+.5)*transform['scale'][1]+transform['offset'][1]).astype(int)
    result = np.zeros((height,width),dtype=values.dtype)
    valid_x = (x >= 0) & (x < values.shape[1])
    valid_y = (y >= 0) & (y < values.shape[0])
    result[np.ix_(valid_y,valid_x)] = values[np.ix_(y[valid_y],x[valid_x])]
    return result


def prepare_view(view):
    folder = OUTPUT/'inputs'
    folder.mkdir(parents=True,exist_ok=True)
    records = {}
    config = json.loads(Path(__file__).with_name('experiments.json').read_text())
    image,source = frame(view)
    image.save(folder/(view+'-source.png'))
    for mode in ('canvas','crop'):
        for method in METHODS:
            key = f'{view}-{mode}-{method}-512'
            result,transform = prepare(image,mode,method,margin=config['content_margin_fraction'])
            path = folder/(key+'.png')
            if not path.exists() or not np.array_equal(np.asarray(Image.open(path).convert('RGB')),np.asarray(result)):
                result.save(path)
            records[key] = {'source':source.relative_to(REPO).as_posix(),
                            'source_sha256':sha(source),'input':str(path),
                            'input_sha256':sha(path),'transform':transform}
    return records


def main():
    records = {}
    for view in SOURCES:
        records.update(prepare_view(view))
    (OUTPUT/'inputs.json').write_text(json.dumps(records,indent=2)+'\n')
    print('Prepared 16 independent source-only inputs: '+str(OUTPUT/'inputs'))


if __name__ == '__main__':
    main()
