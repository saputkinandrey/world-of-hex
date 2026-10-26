"""Independent-process disk replay plus component-based reachability oracle."""
import re
import numpy as np
from PIL import Image
from flood import unreachable_components,MIRROR_DIRECTION
from io_support import ROOT,REPO,read,write,sha,load,provenance,invariants
from main import calculate,protected


def verify():
    config,inventory,labels,groups,data=load()
    replay=calculate(data,reverse=True)
    manifest=read(ROOT/'source-manifest.json')
    assert protected()==manifest['protected_files']
    assert all(sha(REPO/p)==value for p,value in manifest['compact_inputs'].items())
    checked,region_count=0,0
    for key,item in data.items():
        result=replay[key]
        for component in unreachable_components(item['alpha']):
            xs,ys=zip(*component['coordinates_xy'])
            has_seed=np.any(item['original'][ys,xs]>0)
            if has_seed:
                assert np.all(result['owners'][ys,xs]>0)
                assert np.all(result['distance'][ys,xs]>=0)
            else:
                assert np.all(result['owners'][ys,xs]==0)
                assert np.all(result['distance'][ys,xs]==-1)
        regions=read(ROOT/'geometry'/key/'unreachable-regions.json')['regions']
        unknown_union=np.zeros_like(item['alpha'])
        for region in regions:
            assert region['area']==len(region['coordinates_xy'])
            region_mask=np.zeros_like(item['alpha'])
            for x,y in region['coordinates_xy']:
                region_mask[y,x]=True
            np.testing.assert_array_equal(region_mask,np.array(Image.open(ROOT/'geometry'/key/f'unreachable-region-{region["id"]:03d}.png'))>0)
            assert not np.any(unknown_union&region_mask)
            unknown_union|=region_mask
            region_count+=1
        np.testing.assert_array_equal(unknown_union,result['unknown'])
        for skin,frame in enumerate(item['frames']):
            folder=ROOT/'results'/key/f'frame-{skin:03d}'
            expected={'owners-original':item['original'],'owners-filled':result['owners'],
                      'flood-distance':result['distance'],'clockwise-tiebreak-direction':result['tie_direction'],
                      'provenance':provenance(result['owners'],item['original'],item['alpha'])}
            for name,array in expected.items():
                np.testing.assert_array_equal(np.load(folder/f'{name}.npy'),array)
            invariants(item['original'],expected['owners-filled'],item['alpha'],expected['provenance'])
            assert not np.any(expected['provenance']==3)
            np.testing.assert_array_equal(np.array(Image.open(folder/'source.png')),frame['rgba'])
            np.testing.assert_array_equal(np.array(Image.open(folder/'clockwise-tiebreak-mask.png'))>0,result['tie_mask'])
            np.testing.assert_array_equal(np.array(Image.open(folder/'unknown-mask.png'))>0,result['unknown'])
            for i,name in enumerate(groups,1):
                np.testing.assert_array_equal(np.array(Image.open(folder/'masks'/f'{name}.png'))>0,result['owners']==i)
            for name in ['source','original','historical-r2','convergence','added','clockwise-ties','unknown','provenance']:
                canvas=Image.open(ROOT/'atlases'/key/f'{name}.png')
                assert canvas.size==tuple(item['atlas']['atlas_size'])
            w,h=item['atlas']['frame_size']
            canvas=Image.open(ROOT/'atlases'/key/'source.png').convert('RGBA')
            x,y=(skin%item['atlas']['hframes'])*w,(skin//item['atlas']['hframes'])*h
            np.testing.assert_array_equal(np.array(canvas.crop((x,y,x+w,y+h))),frame['rgba'])
            if item['atlas']['mirrored']:
                west=f'{item["atlas"]["pose"]}/{item["atlas"]["source_direction"]}'
                for name in expected:
                    original=np.load(ROOT/'results'/west/f'frame-{skin:03d}'/f'{name}.npy')
                    mirrored=original[:,::-1]
                    if name=='clockwise-tiebreak-direction':
                        mirrored=MIRROR_DIRECTION[mirrored]
                    np.testing.assert_array_equal(expected[name],mirrored)
            checked+=1
    links=0
    for document in ['REPORT_v1.1.0.md','INDEX_v1.1.0.md','README_v1.1.0.md']:
        for target in re.findall(r'\]\(([^)]+)\)',(ROOT/document).read_text(encoding='utf-8')):
            if '://' not in target:
                assert (ROOT/target).exists(),target
                links+=1
    verification=read(ROOT/'verification.json')
    verification.update({'independent_process_disk_frames_checked':checked,
        'component_reachability_oracle':True,'unreachable_region_masks_checked':region_count,
        'group_masks_checked':checked*len(groups),'all_service_maps_reflected_exactly':True,
        'historical_r2_read_only':True,'document_links_checked':links})
    write(ROOT/'verification.json',verification)
    print(f'Verified {checked} frames, {region_count} unreachable masks and {links} links')


if __name__=='__main__':
    verify()
