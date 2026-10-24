"""Thin wrappers around official SDKs; no learned parameters are changed."""
import json
import string

from contracts import question, state_text

LAYA_OPTION_TOKEN_LIMIT = 48  # Official laya.common.build_head option cap.


class LayaAdapter:
    def __init__(self,path,device,max_length):
        import laya
        self.agent = laya.load(str(path),device=device,compile=False,fast=False)
        self.tokenizer = self.agent.tok
        self.max_length = max_length
        self.metadata = {'sdk':'laya','version':laya.__version__,'configuration':self.agent.cfg,
                         'probability_kind':'native_choice_distribution_rounded_by_official_sdk'}

    def predict(self,case):
        state = state_text(case)
        criteria = {a['id']:a['description'] for a in case['actions']}
        option_lengths = [len(self.tokenizer.encode(' '+text,add_special_tokens=False)) for text in criteria.values()]
        head_length = len(self.tokenizer.encode('choice question: '+question(case),add_special_tokens=False))
        if max(option_lengths)>LAYA_OPTION_TOKEN_LIMIT or head_length+sum(option_lengths)+len(criteria)+3>self.agent.cfg['head_max_len']:
            raise ValueError('Laya question/options exceed native head budget; refusing silent truncation')
        # Conservative bound: reject oversized cases rather than silently truncate.
        upper = len(self.tokenizer.encode(state))+len(self.tokenizer.encode(question(case)+' '+ ' '.join(criteria.values())))+32
        if upper>self.max_length:
            raise ValueError(f'Input token upper bound{upper} exceeds shared limit{self.max_length}')
        raw = self.agent.predict(state,{'action':{'type':'choice','instructions':question(case),'criteria':criteria}},max_len=self.max_length)
        if raw.get('usage',{}).get('truncated'):
            raise ValueError('Official Laya SDK truncated state: '+json.dumps(raw['usage']))
        if raw.get('usage',{}).get('options'):
            raise ValueError('Official Laya SDK collapsed option descriptions: '+json.dumps(raw['usage']))
        answer = raw['answers']['action']
        return {'selected_action':answer['choice'],'probabilities':answer['probabilities'],
                'abstained':False,'raw_response':raw,'token_upper_bound':upper}


class VerdictAdapter:
    def __init__(self,path,device,max_length):
        from rlcd import DecisionEngine
        self.engine = DecisionEngine(model_name_or_path=str(path),device=device,max_length=max_length)
        if self.engine.calibrator is None:
            raise RuntimeError('Official Verdict calibrator was not loaded; refusing an uncalibrated substitute')
        self.tokenizer = self.engine.tokenizer
        self.max_length = max_length
        self.metadata = {'sdk':'Verdict official DecisionEngine','engine_release':'1.4',
            'probability_kind':'native_distribution_including_abstention',
            'calibrator':json.loads((path/'calibrator.json').read_text())}

    def predict(self,case):
        from rlcd import Choice,Option
        from core.formatting import format_prompt,format_query
        query = Choice(id='action',question=question(case),options=[Option(**a) for a in case['actions']])
        formatted,labels,_ = format_query(state_text(case),query)
        # Use the official formatting result to measure the actual encoder input.
        prompt = format_prompt(formatted,labels)
        tokens = len(self.tokenizer.encode(prompt))
        if tokens>self.max_length:
            raise ValueError(f'Verdict input length{tokens} exceeds shared limit{self.max_length}')
        raw = self.engine.evaluate(context=state_text(case),queries=[query]).model_dump(mode='json')
        answer = raw['results'][0]
        return {'selected_action':None if answer['is_abstention'] else answer['selected_id'],
            'probabilities':answer['probabilities'],'abstained':answer['is_abstention'],
            'raw_response':raw,'input_tokens':tokens,'actual_prompt':prompt}


class QwenAdapter:
    def __init__(self,path,device,max_length):
        import torch
        from transformers import AutoModelForCausalLM,AutoTokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(path,local_files_only=True)
        dtype = torch.bfloat16 if device.startswith('cuda') else torch.float32
        self.model = AutoModelForCausalLM.from_pretrained(path,local_files_only=True,
            dtype=dtype,attn_implementation='sdpa').to(device).eval()
        self.device,self.max_length = device,max_length
        self.metadata = {'sdk':'transformers.AutoModelForCausalLM','dtype':str(dtype),
            'enable_thinking':False,'generation':False,
            'probability_kind':'conditional_next_letter_token_distribution_not_calibrated'}

    def predict(self,case):
        import torch
        labels = list(string.ascii_uppercase[:len(case['actions'])])
        choices = '\n'.join(f'{label}: {a["description"]}' for label,a in zip(labels,case['actions']))
        instruction = ('Ответьте одной буквой допустимого действия.' if case.get('language')=='ru' else 'Answer with only the letter of an allowed action.')
        content = f'{question(case)}\n{state_text(case)}\n{choices}\n{instruction}'
        prompt = self.tokenizer.apply_chat_template([{'role':'user','content':content}],tokenize=False,
                    add_generation_prompt=True,enable_thinking=False)
        inputs = self.tokenizer(prompt,return_tensors='pt').to(self.device)
        count = inputs['input_ids'].shape[1]
        if count>self.max_length:
            raise ValueError(f'Qwen input length{count} exceeds shared limit{self.max_length}')
        ids = [self.tokenizer.encode(label,add_special_tokens=False) for label in labels]
        if any(len(tokens)!=1 for tokens in ids):
            raise ValueError('Qwen label is not a single token; no approximate multi-token scoring')
        with torch.inference_mode():
            logits = self.model(**inputs,use_cache=False).logits[0,-1].float()
            label_logits = logits[[tokens[0] for tokens in ids]]
            probabilities = label_logits.softmax(dim=-1).cpu().tolist()
            label_mass = logits.softmax(dim=-1)[[tokens[0] for tokens in ids]].sum().item()
        selected = max(range(len(labels)),key=probabilities.__getitem__)
        return {'selected_action':case['actions'][selected]['id'],
            'probabilities':{a['id']:prob for a,prob in zip(case['actions'],probabilities)},'abstained':False,
            'input_tokens':count,'actual_prompt':prompt,
            'raw_response':{'letter':labels[selected],'label_logits':label_logits.cpu().tolist(),
                'label_token_ids':[tokens[0] for tokens in ids],'unconditional_label_probability_mass':label_mass,
                'decision_rule':'argmax restricted to allowed single-letter tokens; not free text generation'}}


def load_adapter(name,path,device,max_length):
    if name.startswith('laya_'):
        return LayaAdapter(path,device,max_length)
    if name=='verdict_1_4':
        return VerdictAdapter(path,device,max_length)
    if name=='qwen3_1_7b':
        return QwenAdapter(path,device,max_length)
    raise ValueError('Unsupported model: '+name)
