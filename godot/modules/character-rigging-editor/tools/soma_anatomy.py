"""Anatomical relations over immutable labels AND the visible source silhouette.

Only original SOMA joint names are used. A missing semantic owner does not
delete visible geometry. Recovered regions remain proposals, never owners.
"""
import copy
import heapq

import numpy as np
from scipy import ndimage

ARM_IDS={'Left':(10,12,3),'Right':(11,13,2)}
LEG_IDS={'Left':(7,9,4),'Right':(6,8,5)}


def pixels(mask):
    return np.argwhere(mask)[:,::-1].astype(float)+.5


def component(mask):
    labels,n=ndimage.label(mask)
    if not n: return mask.copy()
    sizes=np.bincount(labels.ravel());sizes[0]=0
    return labels==sizes.argmax()


def center(mask):
    p=pixels(mask)
    return np.median(p,axis=0) if len(p) else None


def nearest(mask,point):
    p=pixels(mask)
    if not len(p): raise ValueError('No visible silhouette in anatomical search region')
    return p[np.argmin(np.linalg.norm(p-point,axis=1))]


def interface(first,second,gap=2.):
    """A contact is a candidate interval; topology/pair/silhouette must corroborate it."""
    if not first.any() or not second.any(): return None
    distance,indices=ndimage.distance_transform_edt(~first,return_indices=True)
    selected=second & (distance<=gap)
    y,x=np.nonzero(selected)
    if len(x)<2: return None
    other=np.column_stack((indices[1,y,x]+.5,indices[0,y,x]+.5))
    point=np.median((np.column_stack((x+.5,y+.5))+other)/2,axis=0)
    return point


def cap(mask,distal,fraction=.8):
    """Interior of proximal cap chosen by CHAIN direction, never torso centroid/PCA sign."""
    p=pixels(mask)
    if not len(p): return None
    distances=np.linalg.norm(p-distal,axis=1)
    points=p[distances>=np.quantile(distances,fraction)]
    return points.mean(0)


def pose_symmetry(alpha,torso,view):
    midpoint=center(torso)[0]
    best=(0.,midpoint)
    h,w=alpha.shape
    for axis in np.arange(midpoint-3,midpoint+3.01,.5):
        indices=np.rint(2*axis-1-np.arange(w)).astype(int)
        mirrored=np.zeros_like(alpha)
        valid=(indices>=0)&(indices<w)
        mirrored[:,valid]=alpha[:,indices[valid]]
        iou=float(np.sum(alpha&mirrored)/max(1,np.sum(alpha|mirrored)))
        if iou>best[0]: best=(iou,axis)
    axis=best[1]
    indices=np.rint(2*axis-1-np.arange(w)).astype(int)
    mirrored=np.zeros_like(alpha);valid=(indices>=0)&(indices<w);mirrored[:,valid]=alpha[:,indices[valid]]
    p=pixels(torso);yy,xx=np.indices(alpha.shape)
    span=np.quantile(abs(p[:,0]-axis),.9)
    lateral=(abs(xx+.5-axis)>span*.65)&(yy+.5>=np.quantile(p[:,1],.03))&(yy+.5<=p[:,1].max()+6)
    limb_iou=float(np.sum(alpha&mirrored&lateral)/max(1,np.sum((alpha|mirrored)&lateral)))
    return {'silhouette_mirror_iou':best[0],'lateral_limb_iou':limb_iou,'axis_x':float(best[1]),
            'pose_symmetric':bool(view in ['south','north'] and best[0]>.87 and limb_iou>.9),
            'anatomical_pairing':True,'reason':'Pose symmetry requires frontal view, whole-alpha agreement AND lateral limb agreement; paired anatomy alone does not imply a mirrored pose'}


