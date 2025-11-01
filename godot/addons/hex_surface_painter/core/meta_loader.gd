@tool
class_name MetaLoader

const META_FILE := "tileset_meta.json"

func load_meta(dir:String) -> Dictionary:
    var normalized_dir := dir
    if normalized_dir == "":
        return {}
    if !normalized_dir.ends_with("/"):
        normalized_dir += "/"
    var path := normalized_dir + META_FILE
    if !FileAccess.file_exists(path):
        return {}
    var file := FileAccess.open(path, FileAccess.READ)
    if file == null:
        push_error("Failed to open %s" % path)
        return {}
    var text := file.get_as_text()
    file.close()
    var json := JSON.new()
    var parse_result := json.parse(text)
    if parse_result != OK:
        push_error("Failed to parse %s: %s" % [path, json.get_error_message()])
        return {}
    var data := json.get_data()
    if typeof(data) != TYPE_DICTIONARY:
        push_error("tileset_meta.json must contain a dictionary")
        return {}
    if !data.has("config"):
        data["config"] = {}
    if !data.has("tiles"):
        data["tiles"] = []
    return data
