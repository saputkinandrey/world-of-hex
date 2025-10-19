extends TileMapLayer

const main_layer = 0
const main_atlas_id = 0
var rng: RandomNumberGenerator = RandomNumberGenerator.new()


func centerMap() -> void:
    var screenSize: Vector2i = DisplayServer.screen_get_size()
    print('half screen size ', screenSize * 0.5)
    self.position = screenSize * 0.5
    pass
	
func set_circle_tiles(center_tile_coords: Vector2i, circle_radius: int):
    # Determine the bounding box for the circle to reduce iterations
    var radius_vec: Vector2i = Vector2i(circle_radius, circle_radius)
    var min_pos: Vector2i = center_tile_coords - radius_vec
    var max_pos: Vector2i = center_tile_coords + radius_vec
    var center_point: Vector2 = center_tile_coords.to_vector2()
    var tile_source_id: int = 1 # ID of the TileSet source (e.g., 0 for the first atlas)

    for x in range(int(min_pos.x), int(max_pos.x)):
        for y in range(int(min_pos.y), int(max_pos.y)):
            var tile_coords: Vector2 = Vector2(x, y)
            var tile_atlas_coords: Vector2i = Vector2i(rng.randi_range(0, 2), 0) # Coordinates of the tile in your TileSet's atlas

            # Check if the tile is within the circle's radius
            if tile_coords.distance_to(center_point) <= circle_radius:
                # Set the tile in the TileMap
                set_cell(Vector2i(x, y), tile_source_id, tile_atlas_coords, 0) # Last argument is alternative tile index (0 for default)
	
func setRect(size: int) -> void:
    # Example: Set a 5x5 rectangle of tiles starting at (0,0)
    var start_x: int = -size
    var start_y: int = -size
    var width: int = size * 2 + 1
    var height: int = size * 2 + 1
    var tile_source_id: int = 1 # ID of the TileSet source (e.g., 0 for the first atlas)
    for x in range(start_x, start_x + width):
        for y in range(start_y, start_y + height):
            var tile_atlas_coords: Vector2i = Vector2i(rng.randi_range(0, 2), 0) # Coordinates of the tile in your TileSet's atlas
            set_cell(Vector2i(x, y), tile_source_id, tile_atlas_coords, 0) # Last argument is alternative tile index (0 for default)
    pass

func _ready() -> void:
    centerMap()
    #self.set_cell(Vector2i(-1,-1),)
    # FILL IT WITH RANDOM TILE FOR rect DOUBLE RADIUS OF ENCOUNTER
    pass

#func _input(event: InputEvent) -> void:
	#if event is InputEventMouseButton:
		#if event.button_index == MOUSE_BUTTON_LEFT and event.is_pressed():
			#var global_clicked = event.position
			#var pos_clicked = local_to_map(to_local(global_clicked))
			#print("POS CLICKED", pos_clicked)
			#var current_atlas_coords = get_cell_atlas_coords(pos_clicked)
			#print("ATLAS COORDSX", current_atlas_coords)
			#var current_tile_alt = get_cell_alternative_tile(pos_clicked)
			#var number_of_alts_for_tile = tile_set.get_source(main_atlas_id)\
				#.get_alternative_tiles_count(current_atlas_coords)
			#set_cell(
				#pos_clicked, 
				#main_atlas_id, 
				#current_atlas_coords,
				#(current_tile_alt+1)%number_of_alts_for_tile
			#)
	#pass