def trace(alpha,start,end,region=None):
    """Visible interior geodesic. It cannot tunnel through transparent pixels."""
    mask=alpha.copy() if region is None else alpha&region
    start=nearest(mask,start);end=nearest(mask,end)
    sy,sx=np.floor(start[::-1]).astype(int);ey,ex=np.floor(end[::-1]).astype(int)
    thickness=ndimage.distance_transform_edt(mask)
    cost=np.full(mask.shape,np.inf);cost[sy,sx]=0
    previous={};queue=[(0.,int(sy),int(sx))]
    h,w=mask.shape
    while queue:
        current,y,x=heapq.heappop(queue)
        if current!=cost[y,x]: continue
        if (y,x)==(ey,ex): break
        for dy,dx in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]:
            yy,xx=y+dy,x+dx
            if yy<0 or yy>=h or xx<0 or xx>=w or not mask[yy,xx]: continue
            value=current+np.hypot(dx,dy)*(1+3/(thickness[yy,xx]+.5))
            if value<cost[yy,xx]:
                cost[yy,xx]=value;previous[(yy,xx)]=(y,x);heapq.heappush(queue,(value,yy,xx))
    if not np.isfinite(cost[ey,ex]): return None
    path=[(ey,ex)]
    while path[-1]!=(sy,sx): path.append(previous[path[-1]])
    return np.array(path[::-1])[:,::-1].astype(float)+.5


def path_fraction(path,fraction):
    lengths=np.r_[0,np.cumsum(np.linalg.norm(np.diff(path,axis=0),axis=1))]
    return path[np.argmin(abs(lengths-fraction*lengths[-1]))]


def body(alpha,owners,symmetry):
    torso=component(owners==1);head=component(owners==14)
    if not torso.any() or not head.any():
        raise ValueError('Torso/head correspondence missing: explicit review required before body-frame reconstruction')
    p=pixels(torso);hp=pixels(head)
    bottom=float(np.quantile(p[:,1],.9))
    base=float(np.quantile(hp[:,1],.95));top=float(np.quantile(hp[:,1],.03))
    if np.median(hp[:,1])>=np.median(p[:,1]) or base>=bottom:
        raise ValueError('Head/torso semantics contradict the upright anatomical chain; manual source review required')
    cx=symmetry['axis_x'] if symmetry['pose_symmetric'] else float(np.median(p[:,0]))
    hx=float(np.median(hp[:,0]))
    chest_y=base+(bottom-base)*.35
    # The bottom of the visible head is the CHIN, not a detected neck pivot.
    # Skull-base/neck positions behind the large head are anatomical intervals.
    joints={'Hips':[cx,bottom], 'Chest':[cx,chest_y], 'Neck1':[hx,base-.25*(base-top)], 'Neck2':[hx,base-.35*(base-top)],
            'Head':[hx,base-.5*(base-top)],'HeadEnd':[hx,top]}
    for n,t in [('Spine1',1/3),('Spine2',2/3)]:joints[n]=[cx,bottom*(1-t)+chest_y*t]
    return joints


def snapshot(state,name,why,source,used=(),conflicts=()):
    before=state['steps'][-1]['after'] if state['steps'] else {}
    after=copy.deepcopy(state['joints'])
    state['steps'].append({'step':len(state['steps']), 'name':name,'chunk':source,'quality':state['quality'].get(source,0.),
                           'priority':state.get('current_priority',state['quality'].get(source,0.)),'why':why,'used_neighbors':list(used),
                           'constrained_joints':[n for n in after if n not in before or before[n]!=after[n]],
                           'before':copy.deepcopy(before),'after':after,'unknown_joints':[n for n in state['names'] if n not in after],
                           'remaining_prior_only_joints':len(state['names'])-len(after), 'unknown_depth':'Unobserved; canonical depth prior',
                           'knowledge':copy.deepcopy(state['knowledge']),'conflicts':list(conflicts)})
    state['steps'][-1]['recovered_regions']=copy.deepcopy(state['regions'])


