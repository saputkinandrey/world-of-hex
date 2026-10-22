uniform bool compositor_enabled = false;
uniform bool safe_compression = true;
uniform sampler2D region_map : filter_nearest, repeat_disable;
uniform vec2 region_frame_size;
uniform vec2 region_atlas_origin;
uniform vec2 region_flip;
uniform float region_rest_area = 1.0;
uniform float region_orientation = 1.0;
uniform float compression_floor = 0.12;
uniform float skin_stretch_limit = 8.0;
uniform int region_debug = 0;

#define REGION_SURROUND_ALPHA min(min(texture(TEXTURE, UV + vec2(TEXTURE_PIXEL_SIZE.x, 0)).a, texture(TEXTURE, UV - vec2(TEXTURE_PIXEL_SIZE.x, 0)).a), min(texture(TEXTURE, UV + vec2(0, TEXTURE_PIXEL_SIZE.y)).a, texture(TEXTURE, UV - vec2(0, TEXTURE_PIXEL_SIZE.y)).a))

vec4 compose_region(vec4 source, vec2 uv, vec2 texel, vec2 screen_uv, vec2 screen_texel, float surround) {
	if (!compositor_enabled) { return source; }
	vec2 pixel = uv / texel;
	vec2 local = pixel - region_atlas_origin;
	local = mix(local, region_frame_size - local, region_flip);
	vec3 region = floor(texture(region_map, local / region_frame_size).rgb * 255.0 + 0.5);
	float kind = region.r;
	// Skin uses the actual module alpha, even if the shared mask union is wider.
	if (kind == 1.0) {
		if (surround < 0.001 || local.x < 1.0 || local.y < 1.0 || local.x > region_frame_size.x - 1.0 || local.y > region_frame_size.y - 1.0) { kind = 3.0; }
	}
	vec2 dx = dFdx(pixel);
	vec2 dy = dFdy(pixel);
	vec2 sx = dFdx(screen_uv / screen_texel);
	vec2 sy = dFdy(screen_uv / screen_texel);
	float determinant = dx.x * dy.y - dx.y * dy.x;
	float screen_det = sx.x * sy.y - sx.y * sy.x;
	float area = abs(screen_det) / max(abs(determinant) * region_rest_area, 0.000001);
	bool inverted = determinant * screen_det * region_orientation < 0.0;
	bool unsafe_ligament = kind == 2.0 && (inverted || area < compression_floor);
	if (safe_compression && unsafe_ligament) { return vec4(0.0); }
	float trace = dot(dx, dx) + dot(dy, dy);
	float minimum = 0.5 * (trace - sqrt(max(trace * trace - 4.0 * determinant * determinant, 0.0)));
	float stretch = 1.0 / sqrt(max(minimum * region_rest_area, 0.000001));
	if (region_debug >= 1 && region_debug <= 3) {
		if (int(kind) != region_debug) { return vec4(0.0); }
		source.rgb = kind == 1.0 ? vec3(0.85, 0.32, 0.32) : (kind == 2.0 ? vec3(0.24, 0.75, 0.4) : vec3(0.25, 0.53, 0.94));
	} else if (region_debug == 4) {
		source.rgb = 0.5 + 0.5 * cos(vec3(0.0, 2.1, 4.2) + region.g * 2.4);
	} else if (region_debug == 5) {
		source.rgb = mix(vec3(0.1, 0.2, 0.6), vec3(1.0, 0.7, 0.1), region.b / 23.0);
	} else if (region_debug == 6) {
		vec2 grid = abs(fract(local) - 0.5);
		float diagonal = abs(fract(local.x - local.y + 0.5) - 0.5);
		source.rgb = max(grid.x, grid.y) > 0.43 || diagonal < 0.06 ? vec3(0.1, 0.9, 0.8) : source.rgb * 0.45;
	} else if (region_debug == 7) {
		source.rgb = unsafe_ligament ? vec3(1,0,0) : (kind == 3.0 && stretch > skin_stretch_limit ? vec3(1,0,1) : vec3(0.1,0.5,0.25));
	} else if (region_debug == 8) {
		source.rgb = kind == 1.0 ? vec3(0.85,0.32,0.32) : (kind == 2.0 ? vec3(0.24,0.75,0.4) : vec3(0.25,0.53,0.94));
	}
	return source;
}
