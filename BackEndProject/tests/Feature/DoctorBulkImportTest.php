<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DoctorBulkImportTest extends TestCase
{
    public function test_bulk_import_keeps_existing_password_and_uses_sheet_password_for_new_doctor(): void
    {
        $this->artisan('migrate:fresh --seed');

        $login = $this->postJson('/api/auth/login', [
            'email' => 'a',
            'password' => '123',
            'role' => 'admin',
        ])->assertOk();
        $token = $login->json('token');

        $existingStaff = User::query()->findOrFail('staff-1');
        $existingPasswordHash = $existingStaff->password;

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/users/import', [
                'doctors' => [
                    [
                        'name' => 'Updated Staff Member',
                        'email' => 'staff',
                        'nationalId' => 'existing-staff-national-id',
                        'password' => 'password-from-reimported-sheet',
                        'assignments' => [[
                            'id' => 'CS201',
                            'name' => 'Data Structures',
                            'faculty' => 'computers-ai',
                            'college' => 'computers-ai',
                            'type' => 'Lecture',
                        ]],
                    ],
                    [
                        'name' => 'New Imported Doctor',
                        'email' => 'new-doctor@example.test',
                        'nationalId' => '29901011239999',
                        'password' => 'NewDoctorPassword123',
                        'assignments' => [[
                            'id' => 'CS101',
                            'name' => 'Intro to Programming',
                            'faculty' => 'computers-ai',
                            'college' => 'computers-ai',
                            'type' => 'Lecture',
                        ]],
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('summary.doctorsCreated', 1)
            ->assertJsonPath('summary.doctorsUpdated', 1);

        $existingStaff->refresh();
        $this->assertSame($existingPasswordHash, $existingStaff->password);
        $this->assertTrue(Hash::check('123', $existingStaff->password));
        $this->assertFalse(Hash::check('password-from-reimported-sheet', $existingStaff->password));

        $newDoctor = User::query()->where('national_id', '29901011239999')->firstOrFail();
        $this->assertTrue(Hash::check('NewDoctorPassword123', $newDoctor->password));
    }
}
