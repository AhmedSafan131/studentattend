<?php

namespace App\Support;

final class Permissions
{
    public const VIEW_DASHBOARD = 'view_dashboard';

    public const VIEW_ATTENDANCE = 'view_attendance';

    public const VIEW_REPORTS = 'view_reports';

    public const VIEW_STUDENTS = 'view_students';

    public const EDIT_STUDENTS = 'edit_students';

    public const DELETE_STUDENTS = 'delete_students';

    public const MANAGE_DOCTORS = 'manage_doctors';

    public const MANAGE_ADMINS = 'manage_admins';

    public const MANAGE_PERMISSIONS = 'manage_permissions';

    public const MANAGE_ACADEMIC_TERMS = 'manage_academic_terms';

    public const MANAGE_SUBJECT_CATALOG = 'manage_subject_catalog';

    public const SELECT_ACADEMIC_TERM = 'select_academic_term';

    public const FULL_DASHBOARD_ACCESS = 'full_dashboard_access';

    public const SYSTEM_ADMIN = [
        self::FULL_DASHBOARD_ACCESS,
        self::VIEW_DASHBOARD,
        self::VIEW_ATTENDANCE,
        self::VIEW_REPORTS,
        self::VIEW_STUDENTS,
        self::EDIT_STUDENTS,
        self::DELETE_STUDENTS,
        self::MANAGE_DOCTORS,
        self::MANAGE_ADMINS,
        self::MANAGE_PERMISSIONS,
        self::MANAGE_ACADEMIC_TERMS,
        self::MANAGE_SUBJECT_CATALOG,
        self::SELECT_ACADEMIC_TERM,
    ];

    public const STAFF = [
        self::VIEW_DASHBOARD,
        self::VIEW_ATTENDANCE,
        self::VIEW_REPORTS,
        self::VIEW_STUDENTS,
    ];

    public static function defaultsForRole(string $role, bool $isSystem = false): array
    {
        if ($isSystem || $role === 'admin') {
            return self::SYSTEM_ADMIN;
        }

        return $role === 'staff' ? self::STAFF : [];
    }
}
