"""Standalone Tkinter anatomical owner editor. No models, server or Godot."""
import argparse
import sys
sys.dont_write_bytecode=True
import tkinter as tk
from tkinter import ttk,messagebox
import traceback
import numpy as np
from PIL import Image,ImageTk

from dataset import ROOT,VERSION,Dataset
from corrections import Store,STATUSES
from canvas import PixelCanvas
from exporter import export_all


class App:
    def __init__(self,root,workspace=None):
        self.root=root
        self.dataset=Dataset()
        self.store=Store(self.dataset,workspace)
        self.model=None
        self.view_key=None
        self.saved_state=None
        self.sessions={}
        self.discard_on_leave=False
        self.vertices=[]
        self.highlight=None
        root.title('Anatomical Mask Editor v'+VERSION+(' [TEST workspace]' if workspace else ''))
        root.geometry('1320x900')
        root.minsize(1100,780)
        root.protocol('WM_DELETE_WINDOW',self.close)
        self.tool=tk.StringVar(value='Pencil')
        self.layer=tk.StringVar(value='final')
        self.view=tk.StringVar(value='Corrected')
        self.skin=tk.IntVar(value=0)
        self.size=tk.IntVar(value=1)
        self.category=1
        self.opacity=tk.IntVar(value=55)
        self.grid=tk.BooleanVar(value=False)
        self.show_mask=tk.BooleanVar(value=True)
        self.show_texture=tk.BooleanVar(value=True)
        self.limit_fill=tk.BooleanVar(value=False)
        self.zoom_var=tk.StringVar(value=str(self.dataset.config['default_zoom']))
        self.review_status=tk.StringVar()
        self.comment=tk.StringVar()
        self.hover=tk.StringVar(value='Native coordinates | right/middle drag: pan | wheel: zoom')
        self.notice=tk.StringVar()
        self.build()
        root.bind('<Control-KeyPress>',self.shortcut)
        root.bind('<Escape>',lambda e:self.clear_polygon())
        self.select(self.dataset.keys[0])

    def build(self):
        toolbar=ttk.Frame(self.root,padding=5)
        toolbar.pack(fill='x')
        ttk.Button(toolbar,text='Save edits  Ctrl+S',command=lambda:self.safe(self.save)).pack(side='left')
        ttk.Button(toolbar,text='Undo  Ctrl+Z',command=lambda:self.history(False)).pack(side='left')
        ttk.Button(toolbar,text='Redo  Ctrl+Y',command=lambda:self.history(True)).pack(side='left')
        ttk.Button(toolbar,text='Next unreviewed',command=self.next_case).pack(side='left',padx=12)
        ttk.Button(toolbar,text='Export Corrected Masks',command=lambda:self.safe(self.export)).pack(side='right')
        body=ttk.Frame(self.root)
        body.pack(fill='both',expand=True)
        left=ttk.Frame(body,width=275,padding=5)
        left.pack(side='left',fill='y')
        ttk.Label(left,text='32 independent maps / 16 mirrored views').pack(anchor='w')
        treeframe=ttk.Frame(left)
        treeframe.pack(fill='both',expand=True)
        self.tree=ttk.Treeview(treeframe,columns=('status',),show='tree headings',selectmode='browse')
        self.tree.heading('#0',text='Pose / direction')
        self.tree.heading('status',text='Review status')
        self.tree.column('#0',width=130,minwidth=110)
        self.tree.column('status',width=108,minwidth=95)
        scrollbar=ttk.Scrollbar(treeframe,orient='vertical',command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.pack(side='left',fill='both',expand=True)
        scrollbar.pack(side='right',fill='y')
        for key,atlas in self.dataset.atlases.items():
            pose,direction=key.split('/')
            if not self.tree.exists(pose):
                self.tree.insert('', 'end',iid=pose,text=pose.replace('-',' ').title(),open=True)
            self.tree.insert(pose,'end',iid=key,text=direction+(' [M]' if atlas['mirrored'] else ''))
        self.update_catalog()
        self.tree.bind('<<TreeviewSelect>>',self.tree_selected)
        right=ttk.Frame(body,width=245,padding=7)
        right.pack(side='right',fill='y')
        ttk.Label(right,text='Anatomical category (14 groups)').pack(anchor='w')
        self.categories=tk.Listbox(right,height=14,exportselection=False,width=26)
        for group in range(1,15):
            self.categories.insert('end',f'{group}: {self.dataset.names[group]}')
            color='#'+''.join(f'{int(x):02x}' for x in self.dataset.colors[group])
            self.categories.itemconfig(group-1,bg=color,fg='black')
        self.categories.selection_set(0)
        self.categories.pack(fill='x')
        self.categories.bind('<<ListboxSelect>>',lambda e:self.choose_category(self.categories.curselection()[0]+1) if self.categories.curselection() else None)
        ttk.Label(right,text='Editing layer').pack(anchor='w',pady=(8,0))
        for title,value in [('Final overrides (direct)','final'),('Seed overrides (needs preview)','seed')]:
            ttk.Radiobutton(right,text=title,variable=self.layer,value=value,command=self.layer_changed).pack(anchor='w')
        tools=ttk.Frame(right)
        tools.pack(fill='x',pady=4)
        for i,title in enumerate(['Pencil','Eyedropper','Region fill','Polygon','Erase seeds']):
            ttk.Radiobutton(tools,text=title,variable=self.tool,value=title).grid(row=i//2,column=i%2,sticky='w')
        brush=ttk.Frame(right)
        brush.pack(fill='x')
        ttk.Label(brush,text='Brush:').pack(side='left')
        ttk.Combobox(brush,textvariable=self.size,values=[1,3,5],state='readonly',width=4).pack(side='left')
        ttk.Label(brush,text='native px').pack(side='left')
        for title,command in [('Assign polygon',self.assign_polygon),('Erase seeds in polygon',self.erase_polygon),
                              ('Reset overrides in polygon',self.reset_polygon),('Clear polygon (Esc)',self.clear_polygon)]:
            ttk.Button(right,text=title,command=lambda c=command:self.safe(c)).pack(fill='x',pady=1)
        ttk.Checkbutton(right,text='Polygon limits region fill',variable=self.limit_fill).pack(anchor='w')
        ttk.Button(right,text='Preview Flood Fill...',command=lambda:self.safe(self.preview)).pack(fill='x',pady=(7,2))
        ttk.Button(right,text='Discard pending seed changes',command=lambda:self.safe(self.discard_seeds)).pack(fill='x')
        ttk.Label(right,text='Review status / operator comment').pack(anchor='w',pady=(8,0))
        ttk.Combobox(right,textvariable=self.review_status,values=STATUSES,state='readonly',width=25).pack(fill='x')
        ttk.Entry(right,textvariable=self.comment).pack(fill='x',pady=3)
        center=ttk.Frame(body)
        center.pack(side='left',fill='both',expand=True)
        options=ttk.Frame(center,padding=4)
        options.pack(fill='x')
        for title,var in [('Texture',self.show_texture),('Mask',self.show_mask),('Grid',self.grid)]:
            ttk.Checkbutton(options,text=title,variable=var,command=lambda:self.canvas.draw()).pack(side='left')
        ttk.Label(options,text='Skin').pack(side='left',padx=(10,2))
        skins=ttk.Combobox(options,textvariable=self.skin,values=list(range(5)),state='readonly',width=3)
        skins.pack(side='left')
        skins.bind('<<ComboboxSelected>>',lambda e:self.canvas.draw())
        ttk.Label(options,text='Zoom').pack(side='left',padx=(10,2))
        zoom=ttk.Combobox(options,textvariable=self.zoom_var,values=self.dataset.config['zoom_levels'],state='readonly',width=4)
        zoom.pack(side='left')
        zoom.bind('<<ComboboxSelected>>',lambda e:self.canvas.set_zoom(int(self.zoom_var.get())))
        ttk.Button(options,text='Center',command=lambda:(self.canvas.center(),self.canvas.draw())).pack(side='left',padx=5)
        viewbar=ttk.Frame(center,padding=4)
        viewbar.pack(fill='x')
        for title in ['Corrected','Original DensePose','Seeds']:
            ttk.Radiobutton(viewbar,text=title,variable=self.view,value=title,command=lambda:self.canvas.draw()).pack(side='left')
        ttk.Label(viewbar,text='Opacity').pack(side='left',padx=(10,2))
        ttk.Scale(viewbar,from_=0,to=100,variable=self.opacity,command=lambda value:self.canvas.draw()).pack(side='left',fill='x',expand=True)
        self.canvas=PixelCanvas(center,self)
        self.canvas.pack(fill='both',expand=True)
        ttk.Label(self.root,textvariable=self.notice,anchor='w').pack(fill='x',padx=6)
        ttk.Label(self.root,textvariable=self.hover,anchor='w').pack(fill='x',padx=6,pady=4)

    @property
    def is_mirror(self):
        return self.view_key is not None and self.dataset.atlases[self.view_key]['mirrored']

    def shortcut(self,event):
        # Windows virtual-key codes stay Z/Y/S under Latin and Cyrillic layouts.
        key={90:'z',89:'y',83:'s'}.get(event.keycode,event.keysym.lower())
        if key=='z':
            return self.history(False)
        if key=='y':
            return self.history(True)
        if key=='s':
            self.safe(self.save)
            return 'break'

    def safe(self,action,*args):
        try:
            return action(*args)
        except Exception as error:
            path=self.store.workspace/'errors.log'
            with path.open('a',encoding='utf-8') as stream:
                stream.write(traceback.format_exc()+'\n')
            messagebox.showerror('Editor error',f'{type(error).__name__}: {error}\n\nDetails: {path}',parent=self.root)

    def dirty(self):
        if self.model is None or self.saved_state is None:
            return False
        record=self.store.records[self.model.entry.key]
        return (any(not np.array_equal(a,b) for a,b in zip(self.model.snapshot(),self.saved_state))
                or self.review_status.get()!=record['status'] or self.comment.get()!=record['comment'])

    def leave_current(self):
        self.discard_on_leave=False
        if not self.dirty():
            return True
        choice=messagebox.askyesnocancel('Unsaved changes','Save the current case before leaving?',parent=self.root)
        if choice is None:
            return False
        if choice:
            self.save()
        else:
            self.discard_on_leave=True
        return True

    def remember_current(self):
        if self.model is not None:
            key=self.model.entry.key
            if self.discard_on_leave:
                self.sessions.pop(key,None)
            else:
                self.sessions[key]={'model':self.model,'saved_state':self.saved_state}

    def open_model(self,key):
        canonical=self.dataset.canonical(key)
        if canonical in self.sessions:
            state=self.sessions[canonical]
            self.dataset.assert_current(state['model'].entry)
            self.model,self.saved_state=state['model'],state['saved_state']
        else:
            self.model=self.store.load(canonical)
            self.saved_state=self.model.snapshot()

    def select(self,key):
        if self.view_key is not None and self.dataset.canonical(key)==self.model.entry.key:
            self.view_key=key
        else:
            if not self.leave_current():
                return
            self.remember_current()
            self.open_model(key)
            self.view_key=key
            self.review_status.set(self.store.records[self.model.entry.key]['status'])
            self.comment.set(self.store.records[self.model.entry.key]['comment'])
        self.vertices=[]
        self.highlight=None
        self.canvas.ready=False
        self.canvas.center()
        self.tree.selection_set(key)
        self.tree.see(key)
        self.changed()

    def tree_selected(self,event):
        selected=self.tree.selection()
        if selected and selected[0] in self.dataset.atlases and selected[0]!=self.view_key:
            previous=self.view_key
            self.safe(self.select,selected[0])
            if self.view_key==previous and previous:
                self.tree.selection_set(previous)

    def update_catalog(self):
        if not hasattr(self,'tree'):
            return
        for key in self.dataset.atlases:
            record=self.store.records[self.dataset.canonical(key)]
            self.tree.set(key,'status',record['status'])

    def editable(self):
        if self.is_mirror:
            source=self.dataset.canonical(self.view_key)
            if messagebox.askyesno('Mirrored view','This view is read only. Switch to '+source+' to edit?',parent=self.root):
                self.select(source)
            return False
        if self.model is not None and self.view.get()=='Original DensePose':
            self.layer_changed()
        return self.model is not None

    def choose_category(self,owner):
        self.category=owner
        self.categories.selection_clear(0,'end')
        self.categories.selection_set(owner-1)

    def display_owners(self):
        array=self.model.entry.original if self.view.get()=='Original DensePose' else self.model.seeds() if self.view.get()=='Seeds' else self.model.owners()
        return array[:,::-1] if self.is_mirror else array

    def paint(self,start,end):
        erasing=self.tool.get()=='Erase seeds'
        layer='seed' if erasing else self.layer.get()
        self.model.pencil(start,end,0 if erasing else self.category,self.size.get(),layer)
        if layer=='seed':
            self.view.set('Seeds')

    def layer_changed(self):
        self.view.set('Seeds' if self.layer.get()=='seed' else 'Corrected')
        self.canvas.draw()

    def changed(self):
        if self.model:
            self.notice.set(f'{self.view_key} | manual pixels: {self.model.manual_count()} | '+
                            ('SEED CHANGES PENDING - Preview/Accept or Discard' if self.model.pending_seeds else 'Ready')+
                            (' | MIRRORED VIEW (edit source)' if self.is_mirror else ''))
            self.canvas.draw()

    def region_fill(self,point):
        if self.limit_fill.get() and len(self.vertices)<3:
            raise ValueError('Finish a polygon with at least three vertices before enabling the fill limiter')
        limit=self.model.polygon(self.vertices) if self.limit_fill.get() else None
        selection=self.model.connected(point,limit)
        count=int(selection.sum())
        if not count:
            return
        previous_view=self.view.get()
        applied=False
        self.view.set('Corrected')
        self.highlight=selection
        self.canvas.draw()
        self.root.update_idletasks()
        warning='LARGE REGION. ' if count>=self.dataset.config['large_region_pixels'] else ''
        try:
            if messagebox.askyesno('Confirm region fill',f'{warning}{count} pixels will become {self.dataset.names[self.category]} in {self.layer.get()} overrides. Apply?',parent=self.root):
                self.model.apply(selection,self.category,self.layer.get())
                self.view.set('Seeds' if self.layer.get()=='seed' else 'Corrected')
                applied=True
        finally:
            self.highlight=None
            if not applied:
                self.view.set(previous_view)
        self.changed()

    def polygon_selection(self):
        if not self.editable():
            return None
        return self.model.polygon(self.vertices)

    def assign_polygon(self):
        selection=self.polygon_selection()
        if selection is not None:
            self.model.apply(selection,self.category,self.layer.get())
            self.changed()

    def erase_polygon(self):
        selection=self.polygon_selection()
        if selection is not None:
            self.model.apply(selection,0,'seed')
            self.view.set('Seeds')
            self.changed()

    def reset_polygon(self):
        selection=self.polygon_selection()
        if selection is not None:
            self.model.apply(selection,-1,self.layer.get())
            self.changed()

    def clear_polygon(self):
        self.vertices=[]
        if hasattr(self,'canvas'):
            self.canvas.draw()

    def history(self,redo):
        if self.model is not None and self.editable():
            self.canvas.last=None
            self.model.redo() if redo else self.model.undo()
            self.changed()
        return 'break'

    def preview(self):
        if not self.editable():
            return
        self.dataset.assert_current(self.model.entry)
        preview=self.model.preview()
        popup=tk.Toplevel(self.root)
        popup.title('Flood Fill preview - original seeds + seed edits + final overrides')
        popup.transient(self.root)
        popup.grab_set()
        ttk.Label(popup,text=f'Changed pixels: {int(preview["changed"].sum())}. Final overrides remain applied.').pack(pady=8)
        frame=ttk.Frame(popup)
        frame.pack(padx=8,pady=8)
        self.preview_photos=[]
        for i,(title,array) in enumerate([('Before',self.dataset.colors[preview['before']]),('After',self.dataset.colors[preview['after']]),
                    ('Changes',np.where(preview['changed'][:,:,None],[20,235,235],[35,37,42]).astype(np.uint8))]):
            ttk.Label(frame,text=title).grid(row=0,column=i)
            image=Image.fromarray(array).resize((array.shape[1]*2,array.shape[0]*2),Image.Resampling.NEAREST)
            photo=ImageTk.PhotoImage(image)
            self.preview_photos.append(photo)
            ttk.Label(frame,image=photo).grid(row=1,column=i,padx=4)
        buttons=ttk.Frame(popup)
        buttons.pack(pady=8)
        def accept():
            self.model.accept(preview)
            self.view.set('Corrected')
            popup.destroy()
            self.changed()
        ttk.Button(buttons,text='Accept recompute',command=accept).pack(side='left',padx=10)
        ttk.Button(buttons,text='Cancel preview',command=popup.destroy).pack(side='left',padx=10)

    def discard_seeds(self):
        if self.editable():
            self.model.discard_pending_seeds()
            self.changed()

    def save(self):
        status=self.review_status.get()
        if self.model.manual_count() and status in {'Not reviewed','Needs review'}:
            status='Corrected'
            self.review_status.set(status)
        self.store.save(self.model,status,self.comment.get())
        self.saved_state=self.model.snapshot()
        self.update_catalog()
        self.notice.set('Saved '+self.model.entry.key)

    def next_case(self):
        key=self.store.next_unreviewed(self.view_key)
        if key:
            self.safe(self.select,key)
        else:
            messagebox.showinfo('Review catalog','All independent cases are Corrected or Accepted.',parent=self.root)

    def export(self):
        self.root.config(cursor='watch')
        self.root.update_idletasks()
        try:
            output=export_all(self.dataset,self.store,{self.model.entry.key:self.model})
        finally:
            self.root.config(cursor='')
        from dataset import read
        missing=read(output/'metadata.json')['unknown_pixels']
        messagebox.showinfo('Export complete',f'240 frames exported. Unknown pixels: {missing}\n{output}\n\nSave edits separately to preserve unsaved working corrections.',parent=self.root)

    def close(self):
        if self.safe(self.leave_current):
            self.root.destroy()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace',help='Separate test workspace inside this editor directory')
    args=parser.parse_args()
    root=tk.Tk()
    App(root,args.workspace)
    root.mainloop()


if __name__=='__main__':
    main()