def establish(state,name,point,radius,sources,status='observed-chain',why=''):
    state['joints'][name]={'point':np.asarray(point,float).tolist(),'heuristic_radius_px':float(radius),'evidence_count':len(sources),
                           'sources':list(sources),'status':status,'why':why,'depth':'unobserved'}


def shoulder_search(alpha,body_joints,side_sign,span,girdle):
    yy,xx=np.indices(alpha.shape);cx=body_joints['Hips'][0]
    region=(abs(xx+.5-(cx+side_sign*span))<6)&(abs(yy+.5-girdle)<7)
    candidates=pixels(alpha&region)
    if not len(candidates): return None
    thick=ndimage.distance_transform_edt(alpha)
    yx=np.floor(candidates[:,::-1]).astype(int)
    weights=thick[yx[:,0],yx[:,1]]**2*np.exp(-((candidates[:,1]-girdle)/5)**2)
    return np.average(candidates,axis=0,weights=weights+.01)


def observed_arm(alpha,owners,side,frame):
    upper,lower,hand=ARM_IDS[side]
    masks=[component(owners==i) for i in [upper,lower,hand]]
    palm=center(masks[2])
    elbow=interface(masks[0],masks[1]);wrist=interface(masks[1],masks[2])
    distal=wrist if wrist is not None else palm
    if distal is None and masks[1].any(): distal=center(masks[1])
    shoulder=cap(masks[0],distal) if distal is not None and masks[0].any() else None
    conflicts=[]
    lower_cap=False
    if elbow is None and wrist is not None and masks[1].any():
        elbow=cap(masks[1],wrist)
        lower_cap=True
    if shoulder is not None and elbow is not None and palm is not None:
        if np.linalg.norm(shoulder-palm)<np.linalg.norm(elbow-palm):
            conflicts.append('Upper/lower contact reverses the ordered shoulder-elbow-hand chain')
            elbow=None
    head_points=pixels(owners==14)
    visible_chin=float(np.quantile(head_points[:,1],.95))
    if shoulder is not None and shoulder[1]>visible_chin+3:
        conflicts.append('Upper-arm category lies below the anatomical shoulder girdle; not accepted as shoulder evidence')
        shoulder=None
    return {'shoulder':shoulder,'elbow':elbow,'wrist':wrist,'palm':palm,'masks':masks,'conflicts':conflicts,
            'complete':all(p is not None for p in [shoulder,elbow,wrist]) and not lower_cap,'ids':[upper,lower,hand],
            'lower_cap':lower_cap}


