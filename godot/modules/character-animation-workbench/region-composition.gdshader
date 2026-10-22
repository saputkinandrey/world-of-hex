shader_type canvas_item;
#include "res://modules/character-animation-workbench/region-composition.gdshaderinc"

void fragment() {
	COLOR = compose_region(COLOR, UV, TEXTURE_PIXEL_SIZE, SCREEN_UV, SCREEN_PIXEL_SIZE, REGION_SURROUND_ALPHA);
}
