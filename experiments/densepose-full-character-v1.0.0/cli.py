import argparse


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action',choices=['inventory','preflight','run','render','verify','resume-test'])
    action = parser.parse_args().action
    if action=='inventory':
        from inventory import inventory
        inventory()
    elif action in ['preflight','run']:
        from inference import preflight, run
        (preflight if action=='preflight' else run)()
    elif action=='resume-test':
        from review import resume_test
        resume_test()
    else:
        from review import render, verify
        (render if action=='render' else verify)()


if __name__=='__main__': main()
