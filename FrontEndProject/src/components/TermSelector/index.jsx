import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarDays } from '../../assets/icons';
import CustomDropdown from '../CustomDropdown';
import { useLanguage } from '../../i18n';
import { fetchTerms, setSelectedTermCode } from '../../redux/slices/termsSlice';

const TermSelector = () => {
  const { lang } = useLanguage();
  const dispatch = useDispatch();
  const { terms, selectedTermCode, activeTerm } = useSelector((state) => state.terms);

  useEffect(() => {
    dispatch(fetchTerms());
  }, [dispatch]);

  const options = useMemo(() => {
    if (!terms || terms.length === 0) return [];

    return terms.map((term) => ({
      value: term.code,
      label: `${term.name} ${term.academicYear ? `(${term.academicYear})` : ''} ${term.isActive ? (lang === 'ar' ? '★ النشط حالياً' : '★ Active') : ''}`,
    }));
  }, [terms, lang]);

  const handleTermChange = (e) => {
    const code = e.target.value;
    if (code && code !== selectedTermCode) {
      dispatch(setSelectedTermCode(code));
      window.location.reload();
    }
  };

  if (!terms || terms.length === 0) {
    return null;
  }

  const currentTerm = terms.find((t) => t.code === selectedTermCode) || activeTerm || terms[0];

  return (
    <div style={{ width: '100%', minWidth: 200 }}>
      <CustomDropdown
        name="academic-term-selector"
        value={selectedTermCode || currentTerm?.code || ''}
        options={options}
        onChange={handleTermChange}
        placeholder={lang === 'ar' ? 'اختر الفصل الدراسي' : 'Select Term'}
        icon={<CalendarDays size={17} />}
        menuPlacement="auto"
      />
    </div>
  );
};

export default TermSelector;