def arm_stage(state,alpha,owners,side,observation,other):
    frame={n:v['point'] for n,v in state['joints'].items()}
    upper,lower,hand=ARM_IDS[side]
    shoulder,elbow,wrist=observation['shoulder'],observation['elbow'],observation['wrist']
    palm=observation['palm'];cx=frame['Hips'][0]
    own_center=center(np.isin(owners,[upper,lower,hand]))
    if own_center is None:
        state['conflicts'].append(f'{side} arm has no semantic fragment; anatomical side registration is unresolved')
        return
    sign=np.sign(own_center[0]-cx) or (1 if side=='Left' else -1)
    girdle=frame['Neck1'][1]
    template=state['knowledge'].get('arm_template')
    terminal_hypothesis=False
    if shoulder is None:
        span=template['shoulder_span'] if template else max(7.,abs(own_center[0]-cx))
        shoulder=shoulder_search(alpha,frame,sign,span,girdle)
    if shoulder is None: return
    if wrist is None and palm is not None:
        # The visible palm gives its proximal cap along the known shoulder chain.
        p=pixels(observation['masks'][2])
        distance=np.linalg.norm(p-shoulder,axis=1)
        wrist=p[distance<=np.quantile(distance,.25)].mean(0)
    if wrist is None and observation['masks'][1].any():
        lower_points=pixels(observation['masks'][1])
        direction=lower_points.mean(0)-shoulder
        direction/=max(1e-8,np.linalg.norm(direction))
        distal=lower_points[np.argmax((lower_points-shoulder)@direction)]
        wrist=nearest(alpha,distal+direction*2.)
    if wrist is None:
        # Missing hand/forearm labels do not erase the visible outer branch.
        # Its anatomical ownership is ambiguous when it merges into a leg;
        # retain that ambiguity instead of displaying a canonical T-pose arm.
        yy,xx=np.indices(alpha.shape)
        head_height=abs(frame['HeadEnd'][1]-frame['Neck2'][1])*1.6
        limit=min(frame['Hips'][1]+head_height*.65,shoulder[1]+head_height*1.4)
        roi=(sign*(xx+.5-cx)>abs(shoulder[0]-cx)*.45)&(yy+.5>=shoulder[1])&(yy+.5<=limit)
        local=alpha&roi
        if local.any():
            p=pixels(local);end=p[:,1].max()
            distal=p[p[:,1]>=end-2]
            weights=np.maximum(.1,sign*(distal[:,0]-cx))**2
            wrist=np.average(distal,axis=0,weights=weights)
            wrist=nearest(local,wrist)
            terminal_hypothesis=True
            state['conflicts'].append(side+' hand/forearm semantics absent: outer alpha branch is a bounded anatomical hypothesis, not a detected hand')
    if wrist is None:
        state['conflicts'].append(f'{side} wrist occluded: visible image does not resolve it')
        establish(state,side+'Arm',shoulder,4,[upper,'alpha','body-girdle'],'occluded-hypothesis')
        snapshot(state,side+' shoulder only','Occluded wrist is not invented',upper,[1,14])
        return
    recovery=not observation['complete']
    if elbow is None:
        yy,xx=np.indices(alpha.shape)
        margin=max(7.,np.linalg.norm(wrist-shoulder)*.35)
        region=(xx>=min(shoulder[0],wrist[0])-margin)&(xx<=max(shoulder[0],wrist[0])+margin)&(yy>=min(shoulder[1],wrist[1])-margin*.4)&(yy<=max(shoulder[1],wrist[1])+margin*.4)
        path=trace(alpha,shoulder,wrist,region)
        if path is None:
            state['conflicts'].append(f'{side} arm path occluded/disconnected; elbow unresolved')
            return
        fraction=template['upper_fraction'] if template else .55
        elbow=path_fraction(path,fraction)
        state['knowledge']['transfers'].append({'to':side+'ForeArm','from':template['source'] if template else 'canonical arm chain',
            'relation':'upper/lower segment proportion, not mirrored coordinates','used_silhouette':True,'path':path.tolist()})
    elif recovery and template:
        state['knowledge']['transfers'].append({'to':side+' arm','from':template['source'],
            'relation':'paired segment proportion and shoulder span checked against own visible alpha; no coordinate mirroring','used_silhouette':True})
    status='occluded-hypothesis' if terminal_hypothesis else 'recovered-silhouette' if recovery else 'observed-chain'
    sources=[i for i,mask in zip([upper,lower,hand],observation['masks']) if mask.any()]+['alpha','body-girdle']+(['paired-arm-template'] if recovery and template else [])
    for name,p,r in [(side+'Arm',shoulder,2.5),(side+'ForeArm',elbow,3.),(side+'Hand',wrist,2.5)]:
        establish(state,name,p,6. if terminal_hypothesis else r if not recovery else r+1.5,sources,status,'Ordered shoulder-elbow-wrist chain, visible interior, semantic interfaces and anatomical pairing')
    root=np.array([cx+sign*max(1.5,abs(shoulder[0]-cx)*.13),shoulder[1]+2.])
    establish(state,side+'Shoulder',root,3.,['body-girdle',upper],'recovered-silhouette','Clavicle root relative to central chest; not the glenohumeral Arm joint')
    up=np.linalg.norm(shoulder-elbow);lo=np.linalg.norm(elbow-wrist)
    if observation['complete']:
        current={'source':side+' observed arm','upper_fraction':float(up/max(.1,up+lo)),'shoulder_span':float(abs(shoulder[0]-cx)),
                 'upper_px':float(up),'lower_px':float(lo)}
        if template:
            for key in ['upper_fraction','shoulder_span','upper_px','lower_px']: current[key]=(current[key]+template[key])/2
            current['source']=template['source']+' + '+side+' observed arm'
        state['knowledge']['arm_template']=current
    snapshot(state,side+' arm reconstruction','The ordered chain resolves endpoint direction; recovered fragments consume prior established pair proportions and visible geodesics',upper,[1,14]+([ARM_IDS[other][0]] if template else []),observation['conflicts'])
    state['conflicts'].extend(observation['conflicts'])


