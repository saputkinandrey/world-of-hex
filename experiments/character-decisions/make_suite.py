"""Deterministic authored inputs; no model-generated biographies or gold answers."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHARACTERS = [
    ('guard', {'en':('Mara','A former town guard dismissed for refusing an unlawful arrest.','Protect civilians; respect fair rules.',{'courage':0.8,'compassion':0.7,'greed':0.1}),
               'ru':('Мара','Бывшая стражница, уволенная за отказ от незаконного ареста.','Защищать мирных жителей; соблюдать справедливые правила.',{'courage':0.8,'compassion':0.7,'greed':0.1})}),
    ('mercenary', {'en':('Rook','A veteran sellsword whose family depends on his earnings.','Earn money and stay alive; avoid unpaid risks.',{'courage':0.6,'compassion':0.3,'greed':0.8}),
                   'ru':('Рук','Наёмник-ветеран, на заработок которого живёт семья.','Зарабатывать и выжить; избегать неоплаченного риска.',{'courage':0.6,'compassion':0.3,'greed':0.8})}),
    ('healer', {'en':('Iven','A village healer who lost a sibling when strangers refused help.','Preserve life even when helping costs resources.',{'courage':0.5,'compassion':0.95,'greed':0.05}),
                'ru':('Ивен','Деревенский лекарь, потерявший сестру после отказа чужаков помочь.','Сохранять жизнь, даже если помощь требует ресурсов.',{'courage':0.5,'compassion':0.95,'greed':0.05})}),
    ('smuggler', {'en':('Sera','A smuggler previously imprisoned after a partner betrayed her.','Preserve freedom; distrust authorities and costly commitments.',{'courage':0.2,'compassion':0.4,'greed':0.6}),
                  'ru':('Сера','Контрабандистка, попавшая в тюрьму после предательства напарника.','Сохранить свободу; не доверять властям и тяжёлым обязательствам.',{'courage':0.2,'compassion':0.4,'greed':0.6})}),
]
SCENARIOS = [
    ('wounded',{
        'en':('A wounded traveler requests help beside a road. You have one medical kit.',
              ['The traveler is unarmed. The road is safe.','Armed pursuers are approaching. Helping exposes you to immediate danger.'],
              [('help','Use your kit to treat the traveler.'),('bargain','Demand payment before treatment.'),('leave','Leave quickly and keep the kit.'),('seek_help','Seek nearby guards and report the traveler.')]),
        'ru':('Раненый путник просит помощи у дороги. У вас один лечебный набор.',
              ['Путник безоружен. Дорога безопасна.','Приближаются вооружённые преследователи. Помощь подвергнет вас немедленной опасности.'],
              [('help','Использовать набор и лечить путника.'),('bargain','Потребовать плату перед лечением.'),('leave','Быстро уйти и сохранить набор.'),('seek_help','Найти стражу и сообщить о путнике.')])}),
    ('purse',{
        'en':('You find a purse with coins and the owner\'s address. Nobody has seen you.',
              ['The owner is a poor parent who needs medicine for a child.','The owner is a wealthy official notorious for extorting villagers.'],
              [('return','Return all coins to the named owner.'),('keep','Keep all coins for yourself.'),('donate','Give the coins to needy villagers.'),('report','Hand the purse to the local authorities.')]),
        'ru':('Вы нашли кошелёк с монетами и адресом владельца. Вас никто не видел.',
              ['Владелец — бедный родитель, которому нужны лекарства для ребёнка.','Владелец — богатый чиновник, известный поборами с крестьян.'],
              [('return','Вернуть все монеты владельцу.'),('keep','Оставить все монеты себе.'),('donate','Передать монеты нуждающимся жителям.'),('report','Сдать кошелёк местным властям.')])}),
]


def build_suite():
    rows = []
    for character_id,translations in CHARACTERS:
        for scenario_id,scenario_translations in SCENARIOS:
            for language in ('en','ru'):
                name,bio,motivation,traits = translations[language]
                situation,contexts,actions = scenario_translations[language]
                for context_index,context in enumerate(contexts):
                    for order,indices in [('original',[0,1,2,3]),('reversed',[3,2,1,0]),('rotated',[1,2,3,0])]:
                        rows.append({'id':f'{character_id}.{scenario_id}.{language}.c{context_index}.{order}',
                            'language':language,'character_id':character_id,'scenario_id':scenario_id,
                            'context_variant':context_index,'order_variant':order,
                            'character':{'name':name,'biography':bio,'motivation':motivation,'traits':traits},
                            'situation':{'description':situation,'context':context},
                            'actions':[{'id':actions[i][0],'description':actions[i][1]} for i in indices]})
    return {'schema':'character-decisions/1','cases':rows}


if __name__=='__main__':
    target = ROOT/'fixtures/suite.json'
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(build_suite(),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Wrote96 cases:4characters x2situations x2contexts x2languages x3orders')
