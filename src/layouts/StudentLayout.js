import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

const StudentLayout = () => {
  useEffect(() => {
    document.body.style.background = 'var(--bg-dark)';

    return () => {
      document.body.style.background = '';
    };
  }, []);

  return <Outlet />;
};

export default StudentLayout;