def leg_region(alpha,owners,side,hip_y):
    upper,lower,foot=LEG_IDS[side]
    semantic=np.isin(owners,[upper,lower,foot])
    seeds=pixels(semantic)
    if not len(seeds): return None
    yy,xx=np.indices(alpha.shape)
    # Follow an alpha component below the pelvis; no owner assignment is changed.
    cutoff=max(hip_y+3,float(np.quantile(seeds[:,1],.18)))
    labels,n=ndimage.label(alpha&(yy+.5>=cutoff))
    votes=np.bincount(labels[semantic & (yy+.5>=cutoff)])
    if len(votes)<2: return None
    votes[0]=0;region=labels==votes.argmax()
    # If both legs remain connected, use existing side registration to gate the
    # local search. This is a partition of candidate geometry, not source labels.
    other=LEG_IDS['Right' if side=='Left' else 'Left']
    other_center=center(np.isin(owners,list(other)))
    own_center=center(semantic)
    if other_center is not None and np.any(region & np.isin(owners,list(other))):
        divider=(other_center[0]+own_center[0])/2
        region &= (xx+.5>divider) if own_center[0]>other_center[0] else (xx+.5<divider)
    return region


def leg_stage(state,alpha,owners,side):
    upper,lower,foot=LEG_IDS[side]
    hip_y=state['joints']['Hips']['point'][1]
    region=leg_region(alpha,owners,side,hip_y)
    if region is None or not region.any():
        state['conflicts'].append(side+' leg is occluded/unregistered; no artificial foot owner')
        return
    hip=interface(component(owners==1),component(owners==upper))
    if hip is None:
        p=pixels(component(owners==upper));hip=p[p[:,1]<=np.quantile(p[:,1],.2)].mean(0)
    rows=[]
    for y in np.flatnonzero(region.any(1)):
        xs=np.flatnonzero(region[y])+.5
        rows.append((y+.5,float(np.median(xs)),float(len(xs))))
    rows=np.array(rows)
    end=rows[-1,0]
    # The distal width flare/terminal support identifies FOOT geometry even
    # when every pixel is mislabelled as a shin. No semantic category required.
    candidates=rows[(rows[:,0]>hip[1]+(end-hip[1])*.5)&(rows[:,0]<=end-2.5)]
    if not len(candidates): candidates=rows[rows[:,0]>hip[1]]
    minimum=np.min(candidates[:,2]);narrow=candidates[candidates[:,2]<=minimum+1]
    ankle_y=float(narrow[-1,0])
    if end-ankle_y<2.: ankle_y=float(end-max(3.,(end-hip[1])*.18))
    ankle_row=rows[np.argmin(abs(rows[:,0]-ankle_y))]
    ankle=np.array([ankle_row[1],ankle_y])
    foot_region=region & (np.indices(alpha.shape)[0]+.5>=ankle_y)
    observed_foot=False
    semantic_foot=component(owners==foot)
    foot_contact=interface(component(owners==lower),semantic_foot)
    if foot_contact is not None and foot_contact[1]>hip[1] and semantic_foot.any():
        # A crossed/foreshortened foot can lie across the image's midline.
        # Corroborated semantic contact outranks a vertical side partition.
        ankle=np.array(foot_contact)
        foot_region=semantic_foot & alpha
        observed_foot=True
    fp=pixels(foot_region)
    distance=np.linalg.norm(fp-ankle,axis=1)
    toe_end=fp[distance>=np.quantile(distance,.8)].mean(0)
    toe_base=ankle*.35+toe_end*.65
    raw_knee=interface(component(owners==upper),component(owners==lower))
    expected=hip+(ankle-hip)*.52
    conflicts=[]
    if raw_knee is None or np.linalg.norm(raw_knee-expected)>.24*np.linalg.norm(ankle-hip):
        if raw_knee is not None: conflicts.append(side+' upper/lower boundary is inconsistent with a knee; possible shin pixels labelled upper leg')
        knee=nearest(region,expected)
        status='recovered-silhouette'
    else: knee=raw_knee;status='observed-chain'
    # Each leg supplies its own silhouette/candidates; the paired chain checks
    # anatomical proportions, not image-coordinate mirroring.
    template=state['knowledge'].get('leg_template')
    if template and status=='recovered-silhouette':
        expected=hip+(ankle-hip)*template['upper_fraction']
        knee=nearest(region,expected)
        state['knowledge']['transfers'].append({'to':side+'Shin','from':template['source'],'relation':'hip-knee-ankle fraction','used_silhouette':True})
    establish(state,side+'Leg',hip,3.,[1,upper,'pelvis-frame'])
    establish(state,side+'Shin',knee,3.5,[upper,lower,'alpha','paired-leg-proportions'],status)
    snapshot(state,side+' hip and knee','Pelvis attachment and visible leg corridor reject a distal mislabelled knee',upper,[1],conflicts)
    for name,p in [(side+'Foot',ankle),(side+'ToeBase',toe_base),(side+'ToeEnd',toe_end)]:
        establish(state,name,p,2.5,[lower]+([foot] if observed_foot else [])+['alpha-distal-contour','SOMA-leg-chain'],'observed-chain' if observed_foot else 'recovered-silhouette',
                  'Lower-leg/foot contact corroborated by visible terminal geometry' if observed_foot else 'Terminal silhouette support and distal width flare; owner labels remain unchanged; ankle interval is not a verified art seam')
    state['regions'].append({'name':side+' foot proposal','joint':side+'Foot','status':'hypothesis','source_owner_ids':sorted(np.unique(owners[foot_region]).astype(int).tolist()),
                            'pixels':fp.tolist(),'reason':'Semantic foot contact corroborated by alpha and leg chain' if observed_foot else 'Visible terminal geometry below ankle-width transition, independent of presence of Foot owner','writes_original':False})
    fraction=float(np.linalg.norm(knee-hip)/max(1.,np.linalg.norm(knee-hip)+np.linalg.norm(ankle-knee)))
    state['knowledge']['leg_template']={'source':side+' alpha-supported leg','upper_fraction':fraction}
    state['conflicts'].extend(conflicts)
    snapshot(state,side+' foot recovery','Established hip/knee chain plus terminal alpha support reconstructs missing foot observations',foot,[upper,lower,'alpha'])


