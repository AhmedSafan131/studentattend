import React, { useRef } from 'react';
import { BookOpen, Check, Download, Users } from '../../../../assets/icons';
import { CustomBottom, CustomDropdown } from '../../../../components';
import { useLanguage } from '../../../../i18n';
import SectionCard from './SectionCard';

const StudentsBulkUploadSection = ({
  uploadPreview,
  uploadError,
  selectedFacultyId,
  facultyOptions = [],
  isParsingUpload,
  isApplyingUpload,
  onFacultyChange,
  onFilePicked,
  onConfirmUpload,
  onClearUpload,
  onDownloadTemplate,
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);

  return (
    <SectionCard
      icon={<Users size={22} />}
      eyebrow={t('studentsBulkUploadEyebrow')}
      title={t('studentsBulkUploadTitle')}
    >
      <div style={{ display: 'grid', gap: 18 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          multiple
          style={{ display: 'none' }}
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            if (files.length) onFilePicked(files);
            event.target.value = '';
          }}
        />

        <div style={{ maxWidth: 520 }}>
          <CustomDropdown
            label={t('studentsImportFacultyLabel')}
            name="students-import-faculty"
            value={selectedFacultyId}
            options={facultyOptions}
            onChange={onFacultyChange}
            placeholder={t('studentsImportFacultyPlaceholder')}
            searchable
            searchPlaceholder={t('studentsImportFacultySearchPlaceholder')}
            emptyMessage={t('studentsImportFacultyEmpty')}
            icon={<BookOpen size={17} />}
          />
          <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            {t('studentsMultiFacultyHint')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px' }}>
            <CustomBottom
              text={t('studentsChooseFiles')}
              onClick={() => fileInputRef.current?.click()}
              loading={isParsingUpload}
              loadingText={t('studentsParsingFile')}
              rigthIcon={<BookOpen size={16} />}
              background="linear-gradient(135deg, #0f766e, #0891b2)"
              boxShadow="0 16px 34px rgba(8,145,178,0.24)"
            />
          </div>
          <div style={{ flex: '1 1 220px' }}>
            <CustomBottom
              text={t('studentsDownloadTemplate')}
              onClick={onDownloadTemplate}
              rigthIcon={<Download size={16} />}
              background="var(--bg-dark)"
              textColor="var(--text-primary)"
              border="1px solid var(--border)"
              boxShadow="none"
            />
          </div>

          {uploadPreview ? (
            <>
              <div style={{ flex: '1 1 220px' }}>
                <CustomBottom
                  text={t('studentsConfirmUpload')}
                  onClick={onConfirmUpload}
                  loading={isApplyingUpload}
                  loadingText={t('studentsImportingStudents')}
                  disabled={Boolean(uploadPreview.invalidRows.length) || !uploadPreview.students.length}
                  rigthIcon={<Check size={16} />}
                />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <CustomBottom
                  text={t('studentsClearPreview')}
                  onClick={onClearUpload}
                  background="var(--bg-dark)"
                  textColor="var(--text-primary)"
                  border="1px solid var(--border)"
                  boxShadow="none"
                />
              </div>
            </>
          ) : null}
        </div>

        {uploadError ? (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f87171' }}>{uploadError}</div>
        ) : null}

        {uploadPreview?.invalidRows?.length ? (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{t('studentsFixImportIssues')}</div>
        ) : null}

        {uploadPreview ? (
          <div
            style={{
              display: 'grid',
              gap: 16,
              borderRadius: 20,
              border: '1px solid rgba(96,165,250,0.18)',
              background: 'rgba(96,165,250,0.06)',
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{t('studentsUploadPreviewReady')}</div>
                <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {uploadPreview.facultyName || t('studentsAllFaculties')} - {uploadPreview.sheetName}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {uploadPreview.students.length} {t('studentsParsedCount')}
                </span>
                <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', fontSize: 12.5, fontWeight: 700, color: uploadPreview.invalidRows.length ? '#fbbf24' : '#34d399' }}>
                  {uploadPreview.invalidRows.length} {t('studentsValidationIssues')}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {t('studentsUploadSyncHint')}
            </div>

            {uploadPreview.files?.length ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {uploadPreview.files.map((file) => (
                  <span
                    key={`${file.fileName}-${file.sheetName}`}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: 'rgba(96,165,250,0.1)',
                      color: 'var(--text-secondary)',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {file.fileName} - {file.studentsParsed} {t('studentsParsedCount')}
                  </span>
                ))}
              </div>
            ) : null}

            {uploadPreview.invalidRows.length ? (
              <div style={{ display: 'grid', gap: 6 }}>
                {uploadPreview.invalidRows.map((issue) => (
                  <div key={issue} style={{ fontSize: 12.5, color: '#fbbf24' }}>{issue}</div>
                ))}
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: 10 }}>
              {uploadPreview.students.slice(0, 4).map((student) => (
                <div
                  key={`${student.id}-${student.studentId}-${student.nationalId}`}
                  style={{
                    borderRadius: 18,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '14px 16px',
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{student.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    {student.studentId || student.nationalId} - {student.college}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {student.registrations.map((registration) => (
                      <span
                        key={`${student.id}-${registration.subjectCode}-${registration.group}-${registration.type}`}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 999,
                          background: 'rgba(52,211,153,0.12)',
                          color: 'var(--accent)',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {registration.subjectCode}{registration.subjectName ? ` - ${registration.subjectName}` : ''} - {t(`studentsTypeOption${registration.type}`)} - {t('studentsGroupWord')} {registration.group}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
};

export default StudentsBulkUploadSection;
