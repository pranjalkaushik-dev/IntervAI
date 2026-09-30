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
        setSuccessMsg('Resume parsed and structured successfully!');
        setFile(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload and parse resume file');
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
      if (res.data?.success) {
        setSuccessMsg('Personalized AI questions generated from student resume!');
        if (onQuestionsGenerated) {
          onQuestionsGenerated(res.data?.questions || []);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to generate questions from resume');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-100">Resume Parser & AI Insights</h3>
            <p className="text-xs text-slate-400">Upload student resume (PDF, DOCX, TXT) to extract skills & generate questions</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Upload Box */}
      <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 transition-colors rounded-xl p-4 text-center bg-slate-950/40">
        <input
          type="file"
          id="resume-file-input"
          accept=".pdf,.docx,.txt,.md,.text,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          className="hidden"
          onChange={handleFileChange}
        />
        <label htmlFor="resume-file-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
          <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-400" />
          <div className="text-xs">
            <span className="font-semibold text-indigo-400 hover:underline">Choose PDF, DOCX, or TXT</span> or drag and drop
          </div>
          <span className="text-[10px] text-slate-500">Maximum file size: 10MB</span>
        </label>

        {file && (
          <div className="mt-3 flex items-center justify-between bg-slate-800 p-2 rounded-lg text-xs text-slate-200">
            <span className="truncate max-w-[200px]">{file.name}</span>
            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Parse Resume'}
            </Button>
          </div>
        )}
      </div>

      {/* Extracted Resume Insights */}
      {resumeData && (
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400">Student: </span>
              <span className="font-medium text-slate-200">{resumeData.name || 'Student'}</span>
            </div>
            {resumeData.fileName && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                ✓ {resumeData.fileName}
              </span>
            )}
          </div>

          {/* Skills & Tech */}
          {((resumeData.skills && resumeData.skills.length > 0) || (resumeData.technologies && resumeData.technologies.length > 0)) && (
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Code className="w-3.5 h-3.5 text-indigo-400" /> Extracted Technical Skills
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...(resumeData.skills || []), ...(resumeData.technologies || [])].slice(0, 15).map((skill, idx) => (
                  <span key={idx} className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {resumeData.projects && resumeData.projects.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" /> Projects
              </div>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                {resumeData.projects.slice(0, 3).map((proj, idx) => (
                  <li key={idx} className="truncate">{proj}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Experience */}
          {resumeData.experience && resumeData.experience.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-amber-400" /> Experience
              </div>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                {resumeData.experience.slice(0, 2).map((exp, idx) => (
                  <li key={idx} className="truncate">{exp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Education */}
          {resumeData.education && resumeData.education.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400" /> Education
              </div>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                {resumeData.education.slice(0, 2).map((edu, idx) => (
                  <li key={idx} className="truncate">{edu}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Generate Interview Questions Button */}
          {isCompany && (
            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full justify-center text-xs py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
                onClick={handleGenerateQuestions}
                disabled={generating}
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
