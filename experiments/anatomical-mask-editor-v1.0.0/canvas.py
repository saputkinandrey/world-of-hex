"""Nearest-neighbor viewport rendering and native-coordinate pointer handling."""
import math
import tkinter as tk
import numpy as np
from PIL import Image,ImageTk


class PixelCanvas(tk.Canvas):
    def __init__(self,parent,app):
        super().__init__(parent,bg='#20242a',highlightthickness=0,cursor='crosshair')
        self.app=app
        self.zoom=app.dataset.config['default_zoom']
        self.offset=[0,0]
        self.last=None
        self.pan_origin=None
        self.ready=False
        self.bind('<Configure>',self.resized)
        self.bind('<Motion>',self.motion)
        self.bind('<ButtonPress-1>',self.press)
        self.bind('<B1-Motion>',self.drag_paint)
        self.bind('<ButtonRelease-1>',self.release)
        self.bind('<MouseWheel>',self.wheel)
        for button in [2,3]:
            self.bind(f'<ButtonPress-{button}>',self.pan_start)
            self.bind(f'<B{button}-Motion>',self.pan_move)
            self.bind(f'<ButtonRelease-{button}>',self.pan_end)

    def resized(self,event=None):
        if not self.ready:
            self.center()
        self.draw()

    def center(self):
        if self.app.model is None:
            return
        if self.winfo_width()<=1 or self.winfo_height()<=1:
            self.ready=False
            return
        h,w=self.app.model.entry.alpha.shape
        self.offset=[(self.winfo_width()-w*self.zoom)//2,(self.winfo_height()-h*self.zoom)//2]
        self.ready=True

    def native(self,x,y):
        return math.floor((x-self.offset[0])/self.zoom),math.floor((y-self.offset[1])/self.zoom)

    def set_zoom(self,value,anchor=None):
        anchor=anchor or (self.winfo_width()/2,self.winfo_height()/2)
        old=self.zoom
        self.zoom=int(value)
        self.offset=[anchor[i]-(anchor[i]-self.offset[i])*self.zoom/old for i in range(2)]
        self.app.zoom_var.set(str(self.zoom))
        self.draw()

    def wheel(self,event):
        levels=self.app.dataset.config['zoom_levels']
        index=levels.index(self.zoom)+(1 if event.delta>0 else -1)
        self.set_zoom(levels[max(0,min(len(levels)-1,index))],(event.x,event.y))

    def pan_start(self,event):
        self.pan_origin=(event.x,event.y,*self.offset)

    def pan_move(self,event):
        if self.pan_origin:
            x,y,ox,oy=self.pan_origin
            self.offset=[ox+event.x-x,oy+event.y-y]
            self.draw()

    def pan_end(self,event):
        self.pan_origin=None

    def motion(self,event):
        if self.app.model is None:
            return
        x,y=self.native(event.x,event.y)
        h,w=self.app.model.entry.alpha.shape
        if 0<=x<w and 0<=y<h:
            owner=int(self.app.display_owners()[y,x])
            corrected=int(self.app.model.owners()[y,x])
            self.app.hover.set(f'x={x}, y={y} | view: {self.app.dataset.names[owner]} ({owner}) | corrected: {self.app.dataset.names[corrected]} ({corrected})')

    def press(self,event):
        self.focus_set()
        self.app.safe(self.start_action,event)

    def start_action(self,event):
        if not self.app.editable():
            return
        point=self.native(event.x,event.y)
        x,y=point
        h,w=self.app.model.entry.alpha.shape
        if not (0<=x<w and 0<=y<h):
            return
        tool=self.app.tool.get()
        if tool=='Polygon':
            self.app.vertices.append(point)
            self.draw()
        elif tool=='Eyedropper':
            owner=int(self.app.model.owners()[y,x])
            if owner:
                self.app.choose_category(owner)
        elif tool=='Region fill':
            self.app.region_fill(point)
        else:
            self.app.model.begin()
            self.last=point
            self.app.paint(point,point)
            self.draw()

    def drag_paint(self,event):
        if self.last is not None:
            point=self.native(event.x,event.y)
            self.app.safe(self.app.paint,self.last,point)
            self.last=point
            self.draw()
        self.motion(event)

    def release(self,event):
        if self.last is not None:
            self.app.safe(self.app.model.end)
            self.last=None
            self.app.changed()

    def draw(self):
        self.delete('all')
        if self.app.model is None:
            return
        rgba=self.app.dataset.texture(self.app.view_key,self.app.skin.get())
        h,w=rgba.shape[:2]
        yy,xx=np.indices((h,w))
        checker=np.where(((xx//4+yy//4)%2)[:,:,None],100,130).astype(np.uint8)
        rgb=np.repeat(checker,3,axis=2)
        if self.app.show_texture.get():
            alpha=rgba[:,:,3:4].astype(np.float32)/255
            rgb=(rgba[:,:,:3]*alpha+rgb*(1-alpha)).astype(np.uint8)
        owners=self.app.display_owners()
        if self.app.show_mask.get():
            selected=owners>0
            opacity=self.app.opacity.get()/100
            rgb[selected]=(rgb[selected]*(1-opacity)+self.app.dataset.colors[owners[selected]]*opacity).astype(np.uint8)
        if self.app.highlight is not None:
            selected=self.app.highlight[:,::-1] if self.app.is_mirror else self.app.highlight
            rgb[selected]=((rgb[selected].astype(np.uint16)+np.array([255,235,10],np.uint16))//2).astype(np.uint8)
        # Crop before scaling, keeping high zoom memory proportional to viewport.
        ox,oy=self.offset
        x0=max(0,int(math.floor(-ox/self.zoom)))
        y0=max(0,int(math.floor(-oy/self.zoom)))
        x1=min(w,int(math.ceil((self.winfo_width()-ox)/self.zoom)))
        y1=min(h,int(math.ceil((self.winfo_height()-oy)/self.zoom)))
        if x1>x0 and y1>y0:
            image=Image.fromarray(rgb).crop((x0,y0,x1,y1)).resize(((x1-x0)*self.zoom,(y1-y0)*self.zoom),Image.Resampling.NEAREST)
            self.photo=ImageTk.PhotoImage(image)
            self.create_image(ox+x0*self.zoom,oy+y0*self.zoom,anchor='nw',image=self.photo)
            if self.app.grid.get():
                for x in range(x0,x1+1):
                    self.create_line(ox+x*self.zoom,oy+y0*self.zoom,ox+x*self.zoom,oy+y1*self.zoom,fill='#444444')
                for y in range(y0,y1+1):
                    self.create_line(ox+x0*self.zoom,oy+y*self.zoom,ox+x1*self.zoom,oy+y*self.zoom,fill='#444444')
        if self.app.vertices:
            points=[v for x,y in self.app.vertices for v in (ox+(x+.5)*self.zoom,oy+(y+.5)*self.zoom)]
            if len(points)>=4:
                self.create_line(*points,fill='white',width=2)
            for i in range(0,len(points),2):
                x,y=points[i:i+2]
                self.create_oval(x-3,y-3,x+3,y+3,fill='#ffff40')
