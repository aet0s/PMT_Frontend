// client/src/pages/AccessDeniedPage.jsx
import React, { useEffect } from 'react';
import NotFoundPage from './NotFoundPage';

export default function AccessDeniedPage() {
  useEffect(() => {
    document.title = 'Access Denied | TaskFlow';
  }, []);

  return (
    <NotFoundPage
      title="Access Restricted or Not Found"
      description="You do not have permission to view this resource, or it does not exist in this workspace."
    />
  );
}
