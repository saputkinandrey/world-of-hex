shader_type canvas_item;
#include "res://modules/character-animation-workbench/region-composition.gdshaderinc"

uniform bool occlusion_enabled = false;
uniform sampler2D garment_mask : filter_linear, repeat_disable;
uniform vec2 body_atlas_origin;
uniform vec2 garment_atlas_origin;
uniform vec2 garment_texture_size;
uniform vec2 garment_offset;

void fragment() {
	COLOR = compose_region(COLOR, UV, TEXTURE_PIXEL_SIZE, SCREEN_UV, SCREEN_PIXEL_SIZE, REGION_SURROUND_ALPHA);
	if (occlusion_enabled) {
		vec2 body_pixel = UV / TEXTURE_PIXEL_SIZE - body_atlas_origin;
		vec2 garment_pixel = body_pixel - garment_offset + garment_atlas_origin;
		float coverage = 0.0;
		// Cover the antialiased garment fringe as well as its opaque interior.
		for (int y = -1; y <= 1; y++) {
			for (int x = -1; x <= 1; x++) {
				vec2 sample_pixel = garment_pixel + vec2(float(x), float(y)) * 1.5;
				coverage = max(coverage, texture(garment_mask, sample_pixel / garment_texture_size).a);
			}
		}
		COLOR.a *= 1.0 - step(0.001, coverage);
	}
}
