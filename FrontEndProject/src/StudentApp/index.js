import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLanguage } from '../i18n';
import AppHelmet from '../components/AppHelmet';
import { useAuth, useSocket } from '../hooks';
import { mnuLogo } from '../assets/images';
import { Activity, BookOpen, CalendarDays, Clock3, LayoutDashboard, QrCode, ScanLine, UserCircle2 } from '../assets/icons';
import { CustomDropdown, LanguageSwitcher, Pagination, ThemeToggle } from '../components';
import { FACULTY_CATALOG } from '../utils/constants';
import { attendanceAPI, authAPI } from '../utils/api';
import { extractApiData } from '../utils/apiHelpers';
import { buildAcademicWeekOptions } from '../utils/academicWeek';
import { fetchTerms, setSelectedTermCode } from '../redux/slices/termsSlice';
import ScanTab from './ScanTab';

// ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ Icons ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬
const CameraIcon = () => (
  <ScanLine size={24} />
);
const HistoryIcon = () => (
  <Activity size={24} />
);
const isHiddenPlaceholderSubject = (value) => {
  const normalized = String(value || '').trim();
  return /^[().\s]+$/.test(normalized) || /(?:^|\s-\s)[().\s]+$/.test(normalized);
};
const normalizeLectureType = (value) => {
  const normalized = String(value || '').trim();
  if (normalized.toLowerCase() === 'lecture') return 'Lecture';
  if (normalized.toLowerCase() === 'section') return 'Section';
  if (normalized.toLowerCase() === 'practical') return 'Practical';
  return normalized || 'Other';
};
const ProfileIcon = () => (
  <UserCircle2 size={24} />
);
const STUDENT_COPY = {
  en: {
    splashTitle: 'Welcome back',
    splashSubtitle: 'Preparing your attendance',
    splashFooter: 'All rights reserved to Information Technology Department 2026',
    scan: 'Scan QR',
    history: 'History',
    profile: 'Profile',
    studentProfile: 'Student Profile',
    historyTitle: 'History',
    historySubtitle: 'Your recent attendance records.',
    allRegisteredCourses: 'All registered courses',
    allWeeks: 'All weeks',
    week: 'Week',
    allTypes: 'All types',
    lecture: 'Lecture',
    section: 'Section',
    practical: 'Practical',
    other: 'Other',
    recordedSession: 'Recorded session',
    registeredCourse: 'Registered course',
    course: 'COURSE',
    chooseCourse: 'Choose course',
    chooseWeek: 'Choose week',
    chooseType: 'Choose type',
    attended: 'ATTENDED',
    absent: 'ABSENT',
    totalSessions: 'TOTAL SESSIONS',
    noRecords: 'No records match the selected filters.',
    fullName: 'Full name',
    studentId: 'Student ID',
    universityId: 'University ID',
    nationalId: 'National ID',
    emailLogin: 'Email / login',
    college: 'College',
    accountType: 'Account type',
    student: 'Student',
    attendanceRate: 'Attendance rate',
    registeredSubjects: 'Registered subjects',
    recordedSessionsLabel: 'Recorded sessions',
    lastScan: 'Last scan',
    studentInformation: 'Student information',
    studentInformationHelp: 'Live account fields used by login and attendance.',
    registeredSubjectsTitle: 'Registered subjects',
    registeredSubjectsHelp: 'Courses assigned to this student from the imported data.',
    groupPrefix: 'Group',
    absentPrefix: 'Absent',
    attendedPrefix: 'Attended',
    noRegisteredSubjects: 'No registered subjects yet.',
    language: 'Language',
    languageHelp: '{copy.languageHelp}',
    studentPortal: 'Student Portal',
    readyToScan: 'Ready to scan',
    studentSummary: 'Student',
    pageScan: 'Student QR Scan',
    pageHistory: 'Attendance History',
    pageProfile: 'Student Profile',
    profileDescription: (name) => `Profile screen for ${name}.`,
    historyDescription: (name) => `Attendance history screen for ${name}.`,
    scanDescription: (name) => `Student attendance scanning screen for ${name}.`,
  },
  ar: {
    splashTitle: '\u0645\u0631\u062d\u0628\u0627 \u0628\u0639\u0648\u062f\u062a\u0643',
    splashSubtitle: '\u062c\u0627\u0631\u064a \u062a\u062c\u0647\u064a\u0632 \u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u062d\u0636\u0648\u0631',
    splashFooter: '\u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629 \u0644\u0642\u0633\u0645 \u062a\u0643\u0646\u0648\u0644\u0648\u062c\u064a\u0627 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a 2026',
    scan: '\u0645\u0633\u062d QR',
    history: '\u0627\u0644\u0633\u062c\u0644',
    profile: '\u0627\u0644\u0645\u0644\u0641',
    studentProfile: '\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a \u0644\u0644\u0637\u0627\u0644\u0628',
    historyTitle: '\u0633\u062c\u0644 \u0627\u0644\u062d\u0636\u0648\u0631',
    historySubtitle: '\u0623\u062d\u062f\u062b \u0633\u062c\u0644\u0627\u062a \u062d\u0636\u0648\u0631\u0643.',
    allRegisteredCourses: '\u0643\u0644 \u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a \u0627\u0644\u0645\u0633\u062c\u0644\u0629',
    allWeeks: '\u0643\u0644 \u0627\u0644\u0623\u0633\u0627\u0628\u064a\u0639',
    week: '\u0627\u0644\u0623\u0633\u0628\u0648\u0639',
    allTypes: '\u0643\u0644 \u0627\u0644\u0623\u0646\u0648\u0627\u0639',
    lecture: '\u0645\u062d\u0627\u0636\u0631\u0629',
    section: '\u0633\u0643\u0634\u0646',
    practical: '\u0639\u0645\u0644\u064a',
    other: '\u0622\u062e\u0631',
    recordedSession: '\u062c\u0644\u0633\u0629 \u0645\u0633\u062c\u0644\u0629',
    registeredCourse: '\u0645\u0642\u0631\u0631 \u0645\u0633\u062c\u0644',
    course: '\u0627\u0644\u0645\u0642\u0631\u0631',
    chooseCourse: '\u0627\u062e\u062a\u0631 \u0645\u0642\u0631\u0631\u0627',
    chooseWeek: '\u0627\u062e\u062a\u0631 \u0623\u0633\u0628\u0648\u0639\u0627',
    chooseType: '\u0627\u062e\u062a\u0631 \u0646\u0648\u0639\u0627',
    attended: '\u062d\u0636\u0631',
    absent: '\u063a\u0627\u0628',
    totalSessions: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062c\u0644\u0633\u0627\u062a',
    noRecords: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0633\u062c\u0644\u0627\u062a \u062a\u0637\u0627\u0628\u0642 \u0627\u0644\u0641\u0644\u0627\u062a\u0631 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.',
    fullName: '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644',
    studentId: '\u0631\u0642\u0645 \u0627\u0644\u0637\u0627\u0644\u0628',
    universityId: '\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u062c\u0627\u0645\u0639\u064a',
    nationalId: '\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0642\u0648\u0645\u064a',
    emailLogin: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a / \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
    college: '\u0627\u0644\u0643\u0644\u064a\u0629',
    accountType: '\u0646\u0648\u0639 \u0627\u0644\u062d\u0633\u0627\u0628',
    student: '\u0637\u0627\u0644\u0628',
    attendanceRate: '\u0646\u0633\u0628\u0629 \u0627\u0644\u062d\u0636\u0648\u0631',
    registeredSubjects: '\u0627\u0644\u0645\u0648\u0627\u062f \u0627\u0644\u0645\u0633\u062c\u0644\u0629',
    recordedSessionsLabel: '\u0627\u0644\u062c\u0644\u0633\u0627\u062a \u0627\u0644\u0645\u0633\u062c\u0644\u0629',
    lastScan: '\u0622\u062e\u0631 \u0645\u0633\u062d\u0629',
    studentInformation: '\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0637\u0627\u0644\u0628',
    studentInformationHelp: '\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629 \u0641\u064a \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0648\u0627\u0644\u062d\u0636\u0648\u0631.',
    registeredSubjectsTitle: '\u0627\u0644\u0645\u0648\u0627\u062f \u0627\u0644\u0645\u0633\u062c\u0644\u0629',
    registeredSubjectsHelp: '\u0627\u0644\u0645\u0642\u0631\u0631\u0627\u062a \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0637\u0627\u0644\u0628 \u0645\u0646 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u0648\u0631\u062f\u0629.',
    groupPrefix: '\u062c\u0631\u0648\u0628',
    absentPrefix: '\u063a\u064a\u0627\u0628',
    attendedPrefix: '\u062d\u0636\u0648\u0631',
    noRegisteredSubjects: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0648\u0627\u062f \u0645\u0633\u062c\u0644\u0629 \u062d\u062a\u0649 \u0627\u0644\u0622\u0646.',
    language: '\u0627\u0644\u0644\u063a\u0629',
    languageHelp: '\u063a\u064a\u0631 \u0644\u063a\u0629 \u062a\u0637\u0628\u064a\u0642 \u0627\u0644\u0637\u0627\u0644\u0628 \u0645\u0646 \u0634\u0627\u0634\u0629 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a.',
    studentPortal: '\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0637\u0627\u0644\u0628',
    readyToScan: '\u062c\u0627\u0647\u0632 \u0644\u0644\u0645\u0633\u062d',
    studentSummary: '\u0637\u0627\u0644\u0628',
    pageScan: '\u0645\u0633\u062d QR \u0644\u0644\u0637\u0627\u0644\u0628',
    pageHistory: '\u0633\u062c\u0644 \u0627\u0644\u062d\u0636\u0648\u0631',
    pageProfile: '\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a \u0644\u0644\u0637\u0627\u0644\u0628',
    profileDescription: (name) => `\u0634\u0627\u0634\u0629 \u0645\u0644\u0641 \u0627\u0644\u0637\u0627\u0644\u0628 ${name}.`,
    historyDescription: (name) => `\u0634\u0627\u0634\u0629 \u0633\u062c\u0644 \u062d\u0636\u0648\u0631 \u0627\u0644\u0637\u0627\u0644\u0628 ${name}.`,
    scanDescription: (name) => `\u0634\u0627\u0634\u0629 \u0645\u0633\u062d \u0627\u0644\u062d\u0636\u0648\u0631 \u0644\u0644\u0637\u0627\u0644\u0628 ${name}.`,
  },
};

