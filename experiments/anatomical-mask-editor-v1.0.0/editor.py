"""Pure editing model: two signed override layers, transactions and preview."""
from collections import deque
import numpy as np
from PIL import Image,ImageDraw

NO_OVERRIDE=-1
ERASE_SEED=0


def line_points(start,end):
    x0,y0=start
    x1,y1=end
    dx,dy=abs(x1-x0),-abs(y1-y0)
    sx,sy=1 if x0<x1 else -1,1 if y0<y1 else -1
    error=dx+dy
    while True:
        yield x0,y0
        if x0==x1 and y0==y1:
            return
        doubled=2*error
        if doubled>=dy:
            error+=dy
            x0+=sx
        if doubled<=dx:
            error+=dx
            y0+=sy


class Editor:
    def __init__(self,entry,converge,undo_limit=100):
        self.entry,self.converge,self.undo_limit=entry,converge,undo_limit
        self.seed=np.full(entry.original.shape,NO_OVERRIDE,np.int16)
        self.final=self.seed.copy()
        self.accepted_seed=self.seed.copy()
        self.base=entry.filled.copy()
        self.past,self.future=[],[]
        self.transaction=None

    def snapshot(self):
        return tuple(a.copy() for a in [self.seed,self.final,self.accepted_seed,self.base])

    def restore(self,state):
        self.seed,self.final,self.accepted_seed,self.base=(a.copy() for a in state)

    def begin(self):
        if self.transaction is not None:
            raise RuntimeError('Editing transaction already active')
        self.transaction=self.snapshot()

    def end(self):
        before=self.transaction
        self.transaction=None
        if before is None:
            raise RuntimeError('No editing transaction active')
        if any(not np.array_equal(a,b) for a,b in zip(before,self.snapshot())):
            self.past.append(before)
            self.past=self.past[-self.undo_limit:]
            self.future.clear()

    def undo(self):
        if self.transaction is not None:
            self.end()
        if self.past:
            self.future.append(self.snapshot())
            self.restore(self.past.pop())

    def redo(self):
        if self.transaction is not None:
            self.end()
        if self.future:
            self.past.append(self.snapshot())
            self.restore(self.future.pop())

    @property
    def pending_seeds(self):
        return not np.array_equal(self.seed,self.accepted_seed)

    def seeds(self):
        result=self.entry.original.copy()
        assigned=self.seed!=NO_OVERRIDE
        result[assigned]=self.seed[assigned]
        return result

    def owners(self,base=None):
        result=(self.base if base is None else base).copy()
        assigned=self.final!=NO_OVERRIDE
        result[assigned]=self.final[assigned]
        return result

    def apply(self,selection,value,layer='final'):
        if layer not in {'seed','final'}:
            raise ValueError('Unknown override layer')
        if not isinstance(value,(int,np.integer)) or value<NO_OVERRIDE or value>14 or (layer=='final' and value==0):
            raise ValueError('Final overrides: -1 or 1..14; seed overrides: -1, 0 (erase), or 1..14')
        selection=np.asarray(selection,bool)
        if selection.shape!=self.entry.alpha.shape:
            raise ValueError('Selection geometry mismatch')
        own_transaction=self.transaction is None
        if own_transaction:
            self.begin()
        target=self.seed if layer=='seed' else self.final
        target[selection & self.entry.alpha]=value
        if own_transaction:
            self.end()

    def pencil(self,start,end,value,size,layer='final'):
        if size not in {1,3,5}:
            raise ValueError('Supported native brush sizes: 1,3,5')
        h,w=self.entry.alpha.shape
        selection=np.zeros((h,w),bool)
        radius=size//2
        for x,y in line_points(start,end):
            x0,x1,y0,y1=max(0,x-radius),min(w,x+radius+1),max(0,y-radius),min(h,y+radius+1)
            if x1>x0 and y1>y0:
                selection[y0:y1,x0:x1]=True
        self.apply(selection,value,layer)

    def polygon(self,vertices):
        if len(vertices)<3:
            raise ValueError('A polygon needs at least three vertices')
        h,w=self.entry.alpha.shape
        image=Image.new('1',(w,h))
        ImageDraw.Draw(image).polygon(vertices,fill=1)
        return np.array(image,bool)&self.entry.alpha

    def connected(self,point,limit=None):
        x,y=point
        h,w=self.entry.alpha.shape
        allowed=self.entry.alpha.copy()
        if limit is not None:
            allowed &= limit
        result=np.zeros((h,w),bool)
        if not (0<=x<w and 0<=y<h) or not allowed[y,x]:
            return result
        owners=self.owners()
        owner=owners[y,x]
        queue=deque([(x,y)])
        result[y,x]=True
        while queue:
            x,y=queue.popleft()
            for nx,ny in [(x,y-1),(x+1,y),(x,y+1),(x-1,y)]:
                if 0<=nx<w and 0<=ny<h and allowed[ny,nx] and not result[ny,nx] and owners[ny,nx]==owner:
                    result[ny,nx]=True
                    queue.append((nx,ny))
        return result

    def preview(self):
        base=self.converge(self.seeds(),self.entry.alpha)['owners']
        after=self.owners(base)
        return {'base':base,'before':self.owners(),'after':after,'changed':after!=self.owners()}

    def accept(self,preview):
        self.begin()
        self.base=preview['base'].copy()
        self.accepted_seed=self.seed.copy()
        self.end()

    def discard_pending_seeds(self):
        self.begin()
        self.seed=self.accepted_seed.copy()
        self.end()

    def manual_count(self):
        return int(np.count_nonzero((self.seed!=NO_OVERRIDE)|(self.final!=NO_OVERRIDE)))
