import React, { useRef } from 'react';
import { BookOpen, Check, Users } from '../../../../assets/icons';
import { CustomBottom, CustomDropdown } from '../../../../components';
import { useLanguage } from '../../../../i18n';
import SectionCard from './SectionCard';

const BulkImportSection = ({
  selectedFacultyId,
  facultyOptions = [],
  selectedFileName,
  importError,
  importSummary,
  importPreview,
  isImporting,
  onFacultyChange,
  onFilePicked,
  onImport,
  onDownloadTemplate,
}) => {
  const { t } = useLanguage();
  const inputRef = useRef(null);

  return (
    <SectionCard
      icon={<Users size={22} />}
      eyebrow={t('adminBulkImportEyebrow')}
      title={t('adminBulkImportTitle')}
      description={t('adminBulkImportDescription')}
    >
      <div style={{ display: 'grid', gap: 18 }}>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFilePicked(file);
            event.target.value = '';
          }}
        />

        <div style={{ maxWidth: 520 }}>
          <CustomDropdown
            label={t('adminFacultyLabel')}
            name="admin-import-faculty"
            value={selectedFacultyId}
            options={facultyOptions}
            onChange={onFacultyChange}
            placeholder={t('adminFacultyPlaceholder')}
            searchable
            searchPlaceholder={t('adminFacultyPlaceholder')}
            emptyMessage={t('adminFacultyPlaceholder')}
            icon={<BookOpen size={17} />}
          />
          <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            {t('adminSubjectFacultyHint')}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              minHeight: 84,
              borderRadius: 18,
              border: '1px dashed rgba(52,211,153,0.35)',
              background: 'rgba(52,211,153,0.06)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
              {t('adminSelectedFileLabel')}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: selectedFileName ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {selectedFileName || t('adminNoFileSelected')}
            </div>
          </div>

          <div>
            <CustomBottom
              text={t('adminChooseSheet')}
              onClick={() => inputRef.current?.click()}
              rigthIcon={<BookOpen size={16} />}
              background="linear-gradient(135deg, #0f766e, #0891b2)"
              boxShadow="0 16px 34px rgba(8,145,178,0.24)"
            />
          </div>

          <div>
            <CustomBottom
              text={importPreview ? t('adminImportSheet') : t('adminReviewSheet')}
              onClick={onImport}
              loading={isImporting}
              loadingText={t(importPreview ? 'adminImporting' : 'adminReviewing')}
              disabled={!selectedFileName || Boolean(importPreview?.invalidRows?.length) || Boolean(importPreview && !importPreview.groupedDoctors.length)}
              rigthIcon={<Check size={16} />}
            />
          </div>

          <div>
            <CustomBottom
              text={t('adminDownloadTemplate')}
              onClick={onDownloadTemplate}
              background="var(--bg-dark)"
              textColor="var(--text-primary)"
              border="1px solid var(--border)"
              boxShadow="none"
              rigthIcon={<BookOpen size={16} />}
            />
          </div>
        </div>

        {importError ? (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f87171' }}>{importError}</div>
        ) : null}

        {importPreview ? (
          <div style={{ borderRadius: 18, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)', padding: 18, display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{t('adminReviewSheet')}: {selectedFileName} — {importPreview.sheetName}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('adminRowsLabel')}: {importPreview.rowCount} · {t('adminInvalidRowsLabel')}: {importPreview.invalidRows.length}
            </div>
            {importPreview.invalidRows.length ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{t('adminFixImportIssues')}</div>
                {importPreview.invalidRows.map((item) => (
                  <div key={`${item.rowNumber}-${item.message}`} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {t('adminRowLabel')} {item.rowNumber}: {item.message}
                  </div>
                ))}
              </>
            ) : importPreview.groupedDoctors.length ? (
              <div style={{ fontSize: 13, color: '#34d399' }}>{t('adminPreviewReady')}</div>
            ) : (
              <div style={{ fontSize: 13, color: '#fbbf24' }}>{t('adminNoDoctorsInPreview')}</div>
            )}
          </div>
        ) : null}

        {importSummary ? (
          <div
            style={{
              borderRadius: 18,
              border: '1px solid rgba(96,165,250,0.22)',
              background: 'rgba(96,165,250,0.07)',
              padding: 18,
              display: 'grid',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(96,165,250,0.16)',
                  color: '#60a5fa',
                }}
              >
                <Check size={18} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{t('adminLatestImportSummary')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {importSummary.facultyName ? `${importSummary.facultyName} - ` : ''}
                  {importSummary.fileName} - {t('adminSheetLabel')}: {importSummary.sheetName}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
              }}
            >
              {[
                [t('adminRowsLabel'), importSummary.rowsParsed],
                [t('adminDoctorsCreatedLabel'), importSummary.doctorsCreated],
                [t('adminDoctorsReusedLabel'), importSummary.doctorsReused],
                [t('adminDoctorsUpdatedLabel'), importSummary.doctorsUpdated || 0],
                [t('adminAssignmentsAddedLabel'), importSummary.assignmentsAdded],
                [t('adminAssignmentsSkippedLabel'), importSummary.assignmentsSkipped],
                [t('adminInvalidRowsLabel'), importSummary.invalidRows.length],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: 12, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>

            {importSummary.invalidRows.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#fbbf24', letterSpacing: 1, textTransform: 'uppercase' }}>
                  {t('adminRowsNeedReview')}
                </div>
                {importSummary.invalidRows.slice(0, 5).map((item) => (
                  <div key={`${item.rowNumber}-${item.message}`} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {t('adminRowLabel')} {item.rowNumber}: {item.message}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
};

export default BulkImportSection;
