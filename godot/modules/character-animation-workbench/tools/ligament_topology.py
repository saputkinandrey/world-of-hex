"""Source-space attachments. Inputs are masks and the allowed chunk adjacency only."""


def interfaces(owners, rigidity, width, height, joined):
    result = []
    for y in range(height):
        for x in range(width):
            first = y*width+x
            if not rigidity[first]:
                continue
            for dx,dy in [(1,0),(0,1)]:
                nx,ny = x+dx,y+dy
                if nx >= width or ny >= height:
                    continue
                second = ny*width+nx
                a,b = owners[first],owners[second]
                if not rigidity[second] or a == b or not joined(a,b):
                    continue
                corners = [(x,y),(nx+1,y),(nx+1,ny+1),(x,ny+1)]
                anchors = [a,b,b,a] if dx else [a,a,b,b]
                result.append((corners,anchors))
    # Close junctions where three or more chunks meet. No link to an unrelated
    # touching part: the occupied quadrants must form a connected source graph.
    for y in range(1,height):
        for x in range(1,width):
            cells = [(y-1)*width+x-1,(y-1)*width+x,y*width+x,y*width+x-1]
            anchors = [owners[cell] for cell in cells]
            if len(set(anchors)) < 3 or not all(rigidity[cell] for cell in cells):
                continue
            reached = {0}
            for _ in range(3):
                reached.update(index for index in range(4) if any(
                    neighbor in reached and joined(anchors[index],anchors[neighbor])
                    for neighbor in [(index-1)%4,(index+1)%4]))
            if len(reached) == 4:
                result.append(([(x-.5,y-.5),(x+.5,y-.5),(x+.5,y+.5),(x-.5,y+.5)],anchors))
    return result
