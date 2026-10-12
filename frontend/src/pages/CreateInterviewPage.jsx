import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import CreateInterviewModal from '../components/interview/CreateInterviewModal';
import interviewApi from '../api/interviewApi';

export default function CreateInterviewPage() {
  const navigate = useNavigate();
  const handleSubmit = async (payload) => {
    const response = await interviewApi.createInterview(payload);
    const interview = response.data?.interview;
    if (!interview?._id) throw new Error('Interview was created without an id.');
    navigate(`/interviews/${interview._id}`);
  };
  return (
    <AppShell>
      <CreateInterviewModal isOpen onClose={() => navigate('/interviews')} onSubmit={handleSubmit} />
    </AppShell>
  );
}
