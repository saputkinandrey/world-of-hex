"""Official Detectron2 chart extraction on CPU in the existing WSL2."""
from pathlib import Path, PureWindowsPath
import urllib.request

import numpy as np
from PIL import Image

from common import ROOT, read, measured, sha

SURFACES = {1:'Torso_1',2:'Torso_2',3:'Right_Hand',4:'Left_Hand',5:'Left_Foot',6:'Right_Foot',
            7:'Right_Upper_Leg_7',9:'Right_Upper_Leg_9',8:'Left_Upper_Leg_8',10:'Left_Upper_Leg_10',
            11:'Right_Lower_Leg_11',13:'Right_Lower_Leg_13',12:'Left_Lower_Leg_12',14:'Left_Lower_Leg_14',
            15:'Left_Upper_Arm_15',17:'Left_Upper_Arm_17',16:'Right_Upper_Arm_16',18:'Right_Upper_Arm_18',
            19:'Left_Lower_Arm_19',21:'Left_Lower_Arm_21',20:'Right_Lower_Arm_20',22:'Right_Lower_Arm_22',23:'Head_23',24:'Head_24'}


def load():
    import torch
    import detectron2
    from detectron2.config import get_cfg
    from detectron2.engine import DefaultPredictor
    from densepose import add_densepose_config
    from densepose.vis.extractor import DensePoseResultExtractor
    from adapters import side_groups
    source = ROOT/'cache/wsl-densepose/detectron2'
    source_revision = (ROOT/'densepose/source-revision.txt').read_text().strip()
    model_root = PureWindowsPath(read(ROOT/'config.json')['model_root'])
    folder = Path('/mnt')/model_root.drive[0].lower()/Path(*model_root.parts[1:])/'densepose'
    folder.mkdir(parents=True,exist_ok=True)
    checkpoint = folder/'model_final_162be9.pkl'
    url = 'https://dl.fbaipublicfiles.com/densepose/densepose_rcnn_R_50_FPN_s1x/165712039/model_final_162be9.pkl'
    if not checkpoint.exists():
        urllib.request.urlretrieve(url,checkpoint)
    cfg = get_cfg()
    add_densepose_config(cfg)
    cfg.merge_from_file(str(source/'projects/DensePose/configs/densepose_rcnn_R_50_FPN_s1x.yaml'))
    cfg.MODEL.DEVICE = 'cpu'
    cfg.MODEL.WEIGHTS = str(checkpoint)
    # Keep all official config thresholds and resizing settings unchanged.
    predictor, metrics = measured(lambda: DefaultPredictor(cfg))
    extractor = DensePoseResultExtractor()
    labels = {0:'Background',**SURFACES}

    def infer(image):
        with torch.inference_mode():
            instances = predictor(np.asarray(image)[:,:,::-1])['instances'].to('cpu')
        charts, boxes = extractor(instances)
        class_map = np.zeros((image.height,image.width),dtype=np.int16)
        uv = np.zeros((2,image.height,image.width),dtype=np.float32)
        raw = {'scores':instances.scores.numpy(),'boxes_xyxy':instances.pred_boxes.tensor.numpy()}
        if charts:
            for index,chart in enumerate(charts):
                raw[f'instance_{index}_labels'] = chart.labels.numpy()
                raw[f'instance_{index}_uv'] = chart.uv.numpy()
            best = int(instances.scores.argmax())
            chart = charts[best]
            x,y,width,height = boxes[best].int().tolist()
            values = chart.labels.numpy()
            coords = chart.uv.numpy()
            x0,y0,x1,y1 = max(0,x),max(0,y),min(image.width,x+values.shape[1]),min(image.height,y+values.shape[0])
            class_map[y0:y1,x0:x1] = values[y0-y:y1-y,x0-x:x1-x]
            uv[:,y0:y1,x0:x1] = coords[:,y0-y:y1-y,x0-x:x1-x]
            output = instances.pred_densepose
            for name in ['coarse_segm','fine_segm','u','v']:
                raw['predictor_'+name] = getattr(output,name).numpy()
        raw['uv-model-grid'] = uv
        raw['uv-native'] = np.stack([np.asarray(Image.fromarray(channel).resize((150,150),Image.Resampling.NEAREST)) for channel in uv])
        return {'class_map':class_map,'labels':labels,'background_id':0,'raw':raw}

    return infer, {'backend':'Detectron2 CPU / WSL2','dtype':'float32','torch':torch.__version__,
                   'detectron2':detectron2.__version__,'number_of_classes':25,'anatomical_surfaces':24,
                   'checkpoint':{'url':url,'path':str(checkpoint),'sha256':sha(checkpoint),'source_revision':source_revision},
                   'load_metrics':metrics,'groups':side_groups(labels),
                   'surface_mapping_source':f'https://github.com/facebookresearch/detectron2/blob/{source_revision}/projects/DensePose/densepose/data/samplers/densepose_base.py',
                   'preprocessing':{'input_format':cfg.INPUT.FORMAT,'min_size_test':cfg.INPUT.MIN_SIZE_TEST,'max_size_test':cfg.INPUT.MAX_SIZE_TEST,
                                    'score_threshold':cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST,'flip_horizontal':False},
                   'instance_selection':'Highest-score detection for shared class map; all instance labels/UV, boxes/scores and native predictor tensors retained raw.'},False
