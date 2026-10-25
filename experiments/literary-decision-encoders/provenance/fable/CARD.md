# FABLE

- HF ID: `SaladTechnologies/fable-base`.
- Revision: `45aceef3d49fe75bd8240010cbfdc983724ec420`.
- Architecture: official `DebertaV2ForTokenClassification`, DeBERTa v3 base
  weights. 12 layers, hidden 768. Exact encoder parameter count is measured in
  run metadata: 183831552 encoder parameters, 183843087 in the published tensors
  including the unused NER head (approximately 0.2B).
- Context: official configuration has 512 positions; effective tokenizer limit
  is checked at runtime. No extension of configuration.
- Language: English. Russian tokenization/finite representations do not establish
  Russian support or decision competence.
- Original pretraining: microsoft/deberta-v3-base; ELECTRA-style RTD with
  gradient-disentangled embedding sharing, 160 GB corpus according to base card.
- Literary adaptation: supervised named entity token classification, not behavior
  prediction. Publisher describes Focal Loss, one epoch, 12M training examples.
- Corpus: Fiction-NER-750M (750M annotated tokens), Project Gutenberg and other
  permissively licensed English narrative fiction.
- Fiction share: adaptation described as literary fiction; numerical fraction
  across inherited pretraining plus adaptation is unknown.
- License: MIT according to model metadata.
- Further training: frozen encoder plus independent heads, verified per run.
- Provenance guard: load AutoModel directly from pinned FABLE snapshot; reject
  missing/mismatched encoder weights. Only unused classifier keys are expected.
  Checkpoint file hashes and encoder fingerprint are retained. No base-model load.

Sources: [pinned card](https://huggingface.co/SaladTechnologies/fable-base/blob/45aceef3d49fe75bd8240010cbfdc983724ec420/README.md),
[base model](https://huggingface.co/microsoft/deberta-v3-base),
[adaptation dataset](https://huggingface.co/datasets/SaladTechnologies/fiction-ner-750m).
