"""Local file CLI; no network service or training operations."""
import argparse
from pathlib import Path

from common import ROOT, read


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='action', required=True)
    parse = sub.add_parser('parse')
    parse.add_argument('--input', required=True)
    parse.add_argument('--output', required=True, help='New document JSON path')
    parse.add_argument('--language', choices=['en','ru'], required=True)
    parse.add_argument('--authored-fixture', action='store_true')
    analyze = sub.add_parser('analyze')
    analyze.add_argument('--input', required=True, help='Parsed document.json')
    analyze.add_argument('--output', required=True)
    analyze.add_argument('--model', choices=['fable','qwen'], required=True)
    analyze.add_argument('--language', choices=['en','ru'], required=True)
    analyze.add_argument('--start', type=int, default=0)
    analyze.add_argument('--end', type=int, default=-1)
    analyze.add_argument('--context-tokens', type=int, default=3072)
    for action in ['review-export','review-import']:
        command = sub.add_parser(action)
        command.add_argument('--input', required=True, help='Run directory')
        command.add_argument('--output' if action == 'review-export' else '--review', required=True)
    report = sub.add_parser('report')
    report.add_argument('--input', required=True, help='Directory containing separate model/language runs')
    report.add_argument('--output', required=True)
    args = parser.parse_args()
    if args.action == 'parse':
        from parsing import parse_document
        document = parse_document(args.input, args.language, args.output,
                                  'authored_fixture' if args.authored_fixture else 'local_book')
        from positions import export_positions
        export_positions(document, Path(args.output).with_suffix('.positions.json'))
        print(f'Parsed {len(document["paragraphs"])} author paragraphs')
    elif args.action == 'analyze':
        from analysis import analyze as run
        config = read(ROOT/'config.json')
        if args.context_tokens < 1:
            parser.error('context-tokens must be positive')
        config['context_tokens'] = args.context_tokens
        if read(args.input)['language'] != args.language:
            parser.error('Language differs from parsed document')
        run(args.input, args.output, args.model, config, args.start, args.end)
    elif args.action == 'review-export':
        from review import export_review
        export_review(args.input, args.output)
    elif args.action == 'review-import':
        from review import import_review
        import_review(args.input, args.review)
    else:
        from reporting import report
        report(args.input, args.output)


if __name__ == '__main__':
    main()
