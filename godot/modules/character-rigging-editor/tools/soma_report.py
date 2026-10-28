"""Current report entrypoint; historical evidence stays in soma/anatomy/before."""
import sys
sys.dont_write_bytecode=True
from soma_anatomy_report import report


if __name__=='__main__':
    report()