const StudentSplash = ({ lang, theme = 'dark' }) => {
  const copy = STUDENT_COPY[lang === 'ar' ? 'ar' : 'en'];
  const isLightTheme = theme === 'light';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999, width: '100vw', height: '100dvh', minHeight: '100svh',
      display: 'grid', gridTemplateRows: '1fr auto', alignItems: 'center', justifyItems: 'center',
      padding: 'clamp(28px, 7vh, 52px) 16px calc(14px + env(safe-area-inset-bottom, 0px))',
      background: isLightTheme
        ? 'linear-gradient(160deg, #f8fafc, #eff6ff 52%, #ecfdf5)'
        : 'linear-gradient(160deg, #08131c, #0f1923 52%, #123f36)',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: isLightTheme
          ? 'linear-gradient(120deg, rgba(255,255,255,0.7), transparent 38%, rgba(20,184,166,0.12))'
          : 'linear-gradient(120deg, rgba(255,255,255,0.08), transparent 38%, rgba(52,211,153,0.13))'
      }} />
      <div className="student-splash-content" style={{
        position: 'relative', width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 18, minHeight: 0, animation: 'studentSplashIn 1.15s ease both'
      }}>
        <div style={{
          width: 'min(168px, 44vw, 25vh)', aspectRatio: '1 / 1', borderRadius: 28, padding: 16,
          background: isLightTheme ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.08)',
          border: isLightTheme ? '1px solid rgba(148,163,184,0.18)' : '1px solid rgba(255,255,255,0.14)',
          boxShadow: isLightTheme
            ? '0 24px 56px rgba(15,23,42,0.12), 0 0 36px rgba(20,184,166,0.08)'
            : '0 24px 56px rgba(0,0,0,0.32), 0 0 36px rgba(52,211,153,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'studentLogoPulse 1.15s ease both'
        }}>
          <img src={mnuLogo} alt="MNU" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: isLightTheme ? '#0f172a' : '#fff', fontSize: 21, fontWeight: 800, letterSpacing: 0 }}>
            {copy.splashTitle}
          </div>
          <div style={{ marginTop: 6, color: isLightTheme ? '#475569' : 'rgba(232,244,240,0.72)', fontSize: 13, fontWeight: 700 }}>
            {copy.splashSubtitle}
          </div>
        </div>
        <div style={{ width: 'min(150px, 52vw)', height: 4, borderRadius: 8, background: isLightTheme ? 'rgba(148,163,184,0.2)' : 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', animation: 'studentSplashBar 1.1s ease both' }} />
        </div>
      </div>
      <div style={{
        position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center',
        animation: 'studentSplashFooter 1.15s ease both'
      }}>
        <div style={{
          width: 'min(100%, 376px)', minHeight: 48, padding: '10px 12px', borderRadius: 8,
          background: isLightTheme
            ? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(241,245,249,0.94))'
            : 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
          border: isLightTheme ? '1px solid rgba(148,163,184,0.18)' : '1px solid rgba(255,255,255,0.16)',
          boxShadow: isLightTheme
            ? '0 12px 32px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.78)'
            : '0 12px 32px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.1)',
          backdropFilter: 'blur(16px)', display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'center',
          gap: 10, color: isLightTheme ? '#334155' : 'rgba(232,244,240,0.9)', fontSize: 'clamp(10px, 2.8vw, 11.5px)',
          lineHeight: 1.45, fontWeight: 800, textAlign: 'start'
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: isLightTheme ? 'rgba(20,184,166,0.1)' : 'rgba(52,211,153,0.14)',
            border: isLightTheme ? '1px solid rgba(20,184,166,0.18)' : '1px solid rgba(52,211,153,0.24)',
            boxShadow: isLightTheme ? '0 0 18px rgba(20,184,166,0.12)' : '0 0 18px rgba(52,211,153,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: 2, background: 'var(--accent)',
              boxShadow: '0 0 14px rgba(52,211,153,0.7)'
            }} />
          </span>
          <span style={{
            minWidth: 0, overflowWrap: 'anywhere', textAlign: lang === 'ar' ? 'right' : 'left',
            direction: lang === 'ar' ? 'rtl' : 'ltr'
          }}>
            {copy.splashFooter}
          </span>
        </div>
      </div>
      <style>{`
        @keyframes studentSplashIn {
          0% { opacity: 0; transform: translateY(16px) scale(0.94); }
          45% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-10px) scale(1.03); }
        }
        @keyframes studentLogoPulse {
          0% { transform: scale(0.82) rotate(-4deg); }
          55% { transform: scale(1.04) rotate(0deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes studentSplashBar {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes studentSplashFooter {
          0% { opacity: 0; transform: translateY(10px); }
          35% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(4px); }
        }
        @media (max-height: 620px) {
          .student-splash-content {
            gap: 14px !important;
          }
        }
      `}</style>
    </div>
  );
};
const useIsDesktop = () => {
  const getValue = () => (
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 900px)').matches
      : false
  );
  const [isDesktop, setIsDesktop] = useState(getValue);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(min-width: 900px)');
    const handleChange = () => setIsDesktop(mediaQuery.matches);

    handleChange();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isDesktop;
};

