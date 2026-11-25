import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AttendanceRosterSettings from './AttendanceRosterSettings';
import { rosterAPI } from '../../../../components/AttendanceRoster/api';

jest.mock('../../../../hooks', () => ({ useAuth: () => ({ doctors: [{ id: 'doctor-1', name: 'Doctor One', email: 'one@example.test' }] }) }));
jest.mock('../../../../i18n', () => ({ useLanguage: () => ({ lang: 'en' }) }));
jest.mock('../../../../components/AttendanceRoster/api', () => ({ rosterAPI: { options: jest.fn(), updateOptions: jest.fn() } }));

test('admin can enable the flexible roster for a chosen doctor', async () => {
  const options = { enabled: false, allDoctors: true, doctorIds: [], dashboard: true, flexible: true };
  rosterAPI.options.mockResolvedValue({ data: { data: options } });
  rosterAPI.updateOptions.mockImplementation((data) => Promise.resolve({ data: { data } }));
  render(<AttendanceRosterSettings />);
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Enable roster selection for doctors' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Available to all doctors' }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Doctor One/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Save roster settings' }));
  await waitFor(() => expect(rosterAPI.updateOptions).toHaveBeenCalledWith({
    enabled: true, allDoctors: false, doctorIds: ['doctor-1'], dashboard: false, flexible: true,
  }));
  expect(await screen.findByRole('status')).toHaveTextContent('Student roster settings saved.');
});
