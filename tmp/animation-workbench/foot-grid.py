from PIL import Image
p=Image.open('tmp/animation-workbench/comparison-ligaments/sequence/frame-0084.png').convert('RGB')
bg=p.getpixel((0,0))
print('x1740..1784 columns step1')
for y in range(390,432):
 print(y,''.join('.' if max(abs(a-b) for a,b in zip(p.getpixel((x,y)),bg))<=2 else '#' for x in range(1740,1785)))