const HistoryTab = ({ user, lang, attendanceTerm, attendanceRecords = [], loading = false }) => {
  const isArabic = lang === 'ar';
  const copy = STUDENT_COPY[isArabic ? 'ar' : 'en'];
  const [courseFilter, setCourseFilter] = useState('all');
  const [weekFilter, setWeekFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(5);
  const [isMobileFilters, setIsMobileFilters] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const handleChange = () => setIsMobileFilters(mediaQuery.matches);
    handleChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const courseCatalog = useMemo(() => (
    FACULTY_CATALOG.flatMap((faculty) => faculty.colleges.flatMap((college) => college.courses))
  ), []);

  const getCourseName = useCallback((subjectCode) => (
    courseCatalog.find((course) => course.id === subjectCode)?.name || subjectCode
  ), [courseCatalog]);

  const registeredSubjects = useMemo(() => {
    const records = user?.registrations || [];
    const map = new Map();

    records.forEach((registration) => {
      const subjectCode = String(registration.subjectCode || '').trim().toUpperCase();
      if (!subjectCode || isHiddenPlaceholderSubject(subjectCode)) return;

      const subjectName = String(registration.subjectName || '').trim();
      if (isHiddenPlaceholderSubject(subjectName)) return;

      const type = normalizeLectureType(registration.type);
      const group = String(registration.group || '').trim().toUpperCase();
      const key = `${subjectCode}__${type}__${group}`;

      if (!map.has(key)) {
        map.set(key, {
          subjectCode,
          courseName: subjectName || getCourseName(subjectCode),
          type,
          group,
        });
      }
    });

    return [...map.values()];
  }, [getCourseName, user?.registrations]);

  const courseOptions = useMemo(() => {
    const map = new Map();

    registeredSubjects.forEach((subject) => {
      if (!map.has(subject.subjectCode)) {
        map.set(subject.subjectCode, {
          value: subject.subjectCode,
          label: subject.courseName,
        });
      }
    });

    return [
      { value: 'all', label: copy.allRegisteredCourses },
      ...[...map.values()].sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [copy.allRegisteredCourses, registeredSubjects]);

  const weekOptions = useMemo(
    () => buildAcademicWeekOptions(copy.week, attendanceTerm),
    [attendanceTerm, copy.week],
  );

  useEffect(() => {
    if (courseFilter !== 'all' && !courseOptions.some((option) => option.value === courseFilter)) {
      setCourseFilter('all');
    }
  }, [courseFilter, courseOptions]);

  useEffect(() => {
    if (weekFilter !== 'all' && !weekOptions.some((option) => option.value === weekFilter)) {
      setWeekFilter('all');
    }
  }, [weekFilter, weekOptions]);

  const typeOptions = useMemo(() => [
    { value: 'all', label: copy.allTypes },
    { value: 'Lecture', label: copy.lecture },
    { value: 'Section', label: copy.section },
    { value: 'Practical', label: copy.practical },
    { value: 'Other', label: copy.other },
  ], [copy.allTypes, copy.lecture, copy.other, copy.practical, copy.section]);
  const historyRecords = useMemo(() => {
    if (Array.isArray(attendanceRecords)) {
      return attendanceRecords.map((record) => {
        const subjectCode = String(record.courseCode || record.course || '').trim().toUpperCase();
        return {
          id: record.id || record.sessionId || `${subjectCode}-${record.week}-${record.type}`,
          course: subjectCode,
          name: String(record.subjectName || '').trim() || getCourseName(subjectCode),
          type: record.lectureType || record.type || 'Other',
          group: record.group || '',
          week: record.week || '',
          date: record.date || '',
          time: record.time || '-',
          status: record.status || 'absent',
        };
      }).filter((record) => !isHiddenPlaceholderSubject(record.name));
    }

    // Enrollment is not an attendance outcome. While the API is loading or
    // unavailable, keep history empty instead of fabricating yellow cards.
    return [];
  }, [attendanceRecords, getCourseName]);

  const filteredHistory = useMemo(
    () => historyRecords.filter((session) => {
      const matchesWeek = weekFilter === 'all' || String(session.week) === weekFilter;
      const matchesCourse = courseFilter === 'all' || session.course === courseFilter;
      const normalizedType = ['Lecture', 'Section', 'Practical'].includes(session.type) ? session.type : 'Other';
      const matchesType = typeFilter === 'all' || normalizedType === typeFilter;
      return matchesWeek && matchesCourse && matchesType;
    }),
    [courseFilter, historyRecords, typeFilter, weekFilter],
  );

  const attendedCount = filteredHistory.filter((session) => session.status === 'present').length;
  const absentCount = filteredHistory.filter((session) => session.status === 'absent').length;
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistory.slice(start, start + historyPageSize);
  }, [filteredHistory, historyPage, historyPageSize]);

  useEffect(() => {
    setHistoryPage(1);
  }, [courseFilter, weekFilter, typeFilter, historyPageSize]);

  useEffect(() => {
    if (historyPage > historyTotalPages) setHistoryPage(historyTotalPages);
  }, [historyPage, historyTotalPages]);


  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      overflowX: 'hidden',
      padding: isMobileFilters ? '14px 12px 50px' : 'clamp(16px, 4vw, 28px)',
      minHeight: '100%',
      overflowY: 'visible',
    }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, marginTop: 10 }}>
        {copy.historyTitle}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
        {copy.historySubtitle}
      </p>

      <div style={{
        marginBottom: 18,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        padding: isMobileFilters ? 12 : 14,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-card2)',
        display: 'grid',
        gridTemplateColumns: isMobileFilters ? '1fr' : 'repeat(3, minmax(0, 1fr))',
        gap: isMobileFilters ? 12 : 10,
        overflow: 'visible',
      }}>
        <CustomDropdown
          id="history-course-filter"
          name="historyCourseFilter"
          label={copy.course}
          value={courseFilter}
          onChange={(event) => setCourseFilter(event.target.value)}
          placeholder={copy.chooseCourse}
          icon={() => <BookOpen size={16} />}
          options={courseOptions}
        />
        <CustomDropdown
          id="history-week-filter"
          name="historyWeekFilter"
          label={copy.week}
          value={weekFilter}
          onChange={(event) => setWeekFilter(event.target.value)}
          placeholder={copy.chooseWeek}
          icon={() => <CalendarDays size={16} />}
          options={[
            { value: 'all', label: copy.allWeeks },
            ...weekOptions,
          ]}
        />
        <CustomDropdown
          id="history-type-filter"
          name="historyTypeFilter"
          label={isArabic ? '\u0627\u0644\u0646\u0648\u0639' : 'TYPE'}
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          placeholder={copy.chooseType}
          icon={() => <Activity size={16} />}
          options={typeOptions}
        />
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobileFilters ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 24, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', padding: 16, borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#34d399', marginBottom: 4 }}>{copy.attended}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>{attendedCount}</div>
        </div>
        <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', padding: 16, borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#f87171', marginBottom: 4 }}>{copy.absent}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>{absentCount}</div>
        </div>
        <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', padding: 16, borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#60a5fa', marginBottom: 4 }}>{copy.totalSessions}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>{filteredHistory.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {paginatedHistory.map(session => (
          <div key={session.id} style={{
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            background: session.status === 'present'
              ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(255,255,255,0.025))'
              : 'linear-gradient(135deg, rgba(248,113,113,0.10), rgba(255,255,255,0.025))',
            padding: isMobileFilters ? 16 : 18,
            borderRadius: 18,
            border: session.status === 'present' ? '1px solid rgba(52,211,153,0.24)' : '1px solid rgba(248,113,113,0.24)',
            boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
            display: 'flex',
            flexDirection: isMobileFilters ? 'column' : 'row',
            alignItems: isMobileFilters ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: isMobileFilters ? 12 : 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{
                width: isMobileFilters ? 52 : 58,
                minWidth: isMobileFilters ? 52 : 58,
                height: isMobileFilters ? 52 : 58,
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 11,
                background: session.status === 'present' ? 'rgba(52,211,153,0.15)' : session.status === 'absent' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)',
                color: session.status === 'present' ? '#34d399' : session.status === 'absent' ? '#f87171' : '#fbbf24',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, lineHeight: 1 }}>
                  <span style={{ fontSize: 18 }} aria-label={session.status === 'present' ? 'Present' : 'Absent'}>
                    {session.status === 'present' ? '✓' : '!'}
                  </span>
                  <span style={{ fontSize: isArabic ? 10 : 8, fontWeight: 850, letterSpacing: isArabic ? 0 : '0.03em' }}>
                    {session.status === 'present' ? copy.attended : session.status === 'absent' ? copy.absent : session.status}
                  </span>
                </div>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 10, wordBreak: 'break-word', lineHeight: 1.25 }}>
                  {session.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, width: '100%', marginBottom: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 9, background: 'rgba(59,130,246,0.12)', color: '#60a5fa', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                    <BookOpen size={12} />
                    {session.type === 'Lecture' ? copy.lecture : session.type === 'Section' ? copy.section : session.type === 'Practical' ? copy.practical : session.type}
                  </span>
                  <span style={{ padding: '5px 9px', borderRadius: 9, background: 'rgba(139,92,246,0.12)', color: '#a78bfa', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {copy.groupPrefix} {session.group || '—'}
                  </span>
                  {session.week ? (
                    <span style={{ padding: '5px 9px', borderRadius: 9, background: 'rgba(148,163,184,0.12)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {copy.week} {session.week}
                    </span>
                  ) : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', fontSize: 11, color: 'var(--text-muted)', fontWeight: 650 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CalendarDays size={13} /> {session.date || '—'}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock3 size={13} /> {session.time}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredHistory.length === 0 ? (
          <div style={{
            borderRadius: 14,
            border: '1px dashed var(--border)',
            background: 'rgba(255,255,255,0.02)',
            padding: 20,
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
            fontWeight: 700,
          }}>
            {copy.noRecords}
          </div>
        ) : null}
      </div>

      <Pagination
        id="student-history-pagination"
        className="mt-5"
        currentPage={historyPage}
        totalPages={historyTotalPages}
        onPageChange={setHistoryPage}
        pageSize={historyPageSize}
        onPageSizeChange={setHistoryPageSize}
        pageSizeOptions={[5, 10, 20]}
        compact={isMobileFilters}
      />
    </div>
  );
};

const ProfileTab = ({
  user,
  updateUser,
  readOnly = false,
  lang,
  theme = 'dark',
  attendanceRecords = [],
  terms = [],
  selectedTermCode,
  activeTerm,
  onTermChange,
}) => {
  const inputRef = useRef(null);
  const [uploadError, setUploadError] = useState('');
  const [isCompactProfile, setIsCompactProfile] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 720px)').matches : false,
  );
  const isArabic = lang === 'ar';
  const isLightTheme = theme === 'light';
  const copy = STUDENT_COPY[isArabic ? 'ar' : 'en'];

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 720px)');
    const handleChange = () => setIsCompactProfile(mediaQuery.matches);
    handleChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const courseCatalog = useMemo(() => (
    FACULTY_CATALOG.flatMap((faculty) => faculty.colleges.flatMap((college) => college.courses))
  ), []);

  const getCourseName = useCallback((subjectCode) => (
    courseCatalog.find((course) => course.id === subjectCode)?.name || subjectCode
  ), [courseCatalog]);

  const registeredSubjects = useMemo(() => {
    const map = new Map();
    (user?.registrations || []).forEach((registration) => {
      const subjectCode = String(registration.subjectCode || '').trim().toUpperCase();
      if (!subjectCode || isHiddenPlaceholderSubject(subjectCode)) return;
      const subjectName = String(registration.subjectName || '').trim();
      if (isHiddenPlaceholderSubject(subjectName)) return;
      const type = normalizeLectureType(registration.type);
      const group = String(registration.group || '').trim().toUpperCase();
      const key = `${subjectCode}__${type}__${group}`;
      if (!map.has(key)) {
        map.set(key, {
          subjectCode,
          courseName: subjectName || getCourseName(subjectCode),
          type,
          group,
        });
      }
    });
    return [...map.values()];
  }, [getCourseName, user?.registrations]);

  const subjectProfileCards = useMemo(() => {
    const grouped = new Map();

    registeredSubjects.forEach((subject) => {
      const key = subject.subjectCode;
      const existing = grouped.get(key);

      if (existing) {
        existing.types.add(subject.type);
        if (subject.group) existing.groups.add(subject.group);
        return;
      }

      grouped.set(key, {
        key,
        subjectCode: subject.subjectCode,
        courseName: subject.courseName,
        groups: new Set(subject.group ? [subject.group] : []),
        types: new Set([subject.type]),
      });
    });

    return [...grouped.values()].map((subject) => ({
      ...subject,
      types: [...subject.types],
      groups: [...subject.groups],
    }));
  }, [registeredSubjects]);

  const subjectAttendanceSummaries = useMemo(() => {
    const recordsBySubject = new Map();
    (Array.isArray(attendanceRecords) ? attendanceRecords : []).forEach((record) => {
      const code = String(record.courseCode || record.course || '').trim().toUpperCase();
      if (!code) return;
      if (!recordsBySubject.has(code)) recordsBySubject.set(code, []);
      recordsBySubject.get(code).push(record);
    });

    return subjectProfileCards.reduce((accumulator, subject) => {
      const weeklyResults = new Map();
      (recordsBySubject.get(subject.subjectCode) || []).forEach((record) => {
        const type = normalizeLectureType(record.lectureType || record.type);
        if (!subject.types.includes(type)) return;
        const week = String(record.week || '').trim();
        const fallbackId = String(record.sessionId || record.id || '').trim();
        const slotKey = `${type}__${week ? `week-${week}` : `record-${fallbackId}`}`;
        const status = record.status === 'present' ? 'present' : 'absent';
        if (!weeklyResults.has(slotKey) || status === 'present') {
          weeklyResults.set(slotKey, status);
        }
      });

      const total = weeklyResults.size;
      const attended = [...weeklyResults.values()].filter((status) => status === 'present').length;
      const absent = Math.max(0, total - attended);
      accumulator[subject.key] = {
        total,
        attended,
        absent,
        attendanceRate: total ? Math.round((attended / total) * 100) : 0,
        absenceRate: total ? Math.round((absent / total) * 100) : 0,
      };
      return accumulator;
    }, {});
  }, [attendanceRecords, subjectProfileCards]);

  const attendanceSummary = useMemo(() => {
    const records = Array.isArray(attendanceRecords) ? attendanceRecords : [];
    const attended = records.filter((record) => record.status === 'present').length;
    const latestPresent = records.find((record) => record.status === 'present');

    return {
      total: records.length,
      attended,
      rate: records.length ? Math.round((attended / records.length) * 100) : 0,
      lastScan: latestPresent?.time || latestPresent?.scannedAt || '-',
    };
  }, [attendanceRecords]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateUser({ profileImage: reader.result });
      setUploadError('');
    };
    reader.onerror = () => {
      setUploadError('Could not load the image. Try again.');
    };
    reader.readAsDataURL(file);
  };

  const profileDetails = [
    { label: copy.fullName, value: user?.name || '-' },
    { label: copy.studentId, value: user?.studentId || user?.id || '-' },
    { label: copy.universityId, value: user?.universityId || '-' },
    { label: copy.nationalId, value: user?.nationalId || '-' },
    { label: copy.emailLogin, value: user?.email || '-' },
    { label: copy.college, value: user?.college || '-' },
    { label: copy.accountType, value: copy.student },
  ];

  const profileStats = [
    { label: copy.attendanceRate, value: `${attendanceSummary.rate}%`, tone: '#34d399' },
    { label: copy.registeredSubjects, value: subjectProfileCards.length, tone: '#60a5fa' },
    { label: copy.recordedSessionsLabel, value: attendanceSummary.total, tone: '#fbbf24' },
    { label: copy.lastScan, value: attendanceSummary.lastScan, tone: '#c084fc' },
  ];
  const termOptions = terms.map((term) => ({
    value: term.code,
    label: `${term.name}${term.isActive ? (isArabic ? ' (الترم النشط)' : ' (Active term)') : ''}`,
  }));
  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} style={{
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      overflowX: 'hidden',
      padding: isCompactProfile ? '14px 12px 54px' : 'clamp(16px, 4vw, 34px)',
      minHeight: '100%',
      overflowY: 'visible',
    }}>
      <section style={{
        borderRadius: 8,
        border: isLightTheme ? '1px solid rgba(148,163,184,0.18)' : '1px solid var(--border)',
        background: isLightTheme
          ? (isCompactProfile
            ? 'linear-gradient(180deg, rgba(236,253,245,0.98), rgba(239,246,255,0.98))'
            : 'linear-gradient(135deg, rgba(236,253,245,0.98), rgba(239,246,255,0.98))')
          : (isCompactProfile
            ? 'linear-gradient(180deg, rgba(22,101,52,0.34), rgba(15,23,42,0.92))'
            : 'linear-gradient(135deg, rgba(22,101,52,0.34), rgba(15,23,42,0.84))'),
        padding: isCompactProfile ? 14 : 'clamp(20px, 3vw, 30px)',
        display: 'grid',
        gridTemplateColumns: isCompactProfile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: isCompactProfile ? 14 : 22,
        alignItems: 'center',
        boxShadow: isLightTheme ? '0 18px 36px rgba(15,23,42,0.08)' : 'var(--shadow-sm)',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isCompactProfile ? 'column' : (isArabic ? 'row-reverse' : 'row'),
          alignItems: isCompactProfile ? 'center' : 'center',
          textAlign: isCompactProfile ? 'center' : (isArabic ? 'right' : 'left'),
          direction: isArabic ? 'rtl' : 'ltr',
          gap: isCompactProfile ? 12 : 16,
          minWidth: 0,
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <StudentAvatar user={user} size={isCompactProfile ? 88 : 104} radius={8} />
            {!readOnly ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                aria-label="Add profile photo"
                style={{
                position: 'absolute',
                right: isCompactProfile ? -7 : -8,
                bottom: isCompactProfile ? -7 : -8,
                width: isCompactProfile ? 34 : 38,
                height: isCompactProfile ? 34 : 38,
                borderRadius: 8,
                border: isLightTheme ? '1px solid rgba(13,148,136,0.18)' : '1px solid rgba(255,255,255,0.2)',
                background: isLightTheme ? 'linear-gradient(135deg, #14b8a6, #22c55e)' : 'var(--accent)',
                color: isLightTheme ? '#ffffff' : '#07311f',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                boxShadow: isLightTheme ? '0 12px 24px rgba(20,184,166,0.22)' : '0 12px 24px rgba(0,0,0,0.25)',
              }}
            >
                <CameraIcon />
              </button>
            ) : null}
          </div>
          <div style={{ minWidth: 0, width: '100%' }}>
            <div style={{
              color: isLightTheme ? '#0f766e' : 'rgba(255,255,255,0.72)',
              fontSize: 12,
              fontWeight: 900,
              textTransform: isArabic ? 'none' : 'uppercase',
            }}>
              {isArabic ? 'ملف الطالب' : 'Student Profile'}
            </div>
            <h2 style={{ margin: '7px 0 0', color: isLightTheme ? '#0f172a' : '#fff', fontSize: isCompactProfile ? 23 : 28, lineHeight: 1.12, fontWeight: 900, overflowWrap: 'anywhere' }}>
              {user?.name || 'Student'}
            </h2>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: isCompactProfile ? 'center' : 'flex-start' }}>
              {[user?.universityId ? `University ID ${user.universityId}` : null, user?.nationalId ? `National ID ${user.nationalId}` : null, user?.college || null].filter(Boolean).map((item) => (
                <span key={item} style={{
                  borderRadius: 8,
                  border: isLightTheme ? '1px solid rgba(148,163,184,0.18)' : '1px solid rgba(255,255,255,0.18)',
                  background: isLightTheme ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.08)',
                  color: isLightTheme ? '#334155' : 'rgba(255,255,255,0.86)',
                  padding: '7px 10px',
                  fontSize: isCompactProfile ? 11 : 12,
                  fontWeight: 800,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isCompactProfile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: isCompactProfile ? 8 : 10, width: '100%', minWidth: 0 }}>
          {profileStats.map((stat) => (
            <div key={stat.label} style={{
              minHeight: isCompactProfile ? 82 : 96,
              borderRadius: 8,
              border: isLightTheme ? '1px solid rgba(148,163,184,0.16)' : '1px solid rgba(255,255,255,0.14)',
              background: isLightTheme ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.075)',
              padding: isCompactProfile ? 11 : 14,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minWidth: 0,
            }}>
              <strong style={{ color: stat.tone, fontSize: stat.label === 'Last scan' ? (isCompactProfile ? 15 : 20) : (isCompactProfile ? 23 : 28), lineHeight: 1, fontWeight: 900, wordBreak: 'break-word' }}>{stat.value}</strong>
              <span style={{ marginTop: 9, color: isLightTheme ? '#64748b' : 'rgba(255,255,255,0.7)', fontSize: isCompactProfile ? 10 : 11, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.2 }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {termOptions.length ? (
          <div
            dir={isArabic ? 'rtl' : 'ltr'}
            style={{
              gridColumn: '1 / -1',
              width: '100%',
              minWidth: 0,
              marginTop: isCompactProfile ? 2 : 4,
              textAlign: isArabic ? 'right' : 'left',
            }}
          >
            <CustomDropdown
              id="student-profile-term"
              name="student-profile-term"
              label={isArabic ? 'عرض بيانات الترم' : 'View term data'}
              value={selectedTermCode || activeTerm?.code || ''}
              options={termOptions}
              onChange={(event) => onTermChange(event.target.value)}
              icon={() => <CalendarDays size={16} />}
              menuPlacement="bottom"
            />
          </div>
        ) : null}

        {!readOnly ? <input ref={inputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} /> : null}
        {uploadError ? (
          <div style={{ gridColumn: '1 / -1', color: isLightTheme ? '#dc2626' : '#fecaca', fontSize: 12, fontWeight: 800 }}>{uploadError}</div>
        ) : null}
      </section>

      <section style={{
        marginTop: isCompactProfile ? 12 : 18,
        display: 'grid',
        gridTemplateColumns: isCompactProfile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: isCompactProfile ? 12 : 18,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card2)', overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 18, fontWeight: 900 }}>{copy.studentInformation}</h3>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>{copy.studentInformationHelp}</p>
          </div>
          {profileDetails.map((detail, index) => (
            <div key={detail.label} style={{
              padding: isCompactProfile ? '12px 14px' : '14px 16px',
              borderTop: index === 0 ? 'none' : '1px solid var(--border)',
              display: 'flex',
              flexDirection: isCompactProfile ? 'column' : 'row',
              alignItems: isCompactProfile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: isCompactProfile ? 6 : 16,
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 800 }}>{detail.label}</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: 13, textAlign: isCompactProfile || isArabic ? 'left' : 'right', wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>{detail.value}</strong>
            </div>
          ))}
        </div>

        <div style={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card2)', overflow: 'hidden' }}>
          <div style={{
            padding: 16,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 18, fontWeight: 900 }}>{copy.registeredSubjectsTitle}</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>{copy.registeredSubjectsHelp}</p>
            </div>
            <span style={{
              flexShrink: 0,
              minWidth: 34,
              padding: '6px 9px',
              borderRadius: 999,
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.24)',
              color: '#86efac',
              fontSize: 12,
              fontWeight: 900,
              textAlign: 'center',
            }}>
              {subjectProfileCards.length}
            </span>
          </div>
          <div style={{ padding: isCompactProfile ? 12 : 14, display: 'grid', gap: 12 }}>
            {subjectProfileCards.length ? subjectProfileCards.map((subject) => {
              const summary = subjectAttendanceSummaries[subject.key] || {
                total: 0,
                attended: 0,
                absent: 0,
                attendanceRate: 0,
                absenceRate: 0,
              };

              return (
                <article key={subject.key} style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 14,
                  border: '1px solid rgba(148,163,184,0.18)',
                  background: 'linear-gradient(135deg, rgba(52,211,153,0.075), rgba(59,130,246,0.045))',
                  padding: isCompactProfile ? 13 : 15,
                  display: 'grid',
                  gap: 13,
                  minWidth: 0,
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    [isArabic ? 'right' : 'left']: 0,
                    width: 4,
                    background: 'linear-gradient(180deg, #34d399, #60a5fa)',
                  }} />
                  <div style={{
                    display: 'flex',
                    flexDirection: isCompactProfile ? 'column' : 'row',
                    alignItems: isCompactProfile ? 'flex-start' : 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    paddingInlineStart: 5,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                        {subject.courseName}
                      </strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
                        <span style={{ borderRadius: 999, background: 'rgba(96,165,250,0.12)', color: '#93c5fd', padding: '4px 8px', fontSize: 11, fontWeight: 800 }}>
                          {subject.types.join(' + ')}
                        </span>
                        {subject.groups.length ? (
                          <span style={{ borderRadius: 999, background: 'rgba(251,191,36,0.12)', color: '#fcd34d', padding: '4px 8px', fontSize: 11, fontWeight: 800 }}>
                            {copy.groupPrefix} {subject.groups.join(' + ')}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div style={{ paddingInlineStart: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, color: 'var(--text-muted)', fontSize: 11, fontWeight: 800 }}>
                      <span>{copy.attendanceRate}</span>
                      <strong style={{ color: '#86efac', fontSize: 15, direction: 'ltr' }}>{summary.attendanceRate}%</strong>
                    </div>
                    <div style={{ height: 7, overflow: 'hidden', marginTop: 7, borderRadius: 999, background: 'rgba(148,163,184,0.16)' }}>
                      <div style={{ width: `${summary.attendanceRate}%`, height: '100%', borderRadius: 'inherit', background: 'linear-gradient(90deg, #34d399, #60a5fa)', transition: 'width 220ms ease' }} />
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 8,
                    paddingInlineStart: 5,
                  }}>
                    <div style={{ borderRadius: 10, padding: '8px 10px', background: 'rgba(52,211,153,0.07)' }}>
                      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, fontWeight: 800 }}>{copy.attended}</span>
                      <strong style={{ display: 'block', marginTop: 3, color: '#86efac', fontSize: 14, direction: 'ltr' }}>{summary.attended}/{summary.total}</strong>
                    </div>
                    <div style={{ borderRadius: 10, padding: '8px 10px', background: 'rgba(248,113,113,0.07)' }}>
                      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, fontWeight: 800 }}>{copy.absentPrefix}</span>
                      <strong style={{ display: 'block', marginTop: 3, color: '#fca5a5', fontSize: 14, direction: 'ltr' }}>{summary.absent}/{summary.total}</strong>
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div style={{
                borderRadius: 14,
                border: '1px dashed rgba(148,163,184,0.35)',
                background: 'rgba(148,163,184,0.045)',
                padding: '28px 18px',
                color: 'var(--text-muted)',
                textAlign: 'center',
                fontWeight: 800,
                lineHeight: 1.6,
              }}>
                {isArabic ? 'لا توجد مواد مسجلة في هذا الترم حتى الآن.' : 'No registered subjects in this term yet.'}
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={{
        marginTop: isCompactProfile ? 12 : 18,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-card2)',
          padding: isCompactProfile ? 14 : 16,
          display: 'flex',
          flexDirection: isCompactProfile ? 'column' : 'row',
          alignItems: isCompactProfile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 18, fontWeight: 900 }}>{copy.language}</h3>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              {copy.languageHelp}
            </p>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: isCompactProfile ? 'stretch' : 'flex-end',
            flexDirection: isCompactProfile ? 'column' : 'row',
            gap: 10,
            width: isCompactProfile ? '100%' : 'auto',
          }}>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </section>
    </div>
  );
};

