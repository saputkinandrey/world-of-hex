import copy
import unittest

from contracts import ROOT, candidate_texts, load_dataset, validate


class ContractsTest(unittest.TestCase):
    def setUp(self):
        self.case = load_dataset(ROOT / 'fixtures/synthetic.json', labeled=True)[1][0]

    def test_labels_must_identify_available_actions(self):
        self.case['chosen_action_id'] = 'invented'
        with self.assertRaisesRegex(ValueError, 'chosen_action_id'):
            validate(self.case, labeled=True)

    def test_ids_must_be_unique(self):
        self.case['actions'][1]['id'] = self.case['actions'][0]['id']
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            validate(self.case)

    def test_permutations_preserve_text_by_action_id(self):
        before = dict(zip([a['id'] for a in self.case['actions']], candidate_texts(self.case)))
        self.case['actions'].reverse()
        after = dict(zip([a['id'] for a in self.case['actions']], candidate_texts(self.case)))
        self.assertEqual(before, after)

    def test_old_unlabeled_cases_cannot_be_training_examples(self):
        self.case.pop('chosen_action_id')
        with self.assertRaisesRegex(ValueError, 'chosen_action_id'):
            validate(self.case, labeled=True)

    def test_ids_are_not_model_input(self):
        changed = copy.deepcopy(self.case)
        changed['actions'][0]['id'] = 'another-id'
        self.assertEqual(candidate_texts(self.case), candidate_texts(changed))


if __name__ == '__main__':
    unittest.main()
