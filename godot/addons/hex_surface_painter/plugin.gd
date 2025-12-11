@tool
extends EditorPlugin

const PANEL_SCENE := preload("res://addons/hex_surface_painter/ui/panel.tscn")

var panel: Control

func _enter_tree():
    panel = PANEL_SCENE.instantiate()
    panel.setup(self)
    add_control_to_dock(DOCK_SLOT_RIGHT_UL, panel)
    panel.owner = null

func _exit_tree():
    if panel:
        remove_control_from_docks(panel)
        panel.free()
        panel = null

func forward_canvas_gui_input(event:InputEvent) -> bool:
    if panel:
        return panel.handle_canvas_input(event)
    return false