const StudentAvatar = ({ user, size = 42, radius = '50%' }) => (
  <div style={{
    width: size, height: size, borderRadius: radius, overflow: 'hidden',
    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 800, flexShrink: 0
  }}>
    {user.profileImage ? (
      <img src={user.profileImage} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : user.avatar}
  </div>
);

const StudentDesktopShell = ({ tab, setTab, pageTitle, user, renderContent, lang }) => {
  const isArabic = lang === 'ar';
  const copy = STUDENT_COPY[isArabic ? 'ar' : 'en'];
  const navItems = [
    { key: 'scan', label: copy.scan, icon: ScanLine, section: isArabic ? '\u0627\u0644\u062d\u0636\u0648\u0631' : 'Attendance' },
    { key: 'history', label: copy.history, icon: Activity, section: isArabic ? '\u0627\u0644\u062d\u0636\u0648\u0631' : 'Attendance' },
    { key: 'profile', label: copy.profile, icon: UserCircle2, section: isArabic ? '\u0627\u0644\u062d\u0633\u0627\u0628' : 'Account' },
  ];

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100dvh', minHeight: '100vh', display: 'flex',
      flexDirection: isArabic ? 'row-reverse' : 'row',
      background: 'linear-gradient(135deg, #111816 0%, #17221e 48%, #0f1c18 100%)',
      color: 'var(--text-primary)', overflow: 'hidden'
    }}>
      <div className="student-desktop-bubble student-desktop-bubble-a" />
      <div className="student-desktop-bubble student-desktop-bubble-b" />
      <div className="student-desktop-bubble student-desktop-bubble-c" />
      <aside style={{
        position: 'relative', zIndex: 2, width: 304, flexShrink: 0,
        background: 'linear-gradient(180deg, rgba(22,32,48,0.96), rgba(13,22,20,0.98))',
        borderRight: isArabic ? 'none' : '1px solid rgba(255,255,255,0.08)',
        borderLeft: isArabic ? '1px solid rgba(255,255,255,0.08)' : 'none',
        padding: 20, display: 'flex', flexDirection: 'column', gap: 18,
        boxShadow: isArabic ? '-18px 0 50px rgba(0,0,0,0.16)' : '18px 0 50px rgba(0,0,0,0.16)'
      }} className="sidebar" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="sidebar-logo" style={{ padding: 0, borderBottom: 'none' }}>
          <div className="sidebar-brand-card">
            <div className="sidebar-brand-mark">
              <img src={mnuLogo} alt={copy.studentPortal} className="sidebar-brand-image" />
            </div>
            <div className="sidebar-brand-copy">
              <h2>{copy.studentPortal}</h2>
            </div>
          </div>
        </div>

        <div style={{
          padding: '14px 14px 16px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.14)',
          background: 'rgba(52,211,153,0.06)'
        }}>
          <div style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 900 }}>
            {copy.readyToScan}
          </div>
          <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.65, fontWeight: 700, textAlign: isArabic ? 'right' : 'left' }}>
            {isArabic
              ? '\u0627\u0641\u062a\u062d \u0627\u0644\u0645\u0633\u062d \u0648\u0648\u062c\u0647 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627 \u0646\u062d\u0648 \u0643\u0648\u062f \u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0629.'
              : 'Open scan and point the camera at your lecture code.'}
          </div>
        </div>

        <nav className="sidebar-nav" style={{ padding: '2px 0 0' }}>
          {[...new Set(navItems.map((item) => item.section))].map((section) => (
            <React.Fragment key={section}>
              <div className="sidebar-section-label">{section}</div>
              {navItems.filter((item) => item.section === section).map((item) => {
                const ItemIcon = item.icon || LayoutDashboard;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={`nav-item${tab === item.key ? ' active' : ''}`}
                  >
                    <span className="nav-icon">
                      <ItemIcon size={18} />
                    </span>
                    <span className="nav-item-text">{item.label}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-bottom" style={{ padding: 0, borderTop: 'none' }}>
          <div className="sidebar-preferences-panel">
            <div className="sidebar-preferences-grid">
              <LanguageSwitcher className="sidebar-preference-toggle" />
              <ThemeToggle className="sidebar-preference-toggle" />
            </div>
          </div>

          <div className="sidebar-user-card" style={{ border: '1px solid rgba(52,211,153,0.18)', background: 'rgba(52,211,153,0.08)' }}>
            <StudentAvatar user={user} size={44} radius={8} />
            <div className="sidebar-user-info">
              <p style={{ marginBottom: 2 }}>{user.name}</p>
              <span>{`${copy.studentSummary} - ${user.universityId}`}</span>
            </div>
          </div>
        </div>
      </aside>

      <main style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          minHeight: 82, padding: '0 32px',
          background: 'rgba(17,24,22,0.72)', borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(18px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18,
          flexDirection: isArabic ? 'row-reverse' : 'row'
        }}>
          <div style={{ textAlign: isArabic ? 'right' : 'left' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {tab === 'scan' && <QrCode size={14} />}
              {tab === 'history' && <Clock3 size={14} />}
              {tab === 'profile' && <UserCircle2 size={14} />}
            </div>
            <h1 style={{ marginTop: 4, color: 'var(--text-primary)', fontSize: 24, lineHeight: 1.15, fontWeight: 900 }}>
              {isArabic ? pageTitle.ar : pageTitle.en}
            </h1>
          </div>
          <div style={{
            minHeight: 46, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10,
            flexDirection: isArabic ? 'row-reverse' : 'row'
          }}>
            <StudentAvatar user={user} size={30} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 800 }}>{user.name}</span>
          </div>
        </header>

        <section style={{
          flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 32px 32px',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.025), rgba(52,211,153,0.035))'
        }}>

          <div style={{
            minHeight: '100%',
            maxWidth: 1360, margin: '0 auto', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(14,22,20,0.6)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.22)', overflow: 'hidden',
            backdropFilter: 'blur(12px)'
          }}>
            {renderContent()}
          </div>
        </section>
      </main>
      <style>{`
        .student-desktop-bubble {
          position: absolute;
          z-index: 0;
          border-radius: 999px;
          pointer-events: none;
          filter: blur(2px);
          opacity: 0.55;
          animation: studentDesktopBubbleFloat 9s ease-in-out infinite alternate;
        }
        .student-desktop-bubble-a {
          width: 220px;
          height: 220px;
          top: 12%;
          right: 8%;
          background: radial-gradient(circle, rgba(52, 211, 153, 0.18), transparent 68%);
        }
        .student-desktop-bubble-b {
          width: 150px;
          height: 150px;
          bottom: 12%;
          left: 28%;
          background: radial-gradient(circle, rgba(96, 165, 250, 0.14), transparent 70%);
          animation-delay: -3s;
        }
        .student-desktop-bubble-c {
          width: 110px;
          height: 110px;
          top: 58%;
          right: 34%;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.1), transparent 70%);
          animation-delay: -5s;
        }
        @keyframes studentDesktopBubbleFloat {
          from { transform: translate3d(0, 0, 0) scale(1); }
          to { transform: translate3d(18px, -22px, 0) scale(1.08); }
        }
      `}</style>
    </div>
  );
};

// ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ Main Student App Layout ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬
const StudentApp = ({ forcedTab = null, embedded = false }) => {
  const [tab, setTab] = useState(forcedTab || 'scan');
  const [showSplash, setShowSplash] = useState(true);
  const [bottomViewportInset, setBottomViewportInset] = useState(0);
  const isDesktop = useIsDesktop();
  const { lang, theme } = useLanguage();
  const dispatch = useDispatch();
  const { terms, selectedTermCode, activeTerm } = useSelector((state) => state.terms);
  const attendanceTerm = terms.find((term) => term.code === selectedTermCode) || activeTerm;
  const { user, updateUser } = useAuth();
  const { socket } = useSocket();
  const [attendanceRecords, setAttendanceRecords] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const attendanceRequestIdRef = useRef(0);
  const attendanceRefreshInFlightRef = useRef(false);
  const attendancePendingTermRef = useRef(null);
  const pageTitle = {
    scan: { en: STUDENT_COPY.en.pageScan, ar: STUDENT_COPY.ar.pageScan },
    history: { en: STUDENT_COPY.en.pageHistory, ar: STUDENT_COPY.ar.pageHistory },
    profile: { en: STUDENT_COPY.en.pageProfile, ar: STUDENT_COPY.ar.pageProfile },
  }[tab];

  useEffect(() => {
    if (user?.userRole === 'student') {
      dispatch(fetchTerms());
    }
  }, [dispatch, user?.userRole]);

  useEffect(() => {
    if (forcedTab && forcedTab !== tab) {
      setTab(forcedTab);
    }
  }, [forcedTab, tab]);

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(splashTimer);
  }, []);

  const refreshStudentAttendance = useCallback(async (termCode = selectedTermCode, includeProfile = false) => {
    if (!user?.id || user.userRole !== 'student') return;
    if (attendanceRefreshInFlightRef.current) {
      const pending = attendancePendingTermRef.current;
      attendancePendingTermRef.current = {
        termCode,
        includeProfile: includeProfile || Boolean(pending?.includeProfile),
      };
      return;
    }

    const requestId = ++attendanceRequestIdRef.current;
    attendanceRefreshInFlightRef.current = true;
    setAttendanceLoading(true);
    try {
      const [attendanceResult, profileResult] = await Promise.allSettled([
        attendanceAPI.mine(termCode),
        includeProfile ? authAPI.getCurrentUser(termCode) : Promise.resolve(null),
      ]);

      // A slower, older request must never overwrite a confirmed scan or a
      // response for a newer term.
      if (requestId !== attendanceRequestIdRef.current) return;

      if (attendanceResult.status === 'fulfilled') {
        const attendanceData = attendanceResult.value?.data?.data;
        const responseTermCode = attendanceResult.value?.data?.termCode;
        if ((!termCode || !responseTermCode || String(responseTermCode) === String(termCode)) && Array.isArray(attendanceData)) {
          setAttendanceRecords(attendanceData);
        }
      } else {
        console.error('Could not load student attendance', attendanceResult.reason);
      }

      if (includeProfile && profileResult.status === 'fulfilled') {
        const profileData = extractApiData(profileResult.value) || {};
        updateUser({
          ...(Array.isArray(profileData.courses) ? { courses: profileData.courses } : {}),
          ...(Array.isArray(profileData.registrations) ? { registrations: profileData.registrations } : {}),
        });
      } else if (includeProfile) {
        console.error('Could not refresh student profile', profileResult.reason);
      }
    } finally {
      attendanceRefreshInFlightRef.current = false;
      if (requestId === attendanceRequestIdRef.current) setAttendanceLoading(false);
      const pendingRefresh = attendancePendingTermRef.current;
      attendancePendingTermRef.current = null;
      if (pendingRefresh !== null) {
        window.setTimeout(() => refreshStudentAttendance(
          pendingRefresh.termCode,
          pendingRefresh.includeProfile,
        ), 0);
      }
    }
  }, [selectedTermCode, updateUser, user?.id, user?.userRole]);

  const handleAttendanceRecorded = useCallback((result) => {
    const attendance = result?.attendance;
    const session = result?.session;
    const recordId = attendance?.attendanceRecordId || attendance?.id;
    if (!recordId) return;

    // Invalidate an older in-flight history response, then apply the exact
    // database-confirmed record immediately for a smooth weak-network flow.
    attendanceRequestIdRef.current += 1;
    const confirmedRecord = {
      ...attendance,
      id: recordId,
      sessionId: attendance.sessionId || session?.id,
      course: attendance.course || attendance.courseCode || session?.courseCode || session?.subjectCode,
      courseCode: attendance.courseCode || attendance.course || session?.courseCode || session?.subjectCode,
      subjectName: attendance.subjectName || session?.subjectName,
      type: attendance.type || attendance.lectureType || session?.lectureType,
      lectureType: attendance.lectureType || attendance.type || session?.lectureType,
      group: attendance.group || session?.group || '',
      week: attendance.week || session?.week || '',
      status: 'present',
    };

    setAttendanceRecords((previous) => {
      const records = Array.isArray(previous) ? previous : [];
      const withoutSameRecord = records.filter((record) => String(record.id) !== String(recordId));
      return [confirmedRecord, ...withoutSameRecord];
    });
    setAttendanceLoading(false);
  }, []);

  useEffect(() => {
    refreshStudentAttendance(selectedTermCode, true);
  }, [refreshStudentAttendance, selectedTermCode]);

  useEffect(() => {
    if (!user?.id || user.userRole !== 'student') return undefined;

    let pollCount = 0;
    const pollAttendance = () => {
      if (document.visibilityState !== 'visible') return;
      pollCount += 1;
      // Attendance is cheap and authoritative; registrations change much less
      // often, so refresh the heavier profile request once every four polls.
      refreshStudentAttendance(selectedTermCode, pollCount % 4 === 0);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshStudentAttendance(selectedTermCode, false);
    };
    const intervalId = window.setInterval(pollAttendance, 30000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshStudentAttendance, selectedTermCode, user?.id, user?.userRole]);

  useEffect(() => {
    if (typeof window === 'undefined' || isDesktop) {
      setBottomViewportInset(0);
      return undefined;
    }

    const updateBottomViewportInset = () => {
      const viewport = window.visualViewport;

      if (!viewport) {
        setBottomViewportInset(0);
        return;
      }

      const layoutHeight = window.innerHeight;
      const visibleBottom = viewport.height + viewport.offsetTop;
      const nextInset = Math.max(0, Math.round(layoutHeight - visibleBottom));
      setBottomViewportInset(nextInset);
    };

    updateBottomViewportInset();

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', updateBottomViewportInset);
    viewport?.addEventListener('scroll', updateBottomViewportInset);
    window.addEventListener('resize', updateBottomViewportInset);
    window.addEventListener('orientationchange', updateBottomViewportInset);

    return () => {
      viewport?.removeEventListener('resize', updateBottomViewportInset);
      viewport?.removeEventListener('scroll', updateBottomViewportInset);
      window.removeEventListener('resize', updateBottomViewportInset);
      window.removeEventListener('orientationchange', updateBottomViewportInset);
    };
  }, [isDesktop]);

  const renderContent = () => (
    <>
      {tab === 'scan' && <ScanTab user={user} socket={socket} lang={lang} onAttendanceRecorded={handleAttendanceRecorded} />}
      {tab === 'history' && <HistoryTab user={user} lang={lang} attendanceTerm={attendanceTerm} attendanceRecords={attendanceRecords} loading={attendanceLoading} />}
      {tab === 'profile' && (
        <ProfileTab
          user={user}
          updateUser={updateUser}
          lang={lang}
          theme={theme}
          attendanceRecords={attendanceRecords}
          terms={terms}
          selectedTermCode={selectedTermCode}
          activeTerm={activeTerm}
          onTermChange={(termCode) => dispatch(setSelectedTermCode(termCode))}
        />
      )}
    </>
  );

  if (embedded) {
    return (
      <div style={{ width: '100%', maxWidth: 1360, margin: '0 auto' }}>
        <div style={{
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'visible',
        }}>
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', maxWidth: '100vw', height: '100dvh', minHeight: '100vh', overflow: 'hidden',
      display: 'flex', justifyContent: 'center', background: isDesktop ? 'var(--bg-dark)' : '#000'
    }}>
      <AppHelmet
        titleEn={pageTitle.en}
        titleAr={pageTitle.ar}
        descriptionEn={tab === 'scan'
          ? STUDENT_COPY.en.scanDescription(user.name)
          : tab === 'history'
            ? STUDENT_COPY.en.historyDescription(user.name)
            : STUDENT_COPY.en.profileDescription(user.name)
        }
        descriptionAr={tab === 'scan'
          ? STUDENT_COPY.ar.scanDescription(user.name)
          : tab === 'history'
            ? STUDENT_COPY.ar.historyDescription(user.name)
            : STUDENT_COPY.ar.profileDescription(user.name)
        }
      />
      {showSplash ? <StudentSplash lang={lang} theme={theme} /> : null}
      {isDesktop ? (
        <StudentDesktopShell
          tab={tab}
          setTab={setTab}
          pageTitle={pageTitle}
          user={user}
          renderContent={showSplash ? () => null : renderContent}
          lang={lang}
        />
      ) : (
      <>
      {/* Mobile container constraint wrapper */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        boxSizing: 'border-box',
        background: 'var(--bg-dark)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <header style={{
          padding: '24px 20px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : user.avatar}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {user.universityId}</div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${122 + bottomViewportInset}px)`,
        }}>
          {!showSplash && renderContent()}
        </div>
      </div>
      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(calc(100vw - 28px), 452px)',
        maxWidth: 'calc(100vw - 28px)',
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${12 + bottomViewportInset}px)`,
        height: 76,
        padding: 8,
        borderRadius: 28,
        border: theme === 'light' ? '1px solid rgba(148,163,184,0.18)' : '1px solid rgba(255,255,255,0.08)',
        background: theme === 'light'
          ? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(241,245,249,0.94))'
          : 'linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.9))',
        boxShadow: theme === 'light' ? '0 18px 36px rgba(15,23,42,0.12)' : '0 24px 48px rgba(0,0,0,0.38)',
        backdropFilter: 'blur(18px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 8,
        alignItems: 'stretch',
        zIndex: 40,
      }}>
        {[
          { key: 'scan', label: STUDENT_COPY[lang === 'ar' ? 'ar' : 'en'].scan, icon: CameraIcon },
          { key: 'history', label: STUDENT_COPY[lang === 'ar' ? 'ar' : 'en'].history, icon: HistoryIcon },
          { key: 'profile', label: STUDENT_COPY[lang === 'ar' ? 'ar' : 'en'].profile, icon: ProfileIcon },
        ].map((item) => {
          const ItemIcon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              style={{
                border: active
                  ? (theme === 'light' ? '1px solid rgba(13,148,136,0.24)' : '1px solid rgba(52,211,153,0.32)')
                  : (theme === 'light' ? '1px solid rgba(148,163,184,0.16)' : '1px solid transparent'),
                borderRadius: 22,
                background: active
                  ? (theme === 'light'
                    ? 'linear-gradient(135deg, rgba(20,184,166,0.16), rgba(45,212,191,0.1))'
                    : 'linear-gradient(135deg, rgba(16,185,129,0.22), rgba(52,211,153,0.08))')
                  : (theme === 'light' ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.02)'),
                color: active ? (theme === 'light' ? '#0f766e' : 'var(--accent)') : 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: active
                  ? (theme === 'light'
                    ? '0 8px 20px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.55)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.04)')
                  : (theme === 'light' ? '0 4px 10px rgba(15,23,42,0.04)' : 'none'),
              }}
            >
              <ItemIcon />
              <span style={{ fontSize: 11, fontWeight: 800 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
      </>
      )}
    </div>
  );
};

export default StudentApp;

export { HistoryTab, ProfileTab };






