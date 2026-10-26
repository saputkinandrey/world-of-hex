"""Original bilingual prose, not excerpts from a published book."""
from common import ROOT, write

PAIRS = [
('Mara reached the stone bridge and placed a lantern on the wall.', 'Мара дошла до каменного моста и поставила фонарь на стену.'),
('Rowan watched her from the gate. He kept his sword in its sheath.', 'Рован смотрел на неё от ворот. Он держал меч в ножнах.'),
('"Will you open the gate?" Mara asked Rowan.', '— Ты откроешь ворота? — спросила Мара Рована.'),
('"No," Rowan answered. "I will not let the soldiers through."', '— Нет, — ответил Рован. — Я не пропущу солдат.'),
('Mara planned to return before sunrise, but she had not yet left the bridge.', 'Мара собиралась вернуться до рассвета, но ещё не ушла с моста.'),
('The lantern glass was green. Mist lay over the river.', 'Стекло фонаря было зелёным. Над рекой лежал туман.'),
('Rowan checked the lock every evening before he went home.', 'Рован каждый вечер проверял замок, прежде чем уйти домой.'),
('"Last winter I hid three children in the mill," Mara said.', '— Прошлой зимой я спрятала троих детей на мельнице, — сказала Мара.'),
('"I heard that Rowan sold the map," said Iven. "I did not see it happen."', '— Я слышал, что Рован продал карту, — сказал Ивен. — Сам я этого не видел.'),
('"I never betrayed my friends," Rowan said. Nobody answered his claim.', '— Я никогда не предавал друзей, — сказал Рован. Никто не ответил на это заявление.'),
('Mara stayed by the gate because she wanted the children to reach safety.', 'Мара осталась у ворот, потому что хотела, чтобы дети добрались до безопасного места.'),
('When the bell rang, Iven flinched and dropped his cup.', 'Когда зазвонил колокол, Ивен вздрогнул и уронил чашку.'),
('Rowan and Iven entered the yard. He lifted the lantern.', 'Рован и Ивен вошли во двор. Он поднял фонарь.'),
('The man who lifted it was Iven; Rowan had been carrying the blankets.', 'Фонарь поднял Ивен; Рован нёс одеяла.'),
('"They call me Ash," Mara told the guard. "That is my old nickname."', '— Меня зовут Пепел, — сказала Мара стражнику. — Это моё старое прозвище.'),
('"Ash, take the blankets," Rowan said to Mara.', '— Пепел, возьми одеяла, — сказал Рован Маре.'),
('Mara accepted the blankets but refused the silver coin.', 'Мара взяла одеяла, но отказалась от серебряной монеты.'),
('"Can we cross the river tonight?" Iven asked.', '— Мы сможем перейти реку сегодня ночью? — спросил Ивен.'),
('"Only after the bell," Mara replied. "Wait beside the mill."', '— Только после колокола, — ответила Мара. — Жди у мельницы.'),
('The discussion turned to food. Rowan asked whether any bread remained.', 'Разговор перешёл к еде. Рован спросил, остался ли хлеб.'),
('Iven gave Rowan half a loaf and kept the rest for the children.', 'Ивен отдал Ровану половину буханки, а остальное оставил детям.'),
('Years earlier, Rowan had chosen to abandon a paid post rather than arrest his sister.', 'Много лет назад Рован предпочёл бросить оплачиваемую должность, чтобы не арестовывать сестру.'),
('"He always pays his debts," Mara said of Rowan. It was her opinion, not the narrator\'s guarantee.', '— Он всегда возвращает долги, — сказала Мара о Роване. Это было её мнение, а не гарантия рассказчика.'),
('Iven considered stealing a horse, then decided against it.', 'Ивен подумывал украсть лошадь, но затем отказался от этой мысли.'),
('A broken cart stood beside the empty stable. Its wheels were covered in dust.', 'У пустой конюшни стояла сломанная телега. Её колёса покрывала пыль.'),
('At dawn Mara entered the mill alone. She found an unsigned letter on the table.', 'На рассвете Мара одна вошла на мельницу. На столе она нашла неподписанное письмо.'),
('The letter said, "I moved the children before midnight." No name identified its writer.', 'В письме было сказано: «Я увёл детей до полуночи». Имени автора не было.'),
('Mara folded the letter. She did not know whether its claim was true.', 'Мара сложила письмо. Она не знала, было ли написанное правдой.'),
('Rowan arrived and said, "I meant to warn you, but the gate was locked."', 'Пришёл Рован и сказал: «Я хотел предупредить тебя, но ворота были заперты».'),
('Mara stepped away from him when she heard the news.', 'Услышав новость, Мара отступила от него.'),
('"I will search the western road," Iven said. He remained in the doorway.', '— Я поищу на западной дороге, — сказал Ивен. Он остался в дверях.'),
('The rain stopped. The three stood quietly until the bell rang again.', 'Дождь прекратился. Все трое молча стояли, пока колокол не зазвонил снова.')
]

if __name__ == '__main__':
    folder = ROOT / 'fixtures'
    folder.mkdir(exist_ok=True)
    for index, language in enumerate(['en','ru']):
        (folder / f'bridge-{language}.txt').write_text('\n\n'.join(pair[index] for pair in PAIRS) + '\n', encoding='utf-8')
    write(folder / 'events.json', {'schema_version': '0.1.0', 'source': 'original text authored for this experiment',
          'annotation_status': 'author_checklist_not_independent_human_gold',
          'event_alignment': [{'event_id': f'event-{i:03d}', 'en_paragraph_ordinal': i, 'ru_paragraph_ordinal': i} for i in range(len(PAIRS))],
          'checks': {'no_behavior': [5,24], 'ambiguous_pronoun_then_clarification': [12,13],
                     'nickname': [14,15], 'reported_claim_not_fact': [8,9,22,26],
                     'unrealized_intention': [4,30], 'topic_change': [19], 'past_decision': [21]}})
