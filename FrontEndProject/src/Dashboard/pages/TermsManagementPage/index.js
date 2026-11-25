import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppHelmet from '../../../components/AppHelmet';
import {
  ConfirmationDialog,
  CustomBottom,
  CustomInput,
  Loading,
  Pagination,
} from '../../../components';
import {
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Edit3,
  Layers,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from '../../../assets/icons';
import { useToast } from '../../../hooks';
import { useLanguage } from '../../../i18n';
import SectionCard from '../AdminPanel/components/SectionCard';
import {
  fetchTerms,
  createTermThunk,
  updateTermThunk,
  activateTermThunk,
  deleteTermThunk,
  setSelectedTermCode,
} from '../../../redux/slices/termsSlice';

const PAGE_SIZE_OPTIONS = [5, 8, 12, 20];

const TermsManagementPage = () => {
  const { lang, isRTL } = useLanguage();
  const { showToast } = useToast();
  const dispatch = useDispatch();
  const { terms, loading } = useSelector((state) => state.terms);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingTerm, setDeletingTerm] = useState(null);
  const [activatingTerm, setActivatingTerm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    academicYear: '2025/2026',
    startDate: '',
    endDate: '',
    weeksCount: 12,
    isActive: false,
    isManualWeeks: false,
  });

  useEffect(() => {
    dispatch(fetchTerms());
  }, [dispatch]);

  // Automatically compute weeks from dates unless manually modified
  useEffect(() => {
    if (formData.startDate && formData.endDate && !formData.isManualWeeks) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end >= start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const computedWeeks = Math.max(1, Math.min(52, Math.ceil(diffDays / 7)));
        setFormData((prev) => ({ ...prev, weeksCount: computedWeeks }));
      }
    }
  }, [formData.startDate, formData.endDate, formData.isManualWeeks]);

  const handleOpenAddModal = () => {
    setEditingTerm(null);
    setFormData({
      code: 'SUMMER-2025-2026',
      name: 'الترم الصيفي 2025/2026',
      academicYear: '2025/2026',
      startDate: '2026-06-01',
      endDate: '2026-08-31',
      weeksCount: 12,
      isActive: terms.length === 0,
      isManualWeeks: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (term) => {
    setEditingTerm(term);
    setFormData({
      code: term.code,
      name: term.name,
      academicYear: term.academicYear || '',
      startDate: term.startDate || '',
      endDate: term.endDate || '',
      weeksCount: term.weeksCount || 12,
      isActive: term.isActive,
      isManualWeeks: true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.code.trim()) {
      showToast(
        lang === 'ar' ? 'يرجى إدخال اسم وكود الفصل الدراسي بشكل صحيح.' : 'Please enter valid term name and code.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingTerm) {
        await dispatch(
          updateTermThunk({
            id: editingTerm.id,
            data: {
              name: formData.name,
              academicYear: formData.academicYear,
              startDate: formData.startDate || null,
              endDate: formData.endDate || null,
              weeksCount: Number(formData.weeksCount),
              isActive: formData.isActive,
            },
          })
        ).unwrap();
        showToast(
          lang === 'ar' ? 'تم تحديث بيانات الفصل الدراسي بنجاح.' : 'Academic term updated successfully.',
          'success'
        );
      } else {
        await dispatch(
          createTermThunk({
            code: formData.code,
            name: formData.name,
            academicYear: formData.academicYear,
            startDate: formData.startDate || null,
            endDate: formData.endDate || null,
            weeksCount: Number(formData.weeksCount),
            isActive: formData.isActive,
          })
        ).unwrap();
        showToast(
          lang === 'ar' ? 'تمت إضافة الفصل الدراسي الجديد بنجاح.' : 'New academic term added successfully.',
          'success'
        );
      }
      dispatch(fetchTerms());
      setIsModalOpen(false);
    } catch (err) {
      const errorMsg =
        typeof err === 'string'
          ? err
          : err?.message || (lang === 'ar' ? 'حدث خطأ أثناء حفظ الفصل الدراسي.' : 'An error occurred while saving term.');
      showToast(errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmActivate = async () => {
    if (!activatingTerm) return;
    const term = activatingTerm;
    setActivatingTerm(null);

    try {
      await dispatch(activateTermThunk(term.id)).unwrap();
      dispatch(setSelectedTermCode(term.code));
      dispatch(fetchTerms());
      showToast(
        lang === 'ar'
          ? `تم تفعيل "${term.name}" كـ ترم نشط رئيسي للنظام بنجاح.`
          : `Activated "${term.name}" as active term successfully.`,
        'success'
      );
    } catch (err) {
      const errorMsg =
        typeof err === 'string'
          ? err
          : err?.message || (lang === 'ar' ? 'تعذر تفعيل الفصل الدراسي.' : 'Failed to activate term.');
      showToast(errorMsg, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTerm) return;
    const term = deletingTerm;
    setDeletingTerm(null);

    try {
      await dispatch(deleteTermThunk(term.id)).unwrap();
      dispatch(fetchTerms());
      showToast(
        lang === 'ar' ? 'تم حذف الفصل الدراسي بنجاح.' : 'Academic term deleted successfully.',
        'success'
      );
    } catch (err) {
      const errorMsg =
        typeof err === 'string'
          ? err
          : err?.message || (lang === 'ar' ? 'تعذر حذف الترم لاحتوائه على بيانات مرتبطة.' : 'Cannot delete term.');
      showToast(errorMsg, 'error');
    }
  };

  const filteredTerms = useMemo(() => {
    return terms.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.academicYear && t.academicYear.includes(searchTerm))
    );
  }, [terms, searchTerm]);

  const activeTerm = terms.find((t) => t.isActive);

  const paginatedTerms = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTerms.slice(start, start + pageSize);
  }, [filteredTerms, currentPage, pageSize]);

  return (
    <div style={{ padding: '24px 20px', width: '100%', maxWidth: 1400, margin: '0 auto' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <AppHelmet
        titleAr="إدارة الفصول الدراسية"
        titleEn="Academic Terms Management"
        descriptionAr="إدارة الفصول الدراسية وتعيين التيرم النشط وحساب أسابيع الدراسة"
        descriptionEn="Manage academic terms, active terms, and study weeks count"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* 3 Side-by-Side Top Section Cards Grid */}
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'stretch' }}>
          {/* Card 1: Academic Structure & Quick Add */}
          <SectionCard
            icon={<CalendarDays size={22} />}
            eyebrow={lang === 'ar' ? 'الهيكل الأكاديمي' : 'Academic Structure'}
            title={lang === 'ar' ? 'إدارة الفصول الدراسية' : 'Academic Terms'}
            description={
              lang === 'ar'
                ? 'إدارة الفصول الدراسية، تحديد البداية والنهاية، وتعيين التيرم النشط.'
                : 'Manage academic terms, duration dates, and assign active term.'
            }
          >
            <div style={{ marginTop: 14 }}>
              <CustomBottom
                type="button"
                text={lang === 'ar' ? 'إضافة فصل دراسي جديد' : 'Add New Term'}
                onClick={handleOpenAddModal}
                leftIcon={<Plus size={18} />}
                background="linear-gradient(135deg, var(--primary, #10b981), var(--primary-light, #059669))"
                textColor="#ffffff"
                minHeight={44}
              />
            </div>
          </SectionCard>

          {/* Card 2: Current Active Term */}
          <SectionCard
            icon={<Star size={22} />}
            eyebrow={lang === 'ar' ? 'الحالة الحالية' : 'Current Status'}
            title={lang === 'ar' ? 'التيرم النشط حالياً' : 'Active Term'}
            description={lang === 'ar' ? 'التيرم المعتمد في جميع عمليات النظام والحضور' : 'Default term used across system operations'}
          >
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {activeTerm ? activeTerm.name : (lang === 'ar' ? 'الترم الصيفي 2025/2026' : 'Summer Term 2025/2026')}
                </h3>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: 'rgba(16,185,129,0.15)',
                    color: '#34d399',
                    fontSize: 11.5,
                    fontWeight: 800,
                    border: '1px solid rgba(16,185,129,0.3)',
                    flexShrink: 0,
                  }}
                >
                  <Check size={13} />
                  {lang === 'ar' ? 'نشط' : 'Active'}
                </span>
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 700 }}>
                {lang === 'ar' ? 'كود التيرم:' : 'Term Code:'} {activeTerm ? activeTerm.code : 'SUMMER-2025-2026'}
              </div>

              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
                <div>
                  <strong>{lang === 'ar' ? 'السنة الدراسية:' : 'Year:'}</strong> {activeTerm?.academicYear || '2025/2026'}
                </div>
                <div>
                  <strong>{lang === 'ar' ? 'الأسابيع:' : 'Weeks:'}</strong> {activeTerm ? `${activeTerm.weeksCount} أسبوعاً` : '12 أسبوعاً'}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Card 3: Overview Statistics */}
          <SectionCard
            icon={<Layers size={22} />}
            eyebrow={lang === 'ar' ? 'إحصائيات' : 'Overview Statistics'}
            title={lang === 'ar' ? 'ملخص الفصول الدراسية' : 'Terms Summary'}
            description={lang === 'ar' ? 'إجمالي الفصول الدراسية وأسابيع المحاضرات' : 'Total registered terms and lecture duration'}
          >
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div
                style={{
                  borderRadius: 14,
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {lang === 'ar' ? 'إجمالي الترمات' : 'Total Terms'}
                </span>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                  {terms.length}
                </div>
              </div>

              <div
                style={{
                  borderRadius: 14,
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {lang === 'ar' ? 'أسابيع الدراسة' : 'Weeks Count'}
                </span>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                  {activeTerm ? activeTerm.weeksCount : 12}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Full-Width Section Card: Terms Table & Search */}
        <SectionCard
          icon={<BookOpen size={22} />}
          eyebrow={lang === 'ar' ? 'السجل والأرشيف' : 'Catalog & Log'}
          title={lang === 'ar' ? 'قائمة الفصول الدراسية المسجلة' : 'Registered Academic Terms'}
          description={
            lang === 'ar'
              ? 'استعراض كل الفصول الدراسية المضافة والتنقل بينها وتفعيل التيرم المطلوب.'
              : 'Browse all terms, toggle active state, and manage dates.'
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', gap: 16, marginBottom: 20, marginTop: 14 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>
              <CustomInput
                type="text"
                placeholder={lang === 'ar' ? 'ابحث باسم أو كود الترم...' : 'Search by name or code...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Loading size={60} />
            </div>
          ) : paginatedTerms.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              {lang === 'ar' ? 'لا توجد فصول دراسية مضافة حتى الآن.' : 'No terms found.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 16px' }}>{lang === 'ar' ? 'الفصل الدراسي' : 'Term Name'}</th>
                    <th style={{ padding: '14px 16px' }}>{lang === 'ar' ? 'رمز التيرم (Code)' : 'Term Code'}</th>
                    <th style={{ padding: '14px 16px' }}>{lang === 'ar' ? 'السنة الدراسية' : 'Academic Year'}</th>
                    <th style={{ padding: '14px 16px' }}>{lang === 'ar' ? 'تاريخ البداية والنهاية' : 'Duration'}</th>
                    <th style={{ padding: '14px 16px' }}>{lang === 'ar' ? 'عدد الأسابيع' : 'Weeks'}</th>
                    <th style={{ padding: '14px 16px' }}>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: 13.5, color: 'var(--text-primary)' }}>
                  {paginatedTerms.map((term) => (
                    <tr
                      key={term.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: term.isActive ? 'rgba(16,185,129,0.04)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '16px', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <BookOpen size={16} style={{ color: 'var(--accent)' }} />
                          <span>{term.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>
                        {term.code}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                        {term.academicYear || '—'}
                      </td>
                      <td style={{ padding: '16px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {term.startDate && term.endDate ? (
                          <span>
                            {term.startDate} <span style={{ opacity: 0.5 }}>→</span> {term.endDate}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 8,
                            background: 'rgba(168,85,247,0.12)',
                            color: '#c084fc',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          <Clock3 size={12} />
                          {term.weeksCount} {lang === 'ar' ? 'أسبوعاً' : 'w'}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {term.isActive ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 12px',
                              borderRadius: 20,
                              background: 'rgba(16,185,129,0.15)',
                              color: '#34d399',
                              fontSize: 12,
                              fontWeight: 800,
                              border: '1px solid rgba(16,185,129,0.3)',
                            }}
                          >
                            <Check size={14} />
                            {lang === 'ar' ? 'النشط حالياً' : 'Current Active'}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              padding: '4px 10px',
                              borderRadius: 20,
                              background: 'rgba(255,255,255,0.05)',
                              color: 'var(--text-muted)',
                              fontSize: 12,
                            }}
                          >
                            {lang === 'ar' ? 'مؤرشف' : 'Archived'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justify: 'center', gap: 8 }}>
                          {!term.isActive ? (
                            <CustomBottom
                              type="button"
                              text={lang === 'ar' ? 'تفعيل' : 'Activate'}
                              onClick={() => setActivatingTerm(term)}
                              background="rgba(16,185,129,0.15)"
                              textColor="#34d399"
                              border="1px solid rgba(16,185,129,0.3)"
                              minHeight={32}
                            />
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(term)}
                            title={lang === 'ar' ? 'تعديل البيانات' : 'Edit'}
                            style={{
                              padding: 8,
                              borderRadius: 10,
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit3 size={15} />
                          </button>

                          {!term.isActive ? (
                            <button
                              type="button"
                              onClick={() => setDeletingTerm(term)}
                              title={lang === 'ar' ? 'حذف' : 'Delete'}
                              style={{
                                padding: 8,
                                borderRadius: 10,
                                background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                color: '#f87171',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredTerms.length > pageSize ? (
            <div style={{ marginTop: 20 }}>
              <Pagination
                currentPage={currentPage}
                totalCount={filteredTerms.length}
                pageSize={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => setPageSize(size)}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
              />
            </div>
          ) : null}
        </SectionCard>
      </div>

      {/* Styled Add/Edit Modal Dialog */}
      {isModalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(2, 6, 18, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{
              width: 'min(92vw, 600px)',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: 'var(--bg-card, #0f172a)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 24,
              padding: 26,
              boxShadow: '0 32px 96px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(52, 211, 153, 0.15)',
              position: 'relative',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 22,
                paddingBottom: 16,
                borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: 'var(--primary, #10b981)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.15)',
                    flexShrink: 0,
                  }}
                >
                  <CalendarDays size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--text-primary, #f8fafc)', letterSpacing: '-0.3px' }}>
                    {editingTerm
                      ? (lang === 'ar' ? 'تعديل الفصل الدراسي' : 'Edit Term')
                      : (lang === 'ar' ? 'إضافة فصل دراسي جديد' : 'Add New Academic Term')}
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.4 }}>
                    {lang === 'ar'
                      ? 'أدخل تفاصيل التيرم وتاريخ البداية والنهاية لضبط النظام'
                      : 'Enter term details, start/end dates, and study duration'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  background: 'var(--bg-dark, rgba(15, 23, 42, 0.6))',
                  color: 'var(--text-secondary, #94a3b8)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-dark, rgba(15, 23, 42, 0.6))';
                  e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)';
                  e.currentTarget.style.borderColor = 'var(--border, rgba(255,255,255,0.1))';
                }}
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <CustomInput
                label={lang === 'ar' ? 'اسم الفصل الدراسي *' : 'Term Name *'}
                type="text"
                required
                placeholder={lang === 'ar' ? 'مثال: الترم الأول 2026/2027' : 'e.g. First Term 2026/2027'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                <CustomInput
                  label={lang === 'ar' ? 'كود الترم *' : 'Term Code *'}
                  type="text"
                  required
                  disabled={Boolean(editingTerm)}
                  showLockIfDisabled={true}
                  placeholder="FIRST-2026-2027"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />

                <CustomInput
                  label={lang === 'ar' ? 'السنة الدراسية' : 'Academic Year'}
                  type="text"
                  placeholder="2026/2027"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                <CustomInput
                  label={lang === 'ar' ? 'تاريخ البداية' : 'Start Date'}
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value, isManualWeeks: false })}
                />

                <CustomInput
                  label={lang === 'ar' ? 'تاريخ النهاية' : 'End Date'}
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value, isManualWeeks: false })}
                />
              </div>

              <CustomInput
                label={
                  lang === 'ar'
                    ? `عدد أسابيع الدراسة (${formData.startDate && formData.endDate && !formData.isManualWeeks ? 'محسوبة آلياً' : 'محددة يدوياً'})`
                    : `Weeks Count (${formData.startDate && formData.endDate && !formData.isManualWeeks ? 'Computed' : 'Manual'})`
                }
                type="number"
                min="1"
                max="52"
                value={formData.weeksCount}
                onChange={(e) => setFormData({ ...formData, weeksCount: e.target.value, isManualWeeks: true })}
              />

              <div
                onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 16,
                  background: formData.isActive
                    ? 'rgba(16, 185, 129, 0.08)'
                    : 'var(--bg-dark, rgba(15, 23, 42, 0.4))',
                  border: formData.isActive
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : '1px solid var(--border, rgba(255,255,255,0.08))',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                  marginTop: 2,
                }}
              >
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 18,
                    height: 18,
                    cursor: 'pointer',
                    accentColor: 'var(--primary, #10b981)',
                    borderRadius: 6,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <label
                    htmlFor="isActiveCheck"
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: formData.isActive ? 'var(--primary, #10b981)' : 'var(--text-primary, #f8fafc)',
                      cursor: 'pointer',
                    }}
                  >
                    {lang === 'ar' ? 'تعيين هذا الترم كـ تيرم نشط رئيسي فوراً' : 'Set as current active term immediately'}
                  </label>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted, #64748b)' }}>
                    {lang === 'ar'
                      ? 'سيصبح هذا الترم هو الفصل المحدد لجميع عمليات التحضير بالنظام'
                      : 'This term will become active for all attendance operations'}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginTop: 8,
                  paddingTop: 16,
                  borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
                }}
              >
                <CustomBottom
                  type="button"
                  text={lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  onClick={() => setIsModalOpen(false)}
                  background="var(--bg-dark, rgba(15, 23, 42, 0.6))"
                  textColor="var(--text-primary, #f8fafc)"
                  border="1px solid var(--border, rgba(255,255,255,0.12))"
                />
                <CustomBottom
                  type="submit"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  text={
                    editingTerm
                      ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                      : (lang === 'ar' ? 'إضافة الترم' : 'Add Term')
                  }
                  background="linear-gradient(135deg, var(--primary, #10b981), #059669)"
                  textColor="#ffffff"
                />
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Confirmation Dialog for Activate */}
      <ConfirmationDialog
        isOpen={Boolean(activatingTerm)}
        onClose={() => setActivatingTerm(null)}
        onConfirm={handleConfirmActivate}
        tone="info"
        icon={Check}
        title={lang === 'ar' ? 'تأكيد تفعيل الفصل الدراسي' : 'Confirm Activate Term'}
        message={
          lang === 'ar'
            ? `هل أنت محتأكد من تعيين "${activatingTerm?.name}" كـ فصل دراسي نشط ورئيسي لكافة العمليات في النظام؟`
            : `Are you sure you want to set "${activatingTerm?.name}" as the active term for all system operations?`
        }
        confirmText={lang === 'ar' ? 'تفعيل' : 'Activate'}
        cancelText={lang === 'ar' ? 'إلغاء' : 'Cancel'}
      />

      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        isOpen={Boolean(deletingTerm)}
        onClose={() => setDeletingTerm(null)}
        onConfirm={handleConfirmDelete}
        title={lang === 'ar' ? 'تأكيد حذف الترم' : 'Confirm Delete Term'}
        message={
          lang === 'ar'
            ? `هل أنت محتأكد من حذف الفصل الدراسي "${deletingTerm?.name}"؟`
            : `Are you sure you want to delete term "${deletingTerm?.name}"?`
        }
        confirmText={lang === 'ar' ? 'حذف' : 'Delete'}
        cancelText={lang === 'ar' ? 'إلغاء' : 'Cancel'}
      />
    </div>
  );
};

export default TermsManagementPage;
