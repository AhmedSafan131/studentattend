import { buildNumberedGroupOptions } from './groupDisplay';

test('numbers group labels without changing their submitted values', () => {
  expect(buildNumberedGroupOptions(['A', 'B', 'C', 'D'])).toEqual([
    { value: 'A', label: '1-Group A' },
    { value: 'B', label: '2-Group B' },
    { value: 'C', label: '3-Group C' },
    { value: 'D', label: '4-Group D' },
  ]);
});