def reconstruct(case,model,alpha,owners):
    symmetry=pose_symmetry(alpha,owners==1,case['view'])
    frame=body(alpha,owners,symmetry)
    state={'names':model['joint_names'],'quality':{c['id']:c['score'] if np.any(owners==c['id']) else 0. for c in case['chunks']},'joints':{},'steps':[],
           'knowledge':{'transfers':[],'pose_symmetry':symmetry},'regions':[],'conflicts':[]}
    snapshot(state,'Initial anatomical evidence','No posed skeleton yet. Original owners, silhouette, SOMA semantics and quality are available',0)
    for name,point in frame.items():
        status='occluded-hypothesis' if name in ['Neck1','Neck2','Head'] else 'recovered-silhouette' if name.startswith('Spine') else 'observed-chain'
        establish(state,name,point,5. if status=='occluded-hypothesis' else 3.,[1,14,'central-body-chain'],status)
    snapshot(state,'Central body frame','Head base, visible central torso and pelvis define an ordered axial chain; torso PCA endpoints are not joints',1,[14])
    for owner in range(1,15):
        labels,count=ndimage.label(owners==owner,structure=np.ones((3,3)))
        if count<2:continue
        sizes=np.sort(np.bincount(labels.ravel())[1:])[::-1]
        if len(sizes)>1 and sizes[1]>=6 and sizes[1]/sizes.sum()>.08:
            state['conflicts'].append(f'Owner {owner}: disconnected competing anatomical fragments; use chain-compatible component, retain source labels')
    observations={side:observed_arm(alpha,owners,side,frame) for side in ARM_IDS}
    if not any(o['complete'] for o in observations.values()):
        fragments={'upper':[],'lower':[],'span':[],'sources':[]}
        for side,o in observations.items():
            for kind,a,b,names in [('upper',o['shoulder'],o['elbow'],[side+'Arm',side+'ForeArm']),
                                    ('lower',o['elbow'],o['wrist'],[side+'ForeArm',side+'Hand'])]:
                if a is None or b is None:continue
                fragments[kind].append(float(np.linalg.norm(a-b)))
                fragments['sources'].append(side+' '+kind+' fragment')
                if o['shoulder'] is not None:fragments['span'].append(abs(o['shoulder'][0]-frame['Hips'][0]))
                for name,point in zip(names,[a,b]):establish(state,name,point,3.5,o['ids'],'observed-chain','Partial chain fragment, independently supported by visible mask geometry')
                snapshot(state,side+' '+kind+' fragment','A partial chain contributes local segment geometry even when neither whole arm is recognized',o['ids'][0],o['ids'])
        if fragments['upper'] and fragments['lower']:
            up=float(np.median(fragments['upper']));lo=float(np.median(fragments['lower']))
            state['knowledge']['arm_template']={'source':' + '.join(fragments['sources']),'upper_fraction':up/(up+lo),
                'upper_px':up,'lower_px':lo,'shoulder_span':float(np.median(fragments['span'])) if fragments['span'] else abs(frame['Chest'][1]-frame['Hips'][1])}
    order=sorted(ARM_IDS,key=lambda side:(observations[side]['complete'],sum(state['quality'][i] for i in ARM_IDS[side])),reverse=True)
    def leg_priority(side):
        upper,lower,_=LEG_IDS[side]
        contact=interface(component(owners==upper),component(owners==lower))
        hip=interface(component(owners==1),component(owners==upper))
        region=leg_region(alpha,owners,side,frame['Hips'][1])
        coherent=False
        if contact is not None and hip is not None and region is not None:
            end=pixels(region)[:,1].max()
            fraction=(contact[1]-hip[1])/max(1.,end-hip[1])
            coherent=.25<fraction<.72
        return state['quality'][lower]*(3. if coherent else .5)
    pending=[('arm',side) for side in order]+[('leg',side) for side in LEG_IDS]
    def priority(task):
        kind,side=task
        if kind=='arm':
            support=sum(state['quality'][i] for i in ARM_IDS[side])/3
            return support*(2. if observations[side]['complete'] else .7)+(.25 if state['knowledge'].get('arm_template') else 0.)
        return leg_priority(side)+(.2 if state['knowledge'].get('leg_template') else 0.)
    while pending:
        chosen=max(pending,key=priority)
        state['current_priority']=priority(chosen)
        kind,side=chosen
        if kind=='arm':arm_stage(state,alpha,owners,side,observations[side],'Right' if side=='Left' else 'Left')
        else:leg_stage(state,alpha,owners,side)
        pending.remove(chosen)
    return state
