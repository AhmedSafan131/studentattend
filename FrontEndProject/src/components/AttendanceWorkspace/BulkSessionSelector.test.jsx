import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BulkSessionSelector from './BulkSessionSelector';

jest.mock('lottie-web', () => ({ loadAnimation: () => ({ destroy: jest.fn() }) }));
jest.mock('../../i18n', () => ({ useLanguage: () => ({ lang: 'ar', isRTL: true }) }));

test('renders real dropdowns and icons and selects a session without a runtime crash', () => {
  const select = jest.fn();
  render(<BulkSessionSelector sessions={[
    { id: 'target', faculty: 'Dentistry', subjectCode: 'BIO101', subjectName: 'Biochemistry 101', lectureType: 'Lecture', group: 'A', week: 'Week 5', status: 'closed' },
  ]} onSelectSession={select} facultyOptions={[{ value: 'Dentistry', label: 'كلية طب الأسنان' }]} />);
  expect(screen.getAllByRole('button').filter((button) => !button.disabled)).toHaveLength(1);
  for (const [label, option] of [
    ['الكلية', 'كلية طب الأسنان'], ['المادة', 'Biochemistry 101'], ['نوع المادة', 'محاضرة'],
    ['المجموعة', '1-Group A'], ['الأسبوع', 'الأسبوع الخامس'],
  ]) {
    fireEvent.click(screen.getByRole('button', { name: label, exact: true }));
    fireEvent.click(screen.getByRole('option', { name: option, exact: true }));
  }
  expect(select).toHaveBeenLastCalledWith('target');
});

test('renders the empty session state with the actual dropdown component', () => {
  render(<BulkSessionSelector sessions={[]} onSelectSession={jest.fn()} />);
  expect(screen.getByText('لا توجد جلسات متاحة. أنشئ جلسة من إدارة الجلسة أولاً.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'المادة', exact: true })).toBeDisabled();
});

test('requires an explicit open action before creating a missing session', async () => {
  const select = jest.fn();
  const create = jest.fn().mockResolvedValue({ id: 'created-week-1' });
  render(<BulkSessionSelector sessions={[]} facultyOptions={[{ value: 'Dentistry', label: 'طب الأسنان' }]} subjectOptions={[{ value: 'BIO101', label: 'Biochemistry 101', dataset: { subjectName: 'Biochemistry 101' }, types: ['Lecture'], groupsByType: { Lecture: ['A'] } }]} weekOptions={Array.from({ length: 6 }, (_, index) => ({ value: `Week ${index + 1}`, label: `Week ${index + 1}` }))} onSelectSession={select} onFacultyChange={jest.fn()} onCreateSession={create} />);

  for (const [label, option] of [
    ['الكلية', 'طب الأسنان'], ['المادة', 'Biochemistry 101'], ['نوع المادة', 'محاضرة'], ['المجموعة', '1-Group A'],
  ]) {
    fireEvent.click(screen.getByRole('button', { name: label, exact: true }));
    fireEvent.click(screen.getByRole('option', { name: option, exact: true }));
  }

  fireEvent.click(screen.getByRole('button', { name: 'الأسبوع', exact: true }));
  expect(screen.getByRole('option', { name: 'Week 1' })).not.toBeDisabled();
  fireEvent.click(screen.getByRole('option', { name: 'Week 1' }));
  expect(create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'فتح السيشن' }));
  await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({
    faculty: 'Dentistry', subjectCode: 'BIO101', lectureType: 'Lecture', group: 'A', week: 'Week 1',
  })));
  expect(select).toHaveBeenLastCalledWith('created-week-1');
});

test('reopens a matching closed session instead of creating a duplicate', async () => {
  const select = jest.fn();
  const create = jest.fn();
  const open = jest.fn().mockResolvedValue({ id: 'closed-target', status: 'open' });
  render(<BulkSessionSelector sessions={[
    { id: 'closed-target', subjectCode: 'BIO101', subjectName: 'Biochemistry 101', lectureType: 'Lecture', group: 'A', week: 'Week 5', status: 'closed' },
  ]} onSelectSession={select} onCreateSession={create} onOpenSession={open} />);

  for (const [label, option] of [
    ['المادة', 'Biochemistry 101'], ['نوع المادة', 'محاضرة'], ['المجموعة', '1-Group A'], ['الأسبوع', 'الأسبوع الخامس'],
  ]) {
    fireEvent.click(screen.getByRole('button', { name: label, exact: true }));
    fireEvent.click(screen.getByRole('option', { name: option, exact: true }));
  }

  expect(select).toHaveBeenLastCalledWith('closed-target');
  fireEvent.click(screen.getByRole('button', { name: 'فتح السيشن' }));
  await waitFor(() => expect(open).toHaveBeenCalledWith('closed-target'));
  expect(create).not.toHaveBeenCalled();
});
