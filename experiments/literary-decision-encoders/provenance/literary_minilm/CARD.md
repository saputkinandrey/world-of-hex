# Literary MiniLM

- HF ID: `RafaelUI/literary-minilm`.
- Revision: `92a6516f32321dc4048b49c9e6eb2b9aaa7e8e8f`.
- Architecture: published misplaced config specifies BERT, 12 layers, hidden 384,
  vocabulary 250037. Downloaded tensor audit: 117653760 parameters;
  this does not establish successful encoder loading.
- Context: card specifies 128; architectural position table is 512. The latter
  does not authorize extending the supported sentence context.
- Languages claimed: English, Russian, French, German, Spanish, Italian,
  Portuguese. Runtime representation checks are not language-quality validation.
- Base: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, a distilled
  multilingual sentence encoder. It was not trained from scratch only on fiction.
  Full original pretraining corpus/method details are not supplied by this card.
- Literary adaptation: semantic search/paraphrase pairs, approximately 134000;
  queries and paraphrases generated using language models. Exact training loss
  and complete optimization recipe are not disclosed in the model card.
- Corpora claimed: PG19 and Project Gutenberg; RusLit; Taiga prose; OPUS Books;
  Project Gutenberg for other European languages.
- Fiction share: adaptation described as fiction-only, with synthetic queries/
  paraphrases; numerical fraction over all pretraining plus adaptation is unknown.
- License: Apache-2.0 according to publisher metadata.
- Further training: floating-point PyTorch encoder should permit new heads if
  checkpoint loads; actual result is recorded in runs, not assumed from the card.
- Packaging issue: no root config/modules metadata; encoder config and module
  manifest appear under `1_Pooling`, whose config is not a Pooling config.
  Preserve the official snapshot; do not silently substitute base weights or
  invent the missing published pooling configuration.

Sources: [pinned card](https://huggingface.co/RafaelUI/literary-minilm/blob/92a6516f32321dc4048b49c9e6eb2b9aaa7e8e8f/README.md),
[base card](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2).
