---
license: mit
datasets:
- SaladTechnologies/fiction-ner-750m
language:
- en
base_model:
- microsoft/deberta-v3-base
pipeline_tag: token-classification
---

# FABLE - Fiction Adapted BERT for Literary Entities

This is a named-entity recognition (NER) model called FABLE, which stands for Fiction Adapted BERT for Literary Entities. It is based on the DeBERTa v3 architecture and has been fine-tuned on the [Fiction-NER-750M dataset](https://huggingface.co/datasets/SaladTechnologies/fiction-ner-750m) of literary texts to recognize entities such as characters, locations, and other relevant terms in fiction.

## Model Details

### Model Description

FABLE is a transformer-based model designed for named-entity recognition (NER) tasks in literary texts. It has been fine-tuned on a large dataset of fiction to accurately identify and classify entities such as characters, locations, and other relevant terms.

Entity labels are in [BIO Tagging format](https://en.wikipedia.org/wiki/Inside%E2%80%93outside%E2%80%93beginning_(tagging)), meaning the beginning of an entity is prefixed with `B-`, and tokens which are a continuation of that entity are prefixed with `I-`.

For example, the tokens `Arthur, Funkleton` would be tagged `B-CHA, I-CHA`, indicating that both tokens belong to the same Character entity.

- `O` - Outside / Not a Named Entity
- `CHA` - Character
- `LOC` - Location
- `FAC` - Facility
- `OBJ` - Important Object
- `EVT` - Event
- `ORG` - Organization
- `MISC` - Other Named Entity

### Model Specifications

- **Developed by:** Shawn Rushefsky - [🤗](https://huggingface.co/shawnrushefsky) | [github](https://github.com/shawnrushefsky)
- **Funded by:** [Salad Technologies](https://salad.com)
- **Model type:** NER / Token Classification
- **Language(s) (NLP):** English
- **License:** MIT
- **Finetuned from model:** microsoft/deberta-v3-base

## Uses

This model is intended to be used in the analysis of literary texts, such as novels and short stories, to identify and classify named entities.

## Bias, Risks, and Limitations

The training data comes from a diverse set of english-language narrative fiction spanning hundreds of years of authorship, and may include subject matter and phrasing that offend.
The age of much of the material from Project Gutenberg is such that white men from before the civil rights movement are vastly disproportionately represented as authors.
Additionally, contemporary commercial fiction is nearly all but excluded due to licensing restrictions.

### Recommendations

Use at your own risk. This model is provided as-is, without warranty of any kind.

## How to Get Started with the Model

```python
from transformers import pipeline

pipe = pipeline("token-classification", model="SaladTechnologies/fable-base")
pipe("Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversations?'")
```

Example output:

```python
[{'entity': 'B-CHA',
  'score': np.float32(0.91116154),
  'index': 1,
  'word': '▁Alice',
  'start': 0,
  'end': 5},
 {'entity': 'B-FAC',
  'score': np.float32(0.40558067),
  'index': 15,
  'word': '▁bank',
  'start': 69,
  'end': 74},
 {'entity': 'B-OBJ',
  'score': np.float32(0.5218266),
  'index': 33,
  'word': '▁book',
  'start': 142,
  'end': 147},
 {'entity': 'B-OBJ',
  'score': np.float32(0.5387561),
  'index': 57,
  'word': '▁book',
  'start': 244,
  'end': 249},
 {'entity': 'B-CHA',
  'score': np.float32(0.91744995),
  'index': 61,
  'word': '▁Alice',
  'start': 259,
  'end': 265}]
```

## Training Details

### Training Data

The model was trained on the [Fiction-NER-750M dataset](https://huggingface.co/datasets/SaladTechnologies/fiction-ner-750m), which consists of 750 million tokens of annotated literary text from a variety of sources, including Project Gutenberg and other permissively licensed texts.

### Training Procedure

The model was trained on 12 million examples, with a validation set of 1.2 million examples, for 1 epoch, using Focal Loss to address class imbalance.

#### Training Hyperparameters

See [train.ipynb](https://huggingface.co/SaladTechnologies/fable-base/blob/main/train.ipynb) for the full training code.

## Evaluation

The model achieves F1 score of approximately .752 on the validation set. However, spot checks of the model's predictions on unseen texts suggest that it outperforms this metric, which may be depressed by inconsistencies in the training data annotations.

## Environmental Impact

Carbon emissions estimated using the [Machine Learning Impact calculator](https://mlco2.github.io/impact#compute) presented in [Lacoste et al. (2019)](https://arxiv.org/abs/1910.09700).

- **Hardware Type:** 8x A100
- **Hours used:** 24 GPU hours
- **Cloud Provider:** [Salad Technologies](https://salad.com)
- **Carbon Emitted:** 2.22 kg CO2eq
