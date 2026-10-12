import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Sparkles, Loader2, Code, Briefcase, GraduationCap, FolderGit2 } from 'lucide-react';
import interviewApi from '../../api/interviewApi';
import Button from '../ui/Button';

export default function ResumeUploadPanel({ interviewId, isCompany, onQuestionsGenerated }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [resumeData, setResumeData] = useState(null);

  useEffect(() => {
    if (interviewId) {
      loadResume();
    }
  }, [interviewId]);

  const loadResume = async () => {
    try {
      const res = await interviewApi.getResumeProfile(interviewId);
      if (res.data?.resume) {
        setResumeData(res.data.resume);
      }
    } catch (_) {}
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setError(null);
    setSuccessMsg('');

    const ext = selected.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'txt', 'md', 'text'].includes(ext)) {
      setError('Invalid file format. Only PDF, DOCX, TXT, and MD files are permitted.');
      setFile(null);
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10 MB maximum limit.');
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file || !interviewId) return;
    setUploading(true);
    setError(null);
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const res = await interviewApi.uploadResumeFile(interviewId, formData);
      if (res.data?.resume) {
        setResumeData(res.data.resume);
        setSuccessMsg(
          res.data.aiParsingStatus === 'COMPLETED'
            ? 'Resume parsed and structured successfully!'
            : 'Resume uploaded, but AI extraction is unavailable. You can still review the stored file.'
        );
        setFile(null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to upload and parse resume file');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!interviewId) return;
    setGenerating(true);
    setError(null);
    setSuccessMsg('');

    try {
      const res = await interviewApi.generateResumeQuestions(interviewId);
      if (Array.isArray(res.data?.questions)) {
        setSuccessMsg('Personalized AI questions generated from student resume!');
        if (onQuestionsGenerated) {
          onQuestionsGenerated(res.data?.questions || []);
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to generate questions from resume');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white border border-[#DFE5EF] rounded-xl p-5 shadow-sm text-[#172033] space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#EAF0FF] text-[#365FEA] rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#172033]">Resume Parser & AI Skills</h3>
            <p className="text-xs text-[#596579]">Upload resume (PDF, DOCX, TXT) to extract candidate skills & generate questions</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Upload Box */}
      <div className="border-2 border-dashed border-[#DFE5EF] hover:border-[#365FEA] transition-colors rounded-xl p-5 text-center bg-[#F5F7FB]">
        <input
          type="file"
          id="resume-file-input"
          accept=".pdf,.docx,.txt,.md,.text,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          className="hidden"
          onChange={handleFileChange}
        />
        <label htmlFor="resume-file-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
          <Upload className="w-8 h-8 text-[#596579]" />
          <div className="text-xs text-[#596579]">
            <span className="font-semibold text-[#365FEA] hover:underline">Choose PDF, DOCX, or TXT</span> or drag and drop
          </div>
          <span className="text-[11px] text-[#8592A6]">Maximum file size: 10MB</span>
        </label>

        {file && (
          <div className="mt-3 flex items-center justify-between bg-white border border-[#DFE5EF] p-2.5 rounded-lg text-xs text-[#172033]">
            <span className="truncate max-w-[220px] font-medium">{file.name}</span>
            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Parse Resume'}
            </Button>
          </div>
        )}
      </div>

      {/* Extracted Resume Insights */}
      {resumeData && (
        <div className="space-y-4 pt-3 border-t border-[#DFE5EF]">
          {resumeData.aiParsingStatus === 'FAILED' && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resumeData.aiParsingMessage || 'AI extraction was unavailable; displayed profile fields may be incomplete.'}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-[#596579]">Candidate: </span>
              <span className="font-semibold text-[#172033]">{resumeData.name || 'Candidate'}</span>
            </div>
            {resumeData.fileName && (
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium">
                ✓ {resumeData.fileName}
              </span>
            )}
          </div>

          {/* Skills & Tech */}
          {((resumeData.skills && resumeData.skills.length > 0) || (resumeData.technologies && resumeData.technologies.length > 0)) && (
            <div>
              <div className="text-[11px] font-bold text-[#596579] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-[#365FEA]" /> Extracted Technical Skills
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...(resumeData.skills || []), ...(resumeData.technologies || [])].slice(0, 15).map((skill, idx) => (
                  <span key={idx} className="text-xs bg-[#EAF0FF] text-[#365FEA] border border-[#C9D7FA] px-2.5 py-0.5 rounded-md font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {resumeData.projects && resumeData.projects.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#596579] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-emerald-600" /> Projects
              </div>
              <ul className="text-xs text-[#596579] space-y-1 list-disc list-inside">
                {resumeData.projects.slice(0, 3).map((proj, idx) => (
                  <li key={idx} className="truncate text-[#172033]">{proj}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Experience */}
          {resumeData.experience && resumeData.experience.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#596579] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-amber-600" /> Experience
              </div>
              <ul className="text-xs text-[#596579] space-y-1 list-disc list-inside">
                {resumeData.experience.slice(0, 2).map((exp, idx) => (
                  <li key={idx} className="truncate text-[#172033]">{exp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Education */}
          {resumeData.education && resumeData.education.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#596579] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#365FEA]" /> Education
              </div>
              <ul className="text-xs text-[#596579] space-y-1 list-disc list-inside">
                {resumeData.education.slice(0, 2).map((edu, idx) => (
                  <li key={idx} className="truncate text-[#172033]">{edu}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Generate Interview Questions Button */}
          {isCompany && (
            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full justify-center text-xs py-2 bg-[#365FEA] hover:bg-[#2B4DC7]"
                onClick={handleGenerateQuestions}
                disabled={generating || !(resumeData.skills?.length || resumeData.projects?.length)}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Generate Interview From Resume
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
