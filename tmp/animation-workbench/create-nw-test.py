from pathlib import Path

root = Path(__file__).resolve().parents[2] / 'godot/modules/character-animation-workbench/tests'
source = (root / 'south-west-acceptance.gd').read_text(encoding='utf-8')
source = source.replace('SouthWest', 'NorthWest').replace('south-west', 'north-west')
source = source.replace('SW', 'NW').replace('south', 'north').replace('South', 'North')
source = source.replace('Vector2(-.8, .65)', 'Vector2(-.8, -.65)')
source = source.replace('source_direction == 2', 'source_direction == 3').replace('authored_direction == 2', 'authored_direction == 3')
source = source.replace('workbench.position.x == 1024', 'workbench.position.x == 1536')
source = source.replace('occupies the third column', 'occupies the fourth column')
source = source.replace('(0.0 if side == "L" else .5)', '(.5 if side == "L" else 0.0)')
(root / 'north-west-acceptance.gd').write_text(source, encoding='utf-8')
