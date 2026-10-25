# ruELECTRA-medium

- HF ID: `ai-forever/ruElectra-medium`.
- Revision: `23d6d09ff6d58546701718445aa875633bd1f25d`.
- Architecture: official ElectraForPreTraining, 12 layers, hidden/embedding size
  576, 9 attention heads, vocabulary 64000. Exact encoder parameter count is
  measured at runtime: 85026816. The published file additionally contains an
  unused generator and prediction heads; it is larger than the encoder alone.
- Context: official config and source paper specify 512 tokens including special
  tokens. No artificial extension or hidden truncation.
- Language: Russian; English is an exploratory representation diagnostic only.
- Original pretraining: Replaced Token Detection with a generator/discriminator.
  The discriminator output is not an action score.
- Separate literary adaptation: none established by the publisher sources.
- Mixed 70 GB corpus: Russian Wikipedia, news, books, OpenSubtitles, according
  to the family paper. Book resources include Librusec and Taiga poetry through
  corus. This is mixed pretraining including books, not fiction-only fine-tuning.
- Known fiction percentage: unknown; exact fraction is not given in the cited
  corpus table. A book source does not prove every document is fiction.
- License: MIT according to publisher metadata.
- Further training: floating-point AutoModel encoder, new independent frozen-
  encoder heads verified per run. Original pretraining head is not used.

Sources: [pinned card](https://huggingface.co/ai-forever/ruElectra-medium/blob/23d6d09ff6d58546701718445aa875633bd1f25d/README.md),
[family paper, sections 3.1 and 3.2.3](https://arxiv.org/html/2309.10931v2).
