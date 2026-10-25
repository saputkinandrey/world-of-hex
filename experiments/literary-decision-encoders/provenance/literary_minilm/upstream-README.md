---
language:
- en
- ru
- fr
- de
- es
- it
- pt
license: apache-2.0
tags:
- sentence-transformers
- sentence-similarity
- feature-extraction
- literary
- semantic-search
- multilingual
base_model: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
datasets:
- rafaelui/literary-text-pairs
pipeline_tag: sentence-similarity
---

# literary-minilm

A multilingual semantic search model fine-tuned for **literary text** — novels, short stories, and other fiction. Built on top of [`paraphrase-multilingual-MiniLM-L12-v2`](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2), this model is optimized to understand narrative language, character descriptions, plot dynamics, and thematic queries across 7 languages.

Developed for use in [Impulse](https://apps.apple.com/us/app/impulse-writers-studio/id6761264842?l=ru&mt=12) — a macOS writing app for authors.

## Model Details

| Property | Value |
|---|---|
| Base model | paraphrase-multilingual-MiniLM-L12-v2 |
| Architecture | BERT (12 layers, 384 hidden size) |
| Max sequence length | 128 tokens |
| Languages | English, Russian, French, German, Spanish, Italian, Portuguese |
| Training pairs | ~134,000 |
| Output dimension | 384 |
| License | Apache 2.0 |

## Why literary-minilm?

General-purpose multilingual embeddings are trained on a broad mix of content: Wikipedia, Reddit, StackOverflow, scientific papers, and web crawls. This works well for factual retrieval but poorly for fiction — where meaning is conveyed through metaphor, subtext, character voice, and narrative context.

**literary-minilm** is domain-adapted exclusively on fiction. The result is a model that understands queries like:

- *"scene where the hero doubts himself"*
- *"description of a mysterious city at night"*
- *"character who sacrifices everything for love"*

## Training Data

The model was fine-tuned on a custom dataset of ~134,000 literary text pairs across 7 languages, generated from:

- **English**: Project Gutenberg (via `emozilla/pg19`) and `manu/project_gutenberg`
- **Russian**: RusLit corpus (classical Russian prose) and `cointegrated/taiga_stripped_proza`
- **French, German, Spanish, Italian, Portuguese**: OPUS Books (`Helsinki-NLP/opus_books`) and `manu/project_gutenberg`

Each training example consists of:
- `anchor` — a passage of literary text (up to 256 tokens)
- `semantic_phrase` — a short natural-language search query describing the passage (5–10 words)
- `paraphrase` — a rephrasing of the anchor in different words

Training pairs were generated using a combination of YandexGPT, GPT-4.1-nano, and Qwen3 235B, then filtered for quality.

## Usage

### With sentence-transformers

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("rafaelui/literary-minilm")

query = "hero says goodbye to a friend before war"
passages = [
    "He embraced his friend and held on for a long time, knowing he would never see him again.",
    "The sun was bright, birds sang in the garden.",
    "She closed the book and sat thinking about what she had read."
]

query_emb = model.encode(query)
passage_embs = model.encode(passages)

from sentence_transformers.util import cos_sim
scores = cos_sim(query_emb, passage_embs)[0]
for passage, score in zip(passages, scores):
    print(f"{score:.3f}: {passage}")
```

Output:
```
0.621: He embraced his friend and held on for a long time...
-0.082: The sun was bright, birds sang in the garden.
0.275: She closed the book and sat thinking about what she had read.
```

### CoreML (iOS / macOS)

A compiled `.mlpackage` is available for direct use in Apple platform apps. See the [Releases](https://huggingface.co/rafaelui/literary-minilm/tree/main) section.

## Limitations

- Optimized for **fiction only** — performance on factual, technical, or conversational text may be lower than the base model
- Context window is limited to **128 tokens** — longer passages should be chunked
- Asian languages (Chinese, Japanese, Korean) are not included in fine-tuning; the model falls back to base multilingual capabilities for these

## Author

**Alexei Goncharov** — [ImpulseLeap](https://www.impulseleap.com)

Built for [Impulse](https://apps.apple.com/us/app/impulse-writers-studio/id6761264842?l=ru&mt=12), a macOS app for writers.

## License

Apache 2.0