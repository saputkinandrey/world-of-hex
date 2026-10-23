"""Executable repository skill interface: dual inference or persisted evaluation."""
import argparse
import json
from pathlib import Path
import sys

REPO = Path(__file__).resolve().parents[4]
MODULE = REPO/'godot/modules/character-animation-workbench/neural'
sys.path.insert(0,str(MODULE))

import numpy as np
from PIL import Image
from evidence_store import CURRENT, MODELS, inventory, locked, write_json
from head_analysis import analyze_evaluation, iou
from head_runs import prepare_source, run_dual
from infer import settings
from inference_parameters import parameters
from inference_recipe import contract
from preprocess import OUTPUT, sha


def rejection_reason(mask, stats, reviewed, similarity, validation):
    if not mask.any():
        return 'no_neural_component'
    if stats['metrics']['silhouette_overlap_fraction'] < .5:
        return 'majority_outside_source_silhouette'
    if reviewed and reviewed['classification'] != 'complete_plausible_head':
        return 'reviewed_'+reviewed['classification']
    if similarity is not None and similarity < validation['minimum_iou']:
        return 'disagrees_with_validated_neural_reference'
    return None


def main(args):
    source,output = args.input.resolve(),args.output.resolve()
    if output.is_relative_to(CURRENT.resolve()):
        raise ValueError('Skill output must be separate from protected current evidence')
    output.mkdir(parents=True,exist_ok=False)
    record = prepare_source(source,output/'inputs',args.resolution,args.preprocessing,args.frame_size)
    if args.evidence:
        evaluation = args.evidence.resolve()
        for model in MODELS:
            previous = json.loads((evaluation/model/'manifest.json').read_text())
            if inventory(evaluation/model) != previous['files']:
                raise ValueError('Persisted model evidence checksum mismatch: '+model)
            origin = previous['input']
            if record['source_sha256'] != origin['source_sha256'] or record['transform'] != origin['transform']:
                raise ValueError('Persisted evaluation belongs to another source or preprocessing configuration')
            if not np.array_equal(np.asarray(Image.open(record['input'])),np.asarray(Image.open(evaluation/model/'input.png'))):
                raise ValueError('Prepared input pixels differ from persisted model input')
        # Analysis writes only the new result folder; the original trial remains immutable.
        masks,stats = analyze_evaluation(evaluation,record,Image.open(output/'inputs/source.png').convert('RGBA'),
                                        destination=output/'diagnostics')
    else:
        evaluation = output/'evaluation'
        evaluation.mkdir()
        tooling,upstream,_ = settings()
        recipes = {model:contract(model,tooling,upstream) for model in MODELS}
        with locked(OUTPUT/'work/session'):
            run_dual(record,evaluation,parameters({'parameters':{'seed':args.seed,'steps':args.steps,
                'resolution':args.resolution,'depth_resolution':args.resolution}}),recipes)
        masks,stats = analyze_evaluation(evaluation,record,Image.open(output/'inputs/source.png').convert('RGBA'),
                                        destination=output/'diagnostics')
    decision_path = MODULE/'evidence/experiments/sw-head-consistency-01/analysis/skill-validation.json'
    validation = json.loads(decision_path.read_text()) if decision_path.exists() else None
    manifests = {model:json.loads((evaluation/model/'manifest.json').read_text()) for model in MODELS}
    actual = manifests['layerdiff']['parameters']
    validated = False
    similarity = None
    same_recipe = validation and all(manifests[model]['contract']==validation['recipes'][model]
        and manifests[model]['outcome']=='completed' for model in MODELS)
    same_parameters = validation and all(actual[key]==value for key,value in validation['fixed_parameters'].items()) and actual['seed'] in validation['validated_seeds']
    known_source = validation and record['source_sha256']==validation['source_sha256'] and record['transform']==validation['transform']
    known_input = known_source and validation.get('validated')
    reviewed = validation.get('reviewed_predictions',{}).get(stats['raw_head_sha256']) if known_source else None
    if known_input:
        reference = np.asarray(Image.open(MODULE/validation['reference_mask']))>0
        similarity = iou(masks,reference)
        validated = same_recipe and same_parameters and similarity is not None and similarity >= validation['minimum_iou']
    rejection = rejection_reason(masks,stats,reviewed,similarity,validation)
    status = 'unsuccessful_recognition' if rejection else 'recognized_validated_input' if validated else 'candidate_requires_anatomical_review'
    result = {'schema':'hex-sprite-head/0.1','status':status,'input':record,
        'mask':str(output/'diagnostics/head-native.png') if validated else None,
        'candidate_mask':str(output/'diagnostics/head-native.png'),'model_mask':str(output/'diagnostics/head-model.png'),
        'rejection_reason':rejection,
        'reviewed_quality':reviewed,
        'direct_predictions':str(evaluation),'provenance':{model:str(evaluation/model/'manifest.json') for model in MODELS},
        'execution_outcomes':{model:manifests[model]['outcome'] for model in MODELS},'actual_parameters':actual,
        'metrics':stats['metrics'],'mean_selected_alpha':stats['mean_selected_alpha'],
        'anatomical_validation':{'validated':validated,'reference_iou':similarity,
            'scope':'only source identity and preprocessing validated by the stored SW experiment; other sprites need visual review'},
        'ambiguity':'Neural alpha is not calibrated anatomical confidence; SemanticSam semantic classes are reported separately.'}
    write_json(output/'result.json',result)
    print(json.dumps(result,indent=2))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--seed',type=int,default=42)
    parser.add_argument('--steps',type=int,default=20)
    parser.add_argument('--resolution',type=int,default=512)
    parser.add_argument('--preprocessing',choices=['nearest','bicubic'],default='bicubic')
    parser.add_argument('--frame-size',type=int)
    parser.add_argument('--evidence',type=Path)
    main(parser.parse_args())
