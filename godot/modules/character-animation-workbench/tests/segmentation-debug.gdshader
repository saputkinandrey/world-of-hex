shader_type canvas_item;

uniform bool flat_chunk_colors = true;
varying flat vec4 chunk_color;

void vertex() {
	chunk_color = COLOR;
}

void fragment() {
	vec4 source = texture(TEXTURE,UV);
	COLOR = vec4(flat_chunk_colors ? chunk_color.rgb : source.rgb,source.a);
}
