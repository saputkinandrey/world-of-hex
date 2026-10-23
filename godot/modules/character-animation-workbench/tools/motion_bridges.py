"""Historical command alias: compile ligaments from source masks, never audits."""
from deformation_masks import bake


def build():
    bake()


if __name__ == '__main__':
    build()
