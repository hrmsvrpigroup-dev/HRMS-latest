import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Plus, Search, Filter, Loader2, Star,
  Briefcase, Users, UserCheck, Calendar,
  Mail, Phone, MoreHorizontal, XCircle, LayoutGrid, List, Target,
  Zap, Share2, Eye, Download, MapPin, Award,
  ChevronRight, Brain, Globe, Inbox, StarHalf, ShieldAlert,
  FolderOpen, UserPlus, CheckCircle, Clock, Sparkles, Send, Bell,
  ArrowUpRight, Activity, Layers, Settings, RefreshCw, ChevronDown,
  BookOpen, FileText, BarChart2, PieChart as PieChartIcon, Cpu, Copy, ExternalLink,
  FileCode, Video, FileSpreadsheet, Package, Paperclip, AlertTriangle, File
} from 'lucide-react';
import api from '../../api/axios';
import { format } from 'date-fns';
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import './recruitment.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  stage: string;
  source: string;
  jobTitle: string;
  experience: string;
  appliedDate: string;
  matchScore: number;
  avatarColor?: string;
  skills: string[];
  attachmentImages?: string[];
  resumeUrl?: string;
  
  // Interview Phase
  interviewDate?: string;
  interviewTime?: string;
  interviewType?: string;
  interviewer?: string;
  
  // Offer Phase
  offerSalary?: number;
  offerJoiningDate?: string;
  offerStatus?: string;
  
  // Verification Phase
  documentsVerified?: boolean;
  
  // Onboarding Phase
  onboarded?: boolean;
  onboardingInviteId?: string;
  onboardingUrl?: string;
  onboardingToken?: string;
}

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: 'Published' | 'Draft' | 'Archived' | 'OPEN';
  applicants: number;
  postedDate: string;
  description?: string;
  mediaUrl?: string;
}

export interface FormAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'image' | 'video' | 'spreadsheet' | 'archive' | 'unknown';
  mimeType: string;
  url: string;
  downloadUrl: string;
  driveId?: string;
  sizeStr?: string;
  uploadedAt?: string;
  error?: boolean;
}

export function parseAttachmentItem(item: any, index: number = 0): FormAttachment {
  if (!item) {
    return {
      id: `err-${index}`,
      name: 'File unavailable',
      type: 'unknown',
      mimeType: 'application/octet-stream',
      url: '',
      downloadUrl: '',
      error: true
    };
  }

  if (typeof item === 'object' && item !== null) {
    const type = item.type || detectFileType(item.name || item.url || '');
    return {
      id: item.id || `att-${index}`,
      name: item.name || 'Attachment',
      type,
      mimeType: item.mimeType || getMimeType(type),
      url: item.url || item.secureUrl || '',
      downloadUrl: item.downloadUrl || item.url || '',
      driveId: item.driveId,
      sizeStr: item.sizeStr || (item.size ? formatBytes(item.size) : undefined),
      uploadedAt: item.uploadedAt,
      error: item.error || false
    };
  }

  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseAttachmentItem(parsed, index);
      } catch (e) {
        // Fallthrough
      }
    }

    const driveMatch = trimmed.match(/(?:id=|\/d\/|\/uc\?.*id=)([a-zA-Z0-9_-]{25,})/);
    const driveId = driveMatch ? driveMatch[1] : undefined;

    let filename = `Attachment_${index + 1}`;
    try {
      if (driveId) {
        if (trimmed.toLowerCase().includes('resume')) filename = 'Resume.pdf';
        else if (trimmed.toLowerCase().includes('photo') || trimmed.toLowerCase().includes('image')) filename = 'Profile_Photo.jpg';
        else filename = `Google_Drive_Doc_${index + 1}`;
      } else if (trimmed.startsWith('http')) {
        const last = new URL(trimmed).pathname.split('/').pop();
        if (last && last.includes('.')) filename = decodeURIComponent(last);
      }
    } catch {
      filename = `Attachment_${index + 1}`;
    }

    const type = detectFileType(filename, trimmed);
    const mimeType = getMimeType(type);

    let viewUrl = trimmed;
    let downloadUrl = trimmed;

    if (driveId) {
      viewUrl = `https://drive.google.com/uc?export=view&id=${driveId}`;
      downloadUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
    }

    return {
      id: driveId || `att-${index}`,
      name: filename,
      type,
      mimeType,
      url: viewUrl,
      downloadUrl,
      driveId,
      error: false
    };
  }

  return {
    id: `invalid-${index}`,
    name: 'File unavailable',
    type: 'unknown',
    mimeType: 'application/octet-stream',
    url: '',
    downloadUrl: '',
    error: true
  };
}

function detectFileType(name: string, url: string = ''): 'pdf' | 'doc' | 'image' | 'video' | 'spreadsheet' | 'archive' | 'unknown' {
  const c = (name + ' ' + url).toLowerCase();
  if (c.includes('.pdf') || c.includes('pdf')) return 'pdf';
  if (c.includes('.doc') || c.includes('.docx') || c.includes('word')) return 'doc';
  if (c.includes('.jpg') || c.includes('.jpeg') || c.includes('.png') || c.includes('.webp') || c.includes('.gif') || c.includes('.svg') || c.includes('image') || c.includes('photo') || c.includes('unsplash') || c.includes('googleusercontent')) return 'image';
  if (c.includes('.mp4') || c.includes('.mov') || c.includes('.webm') || c.includes('.avi') || c.includes('video')) return 'video';
  if (c.includes('.xls') || c.includes('.xlsx') || c.includes('.csv') || c.includes('sheet')) return 'spreadsheet';
  if (c.includes('.zip') || c.includes('.rar') || c.includes('.7z') || c.includes('archive')) return 'archive';
  return 'unknown';
}

function getMimeType(type: string): string {
  switch (type) {
    case 'pdf': return 'application/pdf';
    case 'doc': return 'application/msword';
    case 'image': return 'image/jpeg';
    case 'video': return 'video/mp4';
    case 'spreadsheet': return 'text/csv';
    case 'archive': return 'application/zip';
    default: return 'application/octet-stream';
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ─── 9 Pipeline Stages Config ──────────────────────────────────────────

const STAGES = [
  { step: '1', key: 'stage-3', title: 'Applications', desc: 'Receive & collect', icon: Inbox, color: 'bg-pink-50 text-pink-600 border-pink-200', activeBg: 'bg-pink-600 text-white border-pink-600' },
  { step: '2', key: 'stage-4', title: 'AI Screening', desc: 'AI-Powered screen', icon: Brain, color: 'bg-purple-50 text-purple-600 border-purple-200', activeBg: 'bg-purple-600 text-white border-purple-600' },
  { step: '3', key: 'stage-5', title: 'Shortlisting', desc: 'Review best matches', icon: StarHalf, color: 'bg-sky-50 text-sky-600 border-sky-200', activeBg: 'bg-sky-600 text-white border-sky-600' },
  { step: '4', key: 'stage-6', title: 'Interviews', desc: 'Schedule & conduct', icon: Calendar, color: 'bg-amber-50 text-amber-600 border-amber-200', activeBg: 'bg-amber-600 text-white border-amber-600' },
  { step: '5', key: 'stage-7', title: 'Offer', desc: 'Extend offer', icon: Award, color: 'bg-orange-50 text-orange-600 border-orange-200', activeBg: 'bg-orange-600 text-white border-orange-600' },
  { step: '6', key: 'stage-8', title: 'Documents', desc: 'Collect & verify', icon: FolderOpen, color: 'bg-green-50 text-green-600 border-green-200', activeBg: 'bg-green-600 text-white border-green-600' },
  { step: '7', key: 'stage-9', title: 'Onboarding', desc: 'Welcome new hire', icon: UserPlus, color: 'bg-teal-50 text-teal-600 border-teal-200', activeBg: 'bg-teal-600 text-white border-teal-600' },
];

const SOURCE_FILLS: Record<string, string> = {
  'Career Page': '#3b82f6',
  'LinkedIn': '#10b981',
  'Referral': '#f59e0b',
  'Indeed': '#6366f1',
  'Direct': '#8b5cf6',
  'Naukri': '#ec4899',
  'Wellfound': '#14b8a6',
  'Others': '#94a3b8',
};

interface RecruitmentProps {
  defaultTab?: string;
}

export default function Recruitment({ defaultTab }: RecruitmentProps = {}) {
  const location = useLocation();
  const isInterviewScheduleRoute = location.pathname.includes('/hr/interview-schedule');
  const [activeTab, setActiveTab] = useState(
    defaultTab || (isInterviewScheduleRoute ? 'stage-6' : 'dashboard')
  );

  useEffect(() => {
    if (location.pathname.includes('/hr/interview-schedule')) {
      setActiveTab('stage-6');
    } else if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [location.pathname, defaultTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  
  // State for forms & UI flows
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  
  // Google Form Applications state
  const [showEmbeddedForm, setShowEmbeddedForm] = useState(false);
  const [copiedFormLink, setCopiedFormLink] = useState(false);
  const [appSourceFilter, setAppSourceFilter] = useState<'all' | 'google-form' | 'manual'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingApp, setSubmittingApp] = useState(false);
  const [modalApplicant, setModalApplicant] = useState({
    name: '',
    email: '',
    phone: '',
    experience: '3 Years',
    source: 'Google Form',
    skills: 'React, Node.js, TypeScript',
    jobId: ''
  });
  const googleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdbNFaVvDwbf_k6PkxZxjYPxDQe2f0zrtBT_p6EqgiYuhiQxw/viewform?usp=dialog";
  const googleFormEmbedUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdbNFaVvDwbf_k6PkxZxjYPxDQe2f0zrtBT_p6EqgiYuhiQxw/viewform?embedded=true";
  const [previewMediaAttachment, setPreviewMediaAttachment] = useState<FormAttachment | null>(null);

  const handleSyncResponses = async () => {
    try {
      setLoading(true);
      await api.post('/recruitment/sync-google-responses');
      await loadRecruitmentData();
    } catch (err: any) {
      console.warn('Sync notice:', err);
      await loadRecruitmentData();
    } finally {
      setLoading(false);
    }
  };

  const handleRealtimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalApplicant.name || !modalApplicant.email) {
      alert('Please fill out Name and Email.');
      return;
    }
    try {
      setSubmittingApp(true);
      await api.post('/recruitment/applications', {
        ...modalApplicant,
        jobId: modalApplicant.jobId || selectedJobId || (jobs[0] ? jobs[0].id : '')
      });
      alert('Real-time application submitted and saved to database!');
      setShowAddModal(false);
      setModalApplicant({ name: '', email: '', phone: '', experience: '3 Years', source: 'Google Form', skills: 'React, Node.js, TypeScript', jobId: '' });
      await loadRecruitmentData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save response to database.');
    } finally {
      setSubmittingApp(false);
    }
  };

  const [postingChannels, setPostingChannels] = useState<Record<string, boolean>>({
    linkedin: true,
    naukri: true,
    wellfound: true,
    indeed: false,
    career_portal: true,
  });
  const [integrationLogs, setIntegrationLogs] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [postingSuccessJobId, setPostingSuccessJobId] = useState<string | null>(null);
  const [selectedSimulatedChannel, setSelectedSimulatedChannel] = useState<string | null>(null);
  
  // AI screening simulation state
  const [screeningCandId, setScreeningCandId] = useState<string | null>(null);
  const [screeningLogs, setScreeningLogs] = useState<string[]>([]);
  
  // Stage 1 Create Job form state
  const [newJob, setNewJob] = useState({
    title: '',
    department: 'Engineering',
    location: 'Remote',
    description: '',
    requirements: '',
    type: 'Full-time',
    mediaUrl: ''
  });
  
  // Stage 3 Applicant form state
  const [newApplicant, setNewApplicant] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    experience: '3 Years',
    source: 'LinkedIn',
    skills: 'React, TypeScript, CSS',
    jobId: ''
  });

  // Stage 6 Interview form state
  const [interviewForm, setInterviewForm] = useState({
    date: '',
    time: '',
    type: 'Technical',
    interviewer: ''
  });

  // Stage 7 Offer form state
  const [offerForm, setOfferForm] = useState({
    salary: '75000',
    joiningDate: ''
  });

  // Stage 8 Document uploads mock state
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // Stage 9 Onboarding state
  const [onboardingProgressId, setOnboardingProgressId] = useState<string | null>(null);
  const [onboardingInviteResult, setOnboardingInviteResult] = useState<any>(null);

  // Load backend recruitment data
  const loadRecruitmentData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/recruitment/jobs');
      const responseData = res.data.data;

      if (responseData && Array.isArray(responseData)) {
        const mappedJobs: Job[] = responseData.map((job: any) => ({
          id: job.id,
          title: job.title,
          department: job.department || 'General',
          location: job.location || 'Remote',
          type: 'Full-time',
          status: job.status === 'OPEN' ? 'Published' : job.status,
          applicants: job.applications?.length || 0,
          postedDate: format(new Date(job.createdAt), 'yyyy-MM-dd'),
          description: job.description || '',
          mediaUrl: job.mediaUrl || '',
        }));
        setJobs(mappedJobs);

        if (mappedJobs.length > 0 && !selectedJobId) {
          setSelectedJobId(mappedJobs[0].id);
        }

        const allCandidates: Candidate[] = [];
        const AVATAR_COLORS = [
          'bg-blue-100 text-blue-600 border-blue-200', 'bg-pink-100 text-pink-600 border-pink-200',
          'bg-indigo-100 text-indigo-600 border-indigo-200', 'bg-emerald-100 text-emerald-600 border-emerald-200',
          'bg-amber-100 text-amber-600 border-amber-200', 'bg-purple-100 text-purple-600 border-purple-200',
          'bg-cyan-100 text-cyan-600 border-cyan-200', 'bg-rose-100 text-rose-600 border-rose-200',
        ];
        let colorIdx = 0;
        responseData.forEach((job: any) => {
          if (job.applications) {
            job.applications.forEach((app: any) => {
              const nameParts = (app.name || 'Applicant').split(' ');
              const firstName = nameParts[0] || 'Applicant';
              const lastName = nameParts.slice(1).join(' ') || '';
              
              // Stage mapper
              let stage = app.status;
              if (app.status === 'AI_SCREENING') stage = 'AI Screening';
              else if (app.status === 'SHORTLISTED') stage = 'Shortlisting';
              else if (app.status === 'INTERVIEW') stage = 'Interviews';
              else if (app.status === 'OFFER') stage = 'Offer';
              else if (app.status === 'DOCUMENTS') stage = 'Documents';
              else if (app.status === 'HIRED') stage = 'Onboarding';
              else if (app.status === 'REJECTED') stage = 'Rejected';
              else stage = 'Applications';

              allCandidates.push({
                id: app.id,
                firstName,
                lastName,
                email: app.email || '',
                phone: app.phone || 'N/A',
                stage,
                source: app.source || 'Career Page',
                jobTitle: job.title,
                experience: app.experience || 'N/A',
                appliedDate: format(new Date(app.appliedAt), 'yyyy-MM-dd'),
                matchScore: Math.round(app.aiScore || 0),
                skills: app.skills || [],
                avatarColor: AVATAR_COLORS[colorIdx++ % AVATAR_COLORS.length],
                attachmentImages: app.attachmentImages || [],
                resumeUrl: app.resumeUrl || undefined,
                interviewDate: app.interviewDate ? format(new Date(app.interviewDate), 'yyyy-MM-dd') : undefined,
                interviewTime: app.interviewTime,
                interviewType: app.interviewType,
                interviewer: app.interviewer,
                offerSalary: app.offerSalary,
                offerJoiningDate: app.offerJoiningDate ? format(new Date(app.offerJoiningDate), 'yyyy-MM-dd') : undefined,
                offerStatus: app.offerStatus,
                documentsVerified: app.documentsVerified,
                onboarded: app.onboarded,
                onboardingInviteId: app.onboardingInviteId,
              });
            });
          }
        });
        setCandidates(allCandidates);
      }
    } catch (err) {
      console.error('Failed to load recruitment data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecruitmentData();
  }, []);

  // Update candidate status backend
  const updateCandidateStage = async (candidateId: string, status: string) => {
    try {
      await api.patch(`/recruitment/applications/${candidateId}/status`, { status });
      await loadRecruitmentData();
      if (selectedCandidate && selectedCandidate.id === candidateId) {
        setSelectedCandidate(prev => prev ? { ...prev, stage: status } : null);
      }
    } catch (err) {
      alert('Failed to update candidate status.');
    }
  };

  // Stage 1 media uploader state
  const [jobFilePreview, setJobFilePreview] = useState<string | null>(null);
  const [jobFileName, setJobFileName] = useState<string>('');
  const [jobFileSize, setJobFileSize] = useState<string>('');

  const handleJobFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      setJobFileName(file.name);
      setJobFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Str = reader.result as string;
        setNewJob(prev => ({ ...prev, mediaUrl: base64Str }));
        setJobFilePreview(base64Str);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveJobFile = () => {
    setNewJob(prev => ({ ...prev, mediaUrl: '' }));
    setJobFilePreview(null);
    setJobFileName('');
    setJobFileSize('');
  };

  // Submit Job Posting
  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.description) {
      alert('Please fill out all fields.');
      return;
    }
    try {
      const res = await api.post('/recruitment/jobs', newJob);
      const createdJob = res.data.data;
      alert(`Job "${createdJob.title}" created successfully!`);
      setSelectedJobId(createdJob.id);
      setNewJob({
        title: '',
        department: 'Engineering',
        location: 'Remote',
        description: '',
        requirements: '',
        type: 'Full-time',
        mediaUrl: ''
      });
      setJobFilePreview(null);
      setJobFileName('');
      setJobFileSize('');
      await loadRecruitmentData();
      setActiveTab('stage-3');
    } catch (err) {
      alert('Failed to create job posting.');
    }
  };

  // Trigger Job Posting integrations logs simulation
  const handlePublishJobIntegrations = async () => {
    if (!selectedJobId) {
      alert('Please select a job to distribute.');
      return;
    }
    setIsPosting(true);
    setIntegrationLogs([]);
    setPostingSuccessJobId(null);
    
    const job = jobs.find(j => j.id === selectedJobId);
    const logs = [
      `[INFO] Initializing multi-channel API handshake for "${job?.title}"...`,
      `[INFO] Establishing secure OAuth2 handshake with job platforms...`,
    ];
    
    setIntegrationLogs([...logs]);
    
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    
    await sleep(800);
    if (postingChannels.linkedin) {
      logs.push(`[INFO] Authenticating with LinkedIn Recruiter API...`);
      setIntegrationLogs([...logs]);
      await sleep(600);
      logs.push(`[SUCCESS] LinkedIn connection verified. Pushed description schema.`);
      logs.push(`[SUCCESS] LinkedIn Posting Active: URL linkd.in/job/${selectedJobId.substring(0, 6)}`);
      setIntegrationLogs([...logs]);
    }
    
    await sleep(600);
    if (postingChannels.naukri) {
      logs.push(`[INFO] Connecting to Naukri FastForward API payload gateway...`);
      setIntegrationLogs([...logs]);
      await sleep(800);
      logs.push(`[SUCCESS] Naukri schema matching validated. Post live. ID: nkr_${selectedJobId.substring(0, 6)}`);
      setIntegrationLogs([...logs]);
    }
    
    await sleep(600);
    if (postingChannels.wellfound) {
      logs.push(`[INFO] Pushing startup tags and location credentials to Wellfound...`);
      setIntegrationLogs([...logs]);
      await sleep(700);
      logs.push(`[SUCCESS] Wellfound listing approved. Status: LIVE.`);
      setIntegrationLogs([...logs]);
    }
    
    await sleep(500);
    if (postingChannels.indeed) {
      logs.push(`[INFO] Distributing XML feed parser indexing payload to Indeed...`);
      setIntegrationLogs([...logs]);
      await sleep(500);
      logs.push(`[SUCCESS] Indeed aggregator updated.`);
      setIntegrationLogs([...logs]);
    }
    
    await sleep(600);
    logs.push(`[INFO] Refreshing company internal career site...`);
    setIntegrationLogs([...logs]);
    await sleep(500);
    logs.push(`[SUCCESS] Career portal index rebuilt successfully.`);
    logs.push(`[SUCCESS] End-to-End Distribution completed. Job status updated to OPEN.`);
    setIntegrationLogs([...logs]);
    
    try {
      await api.patch(`/recruitment/jobs/${selectedJobId}/status`, { status: 'OPEN' });
      await loadRecruitmentData();
    } catch {}
    
    setIsPosting(false);
    setPostingSuccessJobId(selectedJobId);
  };

  // Submit Candidate Application
  const handleAddApplicantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const jobIdToUse = newApplicant.jobId || selectedJobId;
    if (!jobIdToUse) {
      alert('Please select or create a job posting first.');
      return;
    }
    if (!newApplicant.firstName || !newApplicant.lastName || !newApplicant.email) {
      alert('Please fill out Name and Email.');
      return;
    }
    try {
      await api.post('/recruitment/applications', {
        ...newApplicant,
        jobId: jobIdToUse
      });
      alert('Candidate application received successfully!');
      setNewApplicant({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        experience: '3 Years',
        source: 'LinkedIn',
        skills: 'React, TypeScript, CSS',
        jobId: ''
      });
      await loadRecruitmentData();
      setActiveTab('stage-4'); // move to AI Screening view
    } catch (err) {
      alert('Failed to add candidate.');
    }
  };

  // Run AI screen simulation
  const handleRunAIScreen = async (candidateId: string) => {
    setScreeningCandId(candidateId);
    setScreeningLogs([]);
    
    const candidate = candidates.find(c => c.id === candidateId);
    const logs = [
      `[AI COGNITIVE INIT] Accessing resume database indexing parser...`,
      `[AI SEMANTIC INDEX] Analysing skills matrix for "${candidate?.firstName} ${candidate?.lastName}"...`,
    ];
    setScreeningLogs([...logs]);
    
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    
    await sleep(800);
    logs.push(`[AI COMPILING] Reviewing professional experience: "${candidate?.experience}"...`);
    setScreeningLogs([...logs]);
    
    await sleep(700);
    logs.push(`[AI SEMANTICS] Matching parsed skills [${candidate?.skills.join(', ')}] against "${candidate?.jobTitle}" requirements...`);
    setScreeningLogs([...logs]);
    
    await sleep(800);
    logs.push(`[AI MATRIX SUCCESS] Semantic fit and matching coefficients calculated.`);
    setScreeningLogs([...logs]);
    
    await sleep(400);
    try {
      const res = await api.patch(`/recruitment/applications/${candidateId}/ai-screen`);
      const updated = res.data.data;
      logs.push(`[AI SUCCESS] Scoring completed successfully! Match score evaluated at: ${updated.aiScore}%`);
      setScreeningLogs([...logs]);
      await loadRecruitmentData();
    } catch (err) {
      logs.push(`[AI ERROR] Backend validation error occurred.`);
      setScreeningLogs([...logs]);
    }
    
    await sleep(1000);
    setScreeningCandId(null);
  };

  // Schedule Interview
  const handleScheduleInterview = async (candidateId: string) => {
    if (!interviewForm.date || !interviewForm.time || !interviewForm.interviewer) {
      alert('Please fill out Date, Time, and Interviewer.');
      return;
    }
    try {
      await api.patch(`/recruitment/applications/${candidateId}/interview`, {
        interviewDate: interviewForm.date,
        interviewTime: interviewForm.time,
        interviewType: interviewForm.type,
        interviewer: interviewForm.interviewer
      });
      alert('Interview scheduled successfully!');
      setInterviewForm({ date: '', time: '', type: 'Technical', interviewer: '' });
      await loadRecruitmentData();
    } catch (err) {
      alert('Failed to schedule interview.');
    }
  };

  // Pass or Fail Interview
  const handleInterviewDecision = async (candidateId: string, decision: 'pass' | 'fail') => {
    try {
      await api.patch(`/recruitment/applications/${candidateId}/interview`, { decision });
      alert(decision === 'pass' ? 'Candidate passed! Offer extended.' : 'Candidate rejected.');
      await loadRecruitmentData();
    } catch (err) {
      alert('Failed to save interview decision.');
    }
  };

  // Generate & extend Offer
  const handleExtendOfferSubmit = async (candidateId: string) => {
    if (!offerForm.joiningDate || !offerForm.salary) {
      alert('Please fill out Joining Date and Base Salary.');
      return;
    }
    try {
      await api.patch(`/recruitment/applications/${candidateId}/offer`, {
        offerSalary: Number(offerForm.salary),
        offerJoiningDate: offerForm.joiningDate,
        offerStatus: 'SENT'
      });
      alert('Offer extended and sent to candidate successfully!');
      await loadRecruitmentData();
    } catch (err) {
      alert('Failed to extend offer.');
    }
  };

  // Simulate Candidate Offer Acceptance
  const handleSimulateOfferAcceptance = async (candidateId: string) => {
    try {
      await api.patch(`/recruitment/applications/${candidateId}/offer`, {
        offerStatus: 'ACCEPTED'
      });
      alert('Candidate has ACCEPTED the offer! Moving candidate to Document Collection.');
      await loadRecruitmentData();
    } catch (err) {
      alert('Failed to accept offer.');
    }
  };

  // Upload mock verification doc
  const handleUploadMockDoc = async (candidateId: string, docType: string) => {
    setUploadingDocType(docType);
    
    // Generate a simple Canvas mock document scan in base64
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 300, 400);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 12;
      ctx.strokeRect(0, 0, 300, 400);
      
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(30, 30, 240, 40);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(docType.toUpperCase() + ' SCAN', 45, 55);
      
      ctx.fillStyle = '#475569';
      ctx.font = '10px sans-serif';
      ctx.fillText('Candidate Verification Doc', 45, 120);
      ctx.fillText('Verified HR Portal Copy', 45, 140);
      ctx.fillText(`Issued: ${new Date().toLocaleDateString()}`, 45, 160);
      
      // Draw details lines
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, 200); ctx.lineTo(270, 200);
      ctx.moveTo(30, 240); ctx.lineTo(270, 240);
      ctx.moveTo(30, 280); ctx.lineTo(270, 280);
      ctx.stroke();
    }
    
    const base64Str = canvas.toDataURL('image/png');
    
    try {
      await api.post(`/recruitment/applications/${candidateId}/attachments`, {
        attachmentImage: base64Str
      });
      alert(`Mock document "${docType}" uploaded successfully.`);
      await loadRecruitmentData();
    } catch {
      alert('Failed to upload mock document.');
    } finally {
      setUploadingDocType(null);
    }
  };

  // Verify and Approve Candidate Documents
  const handleVerifyDocumentsSubmit = async (candidateId: string) => {
    try {
      await api.patch(`/recruitment/applications/${candidateId}/documents-verify`, {
        verified: true
      });
      alert('Documents verified and approved! Candidate is now HIRED. Moving to Onboarding.');
      await loadRecruitmentData();
      setActiveTab('stage-9');
    } catch (err) {
      alert('Failed to verify documents.');
    }
  };

  // Trigger real Onboarding invite
  const handleInitiateSystemOnboarding = async (candidateId: string) => {
    setOnboardingProgressId(candidateId);
    setOnboardingInviteResult(null);
    try {
      const res = await api.post(`/recruitment/applications/${candidateId}/onboard`);
      setOnboardingInviteResult(res.data.data);
      alert('Onboarding Invite successfully generated in system database!');
      await loadRecruitmentData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create onboarding invite.');
    } finally {
      setOnboardingProgressId(null);
    }
  };

  // Helper values for dashboard charts (exclude 136 auto-synced Google Form entries from board counts without database loss)
  const boardCandidates = candidates.filter(c => c.source !== 'Google Form');
  const SOURCE_DATA = boardCandidates.reduce<any[]>((acc, cur) => {
    const existing = acc.find(x => x.name === cur.source);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: cur.source, value: 1, fill: SOURCE_FILLS[cur.source] || SOURCE_FILLS.Others });
    }
    return acc;
  }, []);

  const TABS = [
    { value: 'dashboard', label: 'Dashboard', icon: BarChart2, hasDot: true },
    { value: 'stage-1', label: '1. Create Job', icon: Briefcase },
    { value: 'stage-2', label: '2. Job Posting', icon: Globe },
    { value: 'stage-3', label: '3. Applications', icon: Inbox },
    { value: 'stage-4', label: '4. AI Screening', icon: Brain },
    { value: 'stage-5', label: '5. Shortlisting', icon: StarHalf },
    { value: 'stage-6', label: '6. Interviews', icon: Calendar },
    { value: 'stage-7', label: '7. Offer', icon: Award },
    { value: 'stage-8', label: '8. Documents', icon: FolderOpen },
    { value: 'stage-9', label: '9. Onboarding', icon: UserPlus },
    { value: 'candidates', label: 'All Applicants', icon: Users },
  ];

  return (
    <div className="recruitment-page">
      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <div className="rec-topbar">
        <div className="rec-topbar-left">
          <div className="rec-title-block">
            <div className="rec-title-icon">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="rec-page-title">Recruitment Console</h1>
              <div className="rec-live-status">
                <span className="rec-live-dot" />
                <span className="rec-live-text">Live · {jobs.filter(j => j.status === 'Published' || j.status === 'OPEN').length} Active Jobs</span>
              </div>
            </div>
          </div>
        </div>
        <div className="rec-topbar-right">
          <div className="rec-search-wrap">
            <Search className="rec-search-icon" />
            <input
              type="text"
              className="rec-search-input"
              placeholder="Search candidates, jobs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="rec-icon-btn" id="rec-refresh-btn" onClick={loadRecruitmentData}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── Top Navigation Tabs Strip ────────────────────────────────────── */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.5rem 0.75rem',
          background: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          marginBottom: '1.25rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        className="rec-nav-tabs-strip"
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '0.5rem',
                fontSize: '0.78rem',
                fontWeight: isActive ? 700 : 600,
                color: isActive ? '#ffffff' : '#475569',
                background: isActive ? 'linear-gradient(135deg, #5850ec 0%, #4f46e5 100%)' : 'transparent',
                border: 0,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <Icon style={{ width: '15px', height: '15px', color: isActive ? '#ffffff' : '#64748b' }} />
              <span>{tab.label}</span>
              {tab.hasDot && isActive && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '5px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#fbbf24'
                  }} 
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-2 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="font-semibold text-sm">Loading Recruitment Data...</p>
          </div>
        ) : (
          <motion.div 
            key={activeTab} 
            initial={{ opacity: 0, y: 8 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.18 }}
            className="rec-content"
          >
            {/* ════════════════ DASHBOARD ════════════════ */}
            {activeTab === 'dashboard' && (
              <>

                {/* KPI Stats Row */}
                <div className="rec-stats-grid">
                  <StatCard icon={Briefcase} title="Active Jobs" value={jobs.filter(j => j.status === 'Published' || j.status === 'OPEN').length.toString()} trend="Job listings online" color="blue" />
                  <StatCard icon={Calendar} title="Interviews Scheduled" value={candidates.filter(c => c.stage === 'Interviews').length.toString()} trend="Interviews in progress" color="purple" />
                  <StatCard icon={Send} title="Offers Issued" value={candidates.filter(c => c.stage === 'Offer').length.toString()} trend="Offer stage candidate" color="amber" />
                  <StatCard icon={UserCheck} title="Onboarding" value={candidates.filter(c => c.stage === 'Onboarding').length.toString()} trend="Onboarding in system" color="emerald" />
                </div>

                {/* Main Dashboard Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                  {/* Candidates pipeline columns */}
                  <div className="rec-card" style={{ padding: '1.5rem' }}>
                    <div className="rec-section-header" style={{ marginBottom: '1.25rem' }}>
                      <div>
                        <h2 className="rec-section-title">Hiring Pipeline Board</h2>
                        <p className="rec-section-sub">Candidate count across primary recruitment phases</p>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                      {[
                        { key: 'Applications', label: 'Applied', color: '#3b82f6', bg: 'rgba(59,89,152,0.08)' },
                        { key: 'AI Screening', label: 'AI Screen', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
                        { key: 'Shortlisting', label: 'Shortlist', color: '#06b6d4', bg: 'rgba(6,182,212,0.08)' },
                        { key: 'Interviews', label: 'Interview', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                        { key: 'Offer', label: 'Offer', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
                        { key: 'Onboarding', label: 'Hired', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
                      ].map(stage => {
                        const count = boardCandidates.filter(c => c.stage === stage.key).length;
                        return (
                          <div key={stage.key} style={{ background: stage.bg, padding: '1rem', borderRadius: '0.75rem', textAlign: 'center', border: `1px solid ${stage.color}15` }}>
                            <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{stage.label}</p>
                            <p style={{ fontSize: '1.75rem', fontWeight: 800, color: stage.color, marginTop: '0.25rem' }}>{count}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick stats & tools */}
                  <div className="rec-card" style={{ padding: '1.25rem' }}>
                    <h3 className="rec-panel-title" style={{ marginBottom: '0.75rem' }}>Candidate Sources</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {SOURCE_DATA.length === 0 ? (
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No applicants in database yet.</p>
                      ) : (
                        SOURCE_DATA.map((src, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.35rem 0.5rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: src.fill }} />
                              <span style={{ fontWeight: 600, color: '#334155' }}>{src.name}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: '#475569' }}>{src.value} candidates</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ════════════════ STAGE 1: CREATE JOB ════════════════ */}
            {activeTab === 'stage-1' && (
              <div className="rec-card" style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <div style={{ padding: '0.5rem', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '0.75rem', display: 'flex' }}>
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="rec-section-title" style={{ fontSize: '1.1rem' }}>Stage 1: Create New Job Opening</h2>
                    <p className="rec-section-sub">Define job position details, requirements, and media to post across recruitment channels</p>
                  </div>
                </div>

                <form onSubmit={handleCreateJobSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="auth-luxury-label">
                      Job Title *
                      <input 
                        type="text" 
                        required 
                        className="rec-search-input" 
                        style={{ width: '100%', paddingLeft: '0.75rem', height: '38px', marginTop: '4px' }} 
                        placeholder="e.g. Senior Frontend Engineer"
                        value={newJob.title}
                        onChange={e => setNewJob({...newJob, title: e.target.value})}
                      />
                    </div>
                    <div className="auth-luxury-label">
                      Department *
                      <select 
                        className="rec-select" 
                        style={{ width: '100%', height: '38px', marginTop: '4px' }}
                        value={newJob.department}
                        onChange={e => setNewJob({...newJob, department: e.target.value})}
                      >
                        <option>Engineering</option>
                        <option>Product</option>
                        <option>Design</option>
                        <option>Marketing</option>
                        <option>Sales</option>
                        <option>Human Resources</option>
                        <option>Finance</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="auth-luxury-label">
                      Location
                      <input 
                        type="text" 
                        className="rec-search-input" 
                        style={{ width: '100%', paddingLeft: '0.75rem', height: '38px', marginTop: '4px' }} 
                        placeholder="e.g. Remote / New York / Bengaluru"
                        value={newJob.location}
                        onChange={e => setNewJob({...newJob, location: e.target.value})}
                      />
                    </div>
                    <div className="auth-luxury-label">
                      Employment Type
                      <select 
                        className="rec-select" 
                        style={{ width: '100%', height: '38px', marginTop: '4px' }}
                        value={newJob.type}
                        onChange={e => setNewJob({...newJob, type: e.target.value})}
                      >
                        <option>Full-time</option>
                        <option>Part-time</option>
                        <option>Contract</option>
                        <option>Internship</option>
                      </select>
                    </div>
                  </div>

                  <div className="auth-luxury-label">
                    Job Description
                    <textarea 
                      className="rec-search-input" 
                      style={{ width: '100%', padding: '0.75rem', height: '100px', marginTop: '4px', resize: 'vertical' }} 
                      placeholder="Summary of responsibilities, team structure, and day-to-day role..."
                      value={newJob.description}
                      onChange={e => setNewJob({...newJob, description: e.target.value})}
                    />
                  </div>

                  <div className="auth-luxury-label">
                    Role Requirements & Skills
                    <textarea 
                      className="rec-search-input" 
                      style={{ width: '100%', padding: '0.75rem', height: '80px', marginTop: '4px', resize: 'vertical' }} 
                      placeholder="e.g. React, TypeScript, Node.js, 3+ years experience..."
                      value={newJob.requirements}
                      onChange={e => setNewJob({...newJob, requirements: e.target.value})}
                    />
                  </div>

                  <div className="auth-luxury-label">
                    Job Banner / Media Attachment (Optional)
                    <div style={{ border: '2px dashed #cbd5e1', borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center', marginTop: '4px', background: '#f8fafc' }}>
                      {jobFilePreview ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>📷 {jobFileName} ({jobFileSize})</span>
                          <button type="button" onClick={handleRemoveJobFile} className="rec-btn-outline" style={{ fontSize: '0.65rem', padding: '2px 8px', color: '#ef4444' }}>Remove</button>
                        </div>
                      ) : (
                        <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <Paperclip className="h-6 w-6 text-slate-400" />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Click to upload banner image or spec sheet (Max 5MB)</span>
                          <input type="file" accept="image/*,.pdf" onChange={handleJobFileChange} style={{ display: 'none' }} />
                        </label>
                      )}
                    </div>
                  </div>

                  <button type="submit" className="rec-btn-primary" style={{ height: '42px', justifyContent: 'center', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                    <Plus className="h-4 w-4" /> Create & Publish Job Posting
                  </button>
                </form>
              </div>
            )}

            {/* ════════════════ STAGE 2: JOB POSTING ════════════════ */}
            {activeTab === 'stage-2' && (
              <div className="rec-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '0.5rem', background: 'linear-gradient(135deg, #0284c7, #2563eb)', borderRadius: '0.75rem', display: 'flex' }}>
                      <Globe className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="rec-section-title" style={{ fontSize: '1.1rem' }}>Stage 2: Active Job Postings & Channels</h2>
                      <p className="rec-section-sub">Manage published job listings and multi-channel recruitment distribution</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('stage-1')} className="rec-btn-primary" style={{ fontSize: '0.75rem', height: '34px' }}>
                    <Plus className="h-3.5 w-3.5" /> Post New Job
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {jobs.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.75rem' }}>
                      No active jobs posted yet. Click "Post New Job" to create your first listing.
                    </div>
                  ) : (
                    jobs.map(job => (
                      <div key={job.id} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', textTransform: 'uppercase' }}>{job.department}</span>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>{job.title}</h3>
                          </div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>{job.status}</span>
                        </div>

                        <p style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin className="h-3.5 w-3.5 text-slate-400" /> {job.location} · {job.type}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.7rem' }}>
                          <div><span style={{ color: '#94a3b8' }}>Applicants:</span> <span style={{ fontWeight: 800, color: '#4f46e5' }}>{job.applicants}</span></div>
                          <div><span style={{ color: '#94a3b8' }}>Posted:</span> <span style={{ fontWeight: 700, color: '#475569' }}>{job.postedDate}</span></div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                          <button onClick={() => setSelectedSimulatedChannel(job.id)} className="rec-btn-outline" style={{ flex: 1, fontSize: '0.7rem', height: '32px', padding: '0', justifyContent: 'center' }}>
                            <Share2 className="h-3.5 w-3.5" /> Channels
                          </button>
                          <button onClick={() => { setSelectedJobId(job.id); setActiveTab('stage-3'); }} className="rec-btn-primary" style={{ flex: 1, fontSize: '0.7rem', height: '32px', padding: '0', justifyContent: 'center' }}>
                            View Applications
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}





            {/* ════════════════ STAGE 3: APPLICATIONS & GOOGLE FORM RESPONSES ════════════════ */}
            {activeTab === 'stage-3' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Candidate list for Stage 3 */}
                <div className="rec-card" style={{ padding: '1.5rem', overflow: 'hidden', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <h2 className="rec-section-title" style={{ margin: 0 }}>Stage 3: Collected Applications</h2>
                        <p className="rec-section-sub" style={{ marginTop: '2px' }}>Candidate profiles that have entered this stage</p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button 
                          onClick={handleSyncResponses}
                          className="rec-btn-outline"
                          style={{ fontSize: '0.75rem', height: '32px', gap: '5px' }}
                          title="Re-fetch live responses and sync Google Form uploads from database"
                        >
                          <RefreshCw className={cn('h-3.5 w-3.5 text-purple-600', loading && 'animate-spin')} />
                          Sync Responses
                        </button>

                        <button 
                          onClick={() => setShowAddModal(true)} 
                          className="rec-btn-primary" 
                          style={{ fontSize: '0.75rem', height: '32px', background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' }}
                        >
                          <Plus className="h-3.5 w-3.5" /> Submit Application
                        </button>

                        {/* Source Sub-Filters */}
                        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                          <button 
                            onClick={() => setAppSourceFilter('all')} 
                            style={{ fontSize: '0.65rem', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', border: 0, background: appSourceFilter === 'all' ? '#fff' : 'transparent', color: appSourceFilter === 'all' ? '#0f172a' : '#64748b', boxShadow: appSourceFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
                          >
                            All ({candidates.filter(c => c.stage === 'Applications').length})
                          </button>
                          <button 
                            onClick={() => setAppSourceFilter('google-form')} 
                            style={{ fontSize: '0.65rem', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', border: 0, background: appSourceFilter === 'google-form' ? '#fff' : 'transparent', color: appSourceFilter === 'google-form' ? '#7e22ce' : '#64748b', boxShadow: appSourceFilter === 'google-form' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
                          >
                            Google Form ({candidates.filter(c => c.stage === 'Applications' && c.source === 'Google Form').length})
                          </button>
                          <button 
                            onClick={() => setAppSourceFilter('manual')} 
                            style={{ fontSize: '0.65rem', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', border: 0, background: appSourceFilter === 'manual' ? '#fff' : 'transparent', color: appSourceFilter === 'manual' ? '#0f172a' : '#64748b', boxShadow: appSourceFilter === 'manual' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
                          >
                            Other Sources ({candidates.filter(c => c.stage === 'Applications' && c.source !== 'Google Form').length})
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                      <table className="rec-table">
                        <thead>
                          <tr>
                            <th>Candidate</th>
                            <th>Role</th>
                            <th>Source</th>
                            <th>Media & Attachments</th>
                            <th>Skills</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidates.filter(c => {
                            if (c.stage !== 'Applications') return false;
                            if (appSourceFilter === 'google-form') return c.source === 'Google Form';
                            if (appSourceFilter === 'manual') return c.source !== 'Google Form';
                            return true;
                          }).length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                                No applications currently match the selected source filter.
                              </td>
                            </tr>
                          ) : (
                            candidates.filter(c => {
                              if (c.stage !== 'Applications') return false;
                              if (appSourceFilter === 'google-form') return c.source === 'Google Form';
                              if (appSourceFilter === 'manual') return c.source !== 'Google Form';
                              return true;
                            }).map(c => (
                              <tr key={c.id} className="rec-table-row">
                                <td>
                                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{c.firstName} {c.lastName}</p>
                                  <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{c.email}</p>
                                </td>
                                <td style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{c.jobTitle}</td>
                                <td>
                                  {c.source === 'Google Form' ? (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <FileText className="h-3 w-3 text-purple-600" />
                                      Google Form
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366f1' }}>{c.source}</span>
                                  )}
                                </td>
                                <td>
                                  {(() => {
                                    const rawAtts = [...(c.attachmentImages || [])];
                                    if (c.resumeUrl && !rawAtts.includes(c.resumeUrl) && c.resumeUrl !== 'uploaded-resume.pdf' && c.resumeUrl !== 'google-form-upload.pdf') {
                                      rawAtts.unshift(c.resumeUrl);
                                    }

                                    if (rawAtts.length === 0) {
                                      return <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontStyle: 'italic' }}>No media</span>;
                                    }

                                    const parsedAtts = rawAtts.map((att, idx) => parseAttachmentItem(att, idx));
                                    const visibleAtts = parsedAtts.slice(0, 2);
                                    const hiddenCount = parsedAtts.length - visibleAtts.length;

                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {visibleAtts.map((att, idx) => {
                                          if (att.error) {
                                            return (
                                              <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#ef4444', fontWeight: 600 }}>
                                                <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                                <span>⚠️ File unavailable</span>
                                              </div>
                                            );
                                          }

                                          return (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                              {att.type === 'image' ? (
                                                <img 
                                                  src={att.url} 
                                                  alt={att.name} 
                                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                  style={{ width: '18px', height: '18px', borderRadius: '3px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                                                />
                                              ) : att.type === 'pdf' ? (
                                                <FileText className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                                              ) : att.type === 'doc' ? (
                                                <FileText className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                              ) : att.type === 'video' ? (
                                                <Video className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                                              ) : att.type === 'spreadsheet' ? (
                                                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                              ) : att.type === 'archive' ? (
                                                <Package className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                              ) : (
                                                <Paperclip className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                                              )}

                                              <span style={{ fontWeight: 600, color: '#334155', maxWidth: '105px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={att.name}>
                                                {att.name}
                                              </span>

                                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                                                <button
                                                  onClick={() => {
                                                    if (att.type === 'image') {
                                                      setPreviewMediaAttachment(att);
                                                    } else {
                                                      window.open(att.url, '_blank');
                                                    }
                                                  }}
                                                  style={{ background: 'transparent', border: 0, padding: 0, color: '#4f46e5', fontWeight: 700, cursor: 'pointer', fontSize: '0.62rem' }}
                                                  title="View file"
                                                >
                                                  View
                                                </button>

                                                <span style={{ color: '#cbd5e1' }}>|</span>

                                                <a 
                                                  href={att.downloadUrl || att.url} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer" 
                                                  download 
                                                  style={{ color: '#0284c7', fontWeight: 700, textDecoration: 'none', fontSize: '0.62rem' }}
                                                  title="Download or Open file"
                                                >
                                                  Download
                                                </a>
                                              </div>
                                            </div>
                                          );
                                        })}

                                        {hiddenCount > 0 && (
                                          <button
                                            onClick={() => setSelectedCandidate(c)}
                                            style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}
                                          >
                                            <Paperclip className="h-3 w-3" /> +{hiddenCount} more
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                    {c.skills.slice(0, 3).map(sk => (
                                      <span key={sk} style={{ fontSize: '0.6rem', padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>{sk}</span>
                                    ))}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button onClick={() => setActiveTab('stage-4')} className="rec-btn-outline" style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem', height: '26px' }}>
                                    Go to AI Screen
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
              </div>
            )}

            {/* ════════════════ STAGE 4: AI SCREENING ════════════════ */}
            {activeTab === 'stage-4' && (
              <div className="rec-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <div style={{ padding: '0.5rem', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '0.75rem', display: 'flex' }}>
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="rec-section-title" style={{ fontSize: '1.1rem' }}>Stage 4: AI Semantic Profile Indexing</h2>
                    <p className="rec-section-sub">Scans incoming candidates using mock LLM parser to evaluate match suitability</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                  {/* Candidates List */}
                  <div>
                    <h3 className="rec-panel-title" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>Candidates Awaiting AI Screening</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="rec-table">
                        <thead>
                          <tr>
                            <th>Candidate</th>
                            <th>Role Applied</th>
                            <th>Key Skills</th>
                            <th>Match Score</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidates.filter(c => c.stage === 'Applications' || c.stage === 'AI Screening').length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                                No candidates in queue for AI evaluation. Add new applicants in Stage 3.
                              </td>
                            </tr>
                          ) : (
                            candidates.filter(c => c.stage === 'Applications' || c.stage === 'AI Screening').map(c => (
                              <tr key={c.id} className="rec-table-row">
                                <td>
                                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{c.firstName} {c.lastName}</p>
                                  <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Exp: {c.experience}</p>
                                </td>
                                <td style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>{c.jobTitle}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                    {c.skills.map(sk => (
                                      <span key={sk} style={{ fontSize: '0.6rem', padding: '2px 5px', background: '#f5f3ff', color: '#6366f1', borderRadius: '4px', fontWeight: 600 }}>{sk}</span>
                                    ))}
                                  </div>
                                </td>
                                <td>
                                  {c.matchScore > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontWeight: 800, color: '#6366f1', fontSize: '0.75rem' }}>{c.matchScore}%</span>
                                      <div style={{ width: 40, height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                                        <div style={{ width: `${c.matchScore}%`, height: '100%', background: '#6366f1' }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontStyle: 'italic' }}>Not Screened</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button 
                                    disabled={screeningCandId === c.id} 
                                    onClick={() => handleRunAIScreen(c.id)} 
                                    className="rec-btn-primary" 
                                    style={{ fontSize: '0.65rem', height: '28px', padding: '0 0.5rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                                  >
                                    {screeningCandId === c.id ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" /> Scanning...
                                      </>
                                    ) : (
                                      <>
                                        <Brain className="h-3 w-3 mr-1" /> Run AI Match
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* AI Output Terminal Panel */}
                  <div className="flex flex-col gap-4">
                    <div className="rec-card" style={{ padding: '1.25rem', background: '#1e1b4b', border: '1px solid #312e81' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #312e81', paddingBottom: '0.5rem' }}>
                        <span style={{ color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles className="h-3.5 w-3.5 text-purple-400" /> Cognitive Evaluator Output
                        </span>
                        {screeningCandId && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ec4899', animation: 'pulse 1s infinite' }} />}
                      </div>
                      <div style={{ height: '200px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.7rem', color: '#e0e7ff', lineHeight: '1.7', padding: '0.5rem' }}>
                        {screeningLogs.length === 0 ? (
                          <p style={{ color: '#4f46e5' }}>Launch "Run AI Match" on any candidate to inspect active parser steps...</p>
                        ) : (
                          screeningLogs.map((log, i) => {
                            let clr = '#e0e7ff';
                            if (log.includes('[AI SUCCESS]')) clr = '#34d399';
                            else if (log.includes('[AI SEMANTIC')) clr = '#c084fc';
                            return <p key={i} style={{ color: clr }}>{log}</p>;
                          })
                        )}
                      </div>
                    </div>

                    {candidates.some(c => c.stage === 'AI Screening') && (
                      <div className="rec-card" style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Screening Complete?</p>
                          <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Proceed to Stage 5: Shortlisting</p>
                        </div>
                        <button onClick={() => setActiveTab('stage-5')} className="rec-btn-outline" style={{ fontSize: '0.7rem' }}>
                          Review Matches <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════ STAGE 5: SHORTLISTING ════════════════ */}
            {activeTab === 'stage-5' && (
              <div className="rec-card" style={{ padding: '1.5rem' }}>
                <h2 className="rec-section-title" style={{ marginBottom: '0.5rem' }}>Stage 5: Review & Shortlist Candidates</h2>
                <p className="rec-section-sub" style={{ marginBottom: '1.5rem' }}>Compare suitability scores and approve profiles for interview coordination</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                  {candidates.filter(c => c.stage === 'AI Screening' || c.stage === 'Shortlisting').length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.75rem' }}>
                      No candidates currently in shortlisting evaluation pool. Evaluate applicants using AI Match first in Stage 4.
                    </div>
                  ) : (
                    candidates.filter(c => c.stage === 'AI Screening' || c.stage === 'Shortlisting').map(c => (
                      <div key={c.id} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{c.firstName} {c.lastName}</h3>
                            <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, marginTop: '0.125rem' }}>{c.jobTitle}</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: c.matchScore >= 80 ? '#10b981' : '#6366f1' }}>{c.matchScore}%</span>
                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Match Score</span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.7rem' }}>
                          <div><span style={{ color: '#94a3b8' }}>Exp:</span> <span style={{ fontWeight: 700, color: '#475569' }}>{c.experience}</span></div>
                          <div><span style={{ color: '#94a3b8' }}>Source:</span> <span style={{ fontWeight: 700, color: '#475569' }}>{c.source}</span></div>
                        </div>

                        <div>
                          <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>Skills Fit</p>
                          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                            {c.skills.map(sk => (
                              <span key={sk} style={{ fontSize: '0.6rem', padding: '2px 6px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '4px', fontWeight: 700 }}>{sk}</span>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                          <button 
                            onClick={() => updateCandidateStage(c.id, 'Rejected')} 
                            className="rec-btn-outline" 
                            style={{ flex: 1, fontSize: '0.7rem', color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2', height: '32px', padding: '0' }}
                          >
                            Reject
                          </button>
                          {c.stage !== 'Shortlisting' ? (
                            <button 
                              onClick={() => updateCandidateStage(c.id, 'Shortlisting')} 
                              className="rec-btn-primary" 
                              style={{ flex: 1, fontSize: '0.7rem', height: '32px', padding: '0', justifyContent: 'center' }}
                            >
                              Approve Shortlist
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                setSelectedCandidate(c);
                                setActiveTab('stage-6');
                              }} 
                              className="rec-btn-primary" 
                              style={{ flex: 1, fontSize: '0.7rem', height: '32px', padding: '0', justifyContent: 'center', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                            >
                              Schedule Interview
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ════════════════ STAGE 6: INTERVIEWS ════════════════ */}
            {activeTab === 'stage-6' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', alignItems: 'start' }}>
                {/* Interview Scheduler Form */}
                <div className="rec-card" style={{ padding: '1.5rem' }}>
                  <h2 className="rec-section-title" style={{ marginBottom: '1rem' }}>Stage 6: Coordinate Interview</h2>
                  <p className="rec-section-sub" style={{ marginBottom: '1.5rem' }}>Set date, time, and team panel members</p>
                  
                  <div className="auth-luxury-label" style={{ marginBottom: '1.25rem' }}>
                    Choose Shortlisted Candidate
                    <select 
                      className="rec-select" 
                      style={{ width: '100%', height: '38px' }}
                      value={selectedCandidate?.id || ''}
                      onChange={e => {
                        const cand = candidates.find(c => c.id === e.target.value);
                        setSelectedCandidate(cand || null);
                      }}
                    >
                      <option value="">-- Choose Candidate --</option>
                      {candidates.filter(c => c.stage === 'Shortlisting' || c.stage === 'Interviews').map(c => (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.jobTitle})</option>
                      ))}
                    </select>
                  </div>

                  {selectedCandidate && (
                    <form onSubmit={(e) => { e.preventDefault(); handleScheduleInterview(selectedCandidate.id); }} className="flex flex-col gap-3">
                      <div className="auth-luxury-label">
                        Interview Date
                        <input 
                          type="date" 
                          className="rec-search-input" 
                          style={{ width: '100%', paddingLeft: '1rem', height: '36px' }}
                          value={interviewForm.date}
                          onChange={e => setInterviewForm({...interviewForm, date: e.target.value})}
                        />
                      </div>
                      <div className="auth-luxury-label">
                        Time Slot
                        <input 
                          type="text" 
                          className="rec-search-input" 
                          style={{ width: '100%', paddingLeft: '1rem', height: '36px' }}
                          placeholder="e.g. 11:30 AM"
                          value={interviewForm.time}
                          onChange={e => setInterviewForm({...interviewForm, time: e.target.value})}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div className="auth-luxury-label">
                          Interview Type
                          <select 
                            className="rec-select" 
                            style={{ width: '100%', height: '36px' }}
                            value={interviewForm.type}
                            onChange={e => setInterviewForm({...interviewForm, type: e.target.value})}
                          >
                            <option>Technical</option>
                            <option>Behavioral</option>
                            <option>HR Screening</option>
                            <option>Management</option>
                          </select>
                        </div>
                        <div className="auth-luxury-label">
                          Interviewer Name
                          <input 
                            type="text" 
                            className="rec-search-input" 
                            style={{ width: '100%', paddingLeft: '1rem', height: '36px' }}
                            placeholder="e.g. Sneha Nair"
                            value={interviewForm.interviewer}
                            onChange={e => setInterviewForm({...interviewForm, interviewer: e.target.value})}
                          />
                        </div>
                      </div>

                      <button type="submit" className="rec-btn-primary" style={{ height: '38px', justifyContent: 'center', marginTop: '0.5rem' }}>
                        <Calendar className="h-4 w-4" /> Save Schedule details
                      </button>
                    </form>
                  )}
                </div>

                {/* Interviews Schedule List */}
                <div className="rec-card" style={{ padding: '1.5rem' }}>
                  <h2 className="rec-section-title" style={{ marginBottom: '1rem' }}>Active Interview Processes</h2>
                  <p className="rec-section-sub" style={{ marginBottom: '1.25rem' }}>Pass/fail candidates based on interviews</p>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table className="rec-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Schedule</th>
                          <th>Panel</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'left', paddingLeft: '1rem' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.filter(c => c.stage === 'Interviews').length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                              No active interviews scheduled. Use form to setup interviews for shortlisted candidates.
                            </td>
                          </tr>
                        ) : (
                          candidates.filter(c => c.stage === 'Interviews').map(c => (
                            <tr key={c.id} className="rec-table-row">
                              <td>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{c.firstName} {c.lastName}</p>
                                <p style={{ fontSize: '0.65rem', color: '#64748b' }}>{c.jobTitle}</p>
                              </td>
                              <td>
                                {c.interviewDate ? (
                                  <div>
                                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5' }}>{c.interviewDate}</p>
                                    <p style={{ fontSize: '0.65rem', color: '#64748b' }}>{c.interviewTime}</p>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontStyle: 'italic' }}>Pending inputs</span>
                                )}
                              </td>
                              <td>
                                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>{c.interviewer}</p>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{c.interviewType}</p>
                              </td>
                              <td>
                                <span style={{ fontSize: '0.65rem', padding: '3px 8px', background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7', borderRadius: '6px', fontWeight: 700 }}>
                                  Scheduled
                                </span>
                              </td>
                              <td style={{ textAlign: 'left', paddingLeft: '1rem' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
                                  <button onClick={() => handleInterviewDecision(c.id, 'fail')} className="rec-btn-outline" style={{ fontSize: '0.65rem', color: '#ef4444', borderColor: '#fca5a5', padding: '0 0.5rem', height: '26px' }}>
                                    Fail
                                  </button>
                                  <button onClick={() => handleInterviewDecision(c.id, 'pass')} className="rec-btn-primary" style={{ fontSize: '0.65rem', padding: '0 0.5rem', height: '26px', background: '#10b981' }}>
                                    Pass & Offer
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════ STAGE 7: OFFER ════════════════ */}
            {activeTab === 'stage-7' && (
              <div className="rec-card" style={{ padding: '1.5rem' }}>
                <h2 className="rec-section-title" style={{ marginBottom: '0.5rem' }}>Stage 7: Offer Letter Administration</h2>
                <p className="rec-section-sub" style={{ marginBottom: '1.5rem' }}>Draft salary details and issue contracts to selected candidates</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                  {candidates.filter(c => c.stage === 'Offer').length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.75rem' }}>
                      No candidates currently in Offer Phase. Mark candidates as passed in Stage 6.
                    </div>
                  ) : (
                    candidates.filter(c => c.stage === 'Offer').map(c => (
                      <div key={c.id} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                          <div>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{c.firstName} {c.lastName}</h3>
                            <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{c.jobTitle} · Exp: {c.experience}</p>
                          </div>
                          <div>
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase',
                              c.offerStatus === 'SENT' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                            )}>
                              {c.offerStatus || 'PENDING'}
                            </span>
                          </div>
                        </div>

                        {c.offerStatus !== 'SENT' ? (
                          <div className="flex flex-col gap-3">
                            <div className="auth-luxury-label">
                              Joining Date
                              <input 
                                type="date" 
                                className="rec-search-input" 
                                style={{ width: '100%', paddingLeft: '1rem', height: '36px' }}
                                value={offerForm.joiningDate}
                                onChange={e => setOfferForm({...offerForm, joiningDate: e.target.value})}
                              />
                            </div>
                            <div className="auth-luxury-label">
                              Base Salary (INR gross/month)
                              <input 
                                type="number" 
                                className="rec-search-input" 
                                style={{ width: '100%', paddingLeft: '1rem', height: '36px' }}
                                value={offerForm.salary}
                                onChange={e => setOfferForm({...offerForm, salary: e.target.value})}
                              />
                            </div>
                            <button 
                              onClick={() => handleExtendOfferSubmit(c.id)} 
                              className="rec-btn-primary" 
                              style={{ width: '100%', height: '36px', justifyContent: 'center' }}
                            >
                              <Send className="h-4 w-4" /> Send Offer Letter
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.75rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '0.75rem' }}>
                              <div><span style={{ color: '#94a3b8' }}>Offered Base:</span> <p style={{ fontWeight: 800, color: '#334155', marginTop: '2px' }}>₹{c.offerSalary?.toLocaleString()}</p></div>
                              <div><span style={{ color: '#94a3b8' }}>Joining Date:</span> <p style={{ fontWeight: 800, color: '#334155', marginTop: '2px' }}>{c.offerJoiningDate}</p></div>
                            </div>
                            
                            <div style={{ border: '1px dashed #cbd5e1', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center', background: '#fffbeb' }}>
                              <p style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 700 }}>Candidate Offer Review Simulation</p>
                              <p style={{ fontSize: '0.62rem', color: '#d97706', marginTop: '2px' }}>Simulate applicant response to offer letter</p>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '0.5rem' }}>
                                <button 
                                  onClick={() => updateCandidateStage(c.id, 'Rejected')} 
                                  className="rec-btn-outline" 
                                  style={{ fontSize: '0.65rem', height: '26px', color: '#ef4444', borderColor: '#fca5a5' }}
                                >
                                  Decline Offer
                                </button>
                                <button 
                                  onClick={() => handleSimulateOfferAcceptance(c.id)} 
                                  className="rec-btn-primary" 
                                  style={{ fontSize: '0.65rem', height: '26px', background: '#10b981' }}
                                >
                                  Accept Offer
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ════════════════ STAGE 8: DOCUMENTS ════════════════ */}
            {activeTab === 'stage-8' && (
              <div className="rec-card" style={{ padding: '1.5rem' }}>
                <h2 className="rec-section-title" style={{ marginBottom: '0.5rem' }}>Stage 8: Document Verification</h2>
                <p className="rec-section-sub" style={{ marginBottom: '1.5rem' }}>HR collects and verifies credential proofs before onboard activation</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                  {candidates.filter(c => c.stage === 'Documents').length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.75rem' }}>
                      No candidates currently in Document verification. Collect candidate offer acceptance in Stage 7.
                    </div>
                  ) : (
                    candidates.filter(c => c.stage === 'Documents').map(c => (
                      <div key={c.id} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{c.firstName} {c.lastName}</h3>
                          <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{c.jobTitle} · Joint: {c.offerJoiningDate}</p>
                        </div>

                        <div>
                          <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem' }}>Collected Document Verification Scans</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {[
                              { type: 'Govt Identity Proof', field: 'identity' },
                              { type: 'Work Experience Certificate', field: 'work' },
                              { type: 'Highest Education Proof', field: 'edu' },
                            ].map((doc, idx) => {
                              const uploaded = c.attachmentImages && c.attachmentImages.length > idx;
                              return (
                                <div key={doc.field} style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                                    <FileText className="h-4 w-4 text-indigo-500" />
                                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155' }}>{doc.type}</span>
                                  </div>
                                  <div>
                                    {uploaded ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                          <CheckCircle className="h-3.5 w-3.5" /> Uploaded
                                        </span>
                                        <button onClick={() => {
                                          if (c.attachmentImages) setSelectedCandidate(c);
                                        }} className="rec-icon-btn" style={{ width: 24, height: 24 }}>
                                          <Eye className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button 
                                        disabled={uploadingDocType !== null} 
                                        onClick={() => handleUploadMockDoc(c.id, doc.type)} 
                                        className="rec-btn-outline" 
                                        style={{ fontSize: '0.65rem', height: '24px', padding: '0 0.5rem' }}
                                      >
                                        {uploadingDocType === doc.type ? 'Uploading...' : 'Upload Mock Scan'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <button 
                          disabled={!c.attachmentImages || c.attachmentImages.length < 3} 
                          onClick={() => handleVerifyDocumentsSubmit(c.id)} 
                          className="rec-btn-primary" 
                          style={{ width: '100%', height: '36px', justifyContent: 'center', marginTop: '0.5rem', background: (!c.attachmentImages || c.attachmentImages.length < 3) ? '#cbd5e1' : undefined }}
                        >
                          <UserCheck className="h-4 w-4" /> Verify & Approve Documents
                        </button>
                        {(!c.attachmentImages || c.attachmentImages.length < 3) && (
                          <p style={{ fontSize: '0.62rem', color: '#94a3b8', textAlign: 'center', marginTop: '-0.25rem' }}>Upload all mock scans first to enable verification</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ════════════════ STAGE 9: ONBOARDING ════════════════ */}
            {activeTab === 'stage-9' && (
              <div className="rec-card" style={{ padding: '1.5rem' }}>
                <h2 className="rec-section-title" style={{ marginBottom: '0.5rem' }}>Stage 9: Initialize System Onboarding Invite</h2>
                <p className="rec-section-sub" style={{ marginBottom: '1.5rem' }}>Final step: Issue formal onboarding credentials and welcome token into the HRMS database</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: onboardingInviteResult ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                  {onboardingInviteResult ? (
                    <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '1rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ padding: '0.5rem', background: '#10b981', borderRadius: '50%', display: 'flex', color: '#fff' }}>
                          <CheckCircle className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#14532d' }}>Onboarding Invite Successfully Activated!</h3>
                          <p style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>System Token registered on Tenant Isolation context</p>
                        </div>
                      </div>

                      <div style={{ background: '#fff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #dcfce7', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <p><span style={{ color: '#64748b', fontWeight: 600 }}>Employee Name:</span> <span style={{ fontWeight: 800, color: '#334155' }}>{onboardingInviteResult.invite?.firstName} {onboardingInviteResult.invite?.lastName}</span></p>
                        <p><span style={{ color: '#64748b', fontWeight: 600 }}>Access Email:</span> <span style={{ fontWeight: 800, color: '#334155' }}>{onboardingInviteResult.invite?.personalEmail}</span></p>
                        <p><span style={{ color: '#64748b', fontWeight: 600 }}>Designation Role:</span> <span style={{ fontWeight: 800, color: '#334155' }}>{onboardingInviteResult.invite?.designation}</span></p>
                        <p><span style={{ color: '#64748b', fontWeight: 600 }}>Starting Salary:</span> <span style={{ fontWeight: 800, color: '#334155' }}>₹{onboardingInviteResult.invite?.baseSalary?.toLocaleString()}/month</span></p>
                        <p><span style={{ color: '#64748b', fontWeight: 600 }}>Onboarding Token:</span> <span style={{ fontWeight: 800, color: '#4f46e5', fontFamily: 'monospace' }}>{onboardingInviteResult.invite?.token}</span></p>
                      </div>

                      <div className="auth-luxury-label">
                        Generated Portal Onboarding Link
                        <div style={{ display: 'flex', gap: '6px', marginTop: '0.25rem' }}>
                          <input 
                            type="text" 
                            readOnly 
                            className="rec-search-input" 
                            style={{ flex: 1, paddingLeft: '0.75rem', background: '#fff' }} 
                            value={`${window.location.origin}/onboarding/invite/${onboardingInviteResult.invite?.token}`} 
                          />
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/onboarding/invite/${onboardingInviteResult.invite?.token}`);
                              alert('Link copied to clipboard!');
                            }} 
                            className="rec-btn-outline" 
                            style={{ padding: '0 0.75rem' }}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button onClick={() => setOnboardingInviteResult(null)} className="rec-btn-outline" style={{ flex: 1, height: '36px', padding: '0', justifyContent: 'center' }}>
                          Onboard Another Hired Candidate
                        </button>
                        <a 
                          href={`/onboarding/invite/${onboardingInviteResult.invite?.token}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="rec-btn-primary text-center" 
                          style={{ flex: 1, height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                        >
                          Launch Candidate Portal <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </a>
                      </div>
                    </div>
                  ) : candidates.filter(c => c.stage === 'Onboarding' || c.stage === 'Hired').length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.75rem' }}>
                      No candidates currently awaiting onboarding invitation. Verify document approvals in Stage 8.
                    </div>
                  ) : (
                    candidates.filter(c => c.stage === 'Onboarding' || c.stage === 'Hired').map(c => (
                      <div key={c.id} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{c.firstName} {c.lastName}</h3>
                          <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{c.jobTitle} · Email: {c.email}</p>
                        </div>

                        <div style={{ background: '#faf5ff', border: '1px solid #f3e8ff', borderRadius: '0.75rem', padding: '0.75rem', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <p><span style={{ color: '#7c3aed', fontWeight: 700 }}>Contract Department:</span> <span style={{ color: '#4b5563', fontWeight: 800 }}>General Engineering</span></p>
                          <p><span style={{ color: '#7c3aed', fontWeight: 700 }}>Monthly Salary Rate:</span> <span style={{ color: '#4b5563', fontWeight: 800 }}>₹{c.offerSalary?.toLocaleString() || '75,000'}</span></p>
                          <p><span style={{ color: '#7c3aed', fontWeight: 700 }}>Start Date:</span> <span style={{ color: '#4b5563', fontWeight: 800 }}>{c.offerJoiningDate || 'Immediate'}</span></p>
                        </div>

                        <button 
                          disabled={onboardingProgressId === c.id} 
                          onClick={() => handleInitiateSystemOnboarding(c.id)} 
                          className="rec-btn-primary animate-pulse" 
                          style={{ width: '100%', height: '38px', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                        >
                          {onboardingProgressId === c.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Initializing Onboarding invite...
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4" /> Initialize System Onboarding Invite
                            </>
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ════════════════ ALL APPLICANTS ════════════════ */}
            {activeTab === 'candidates' && (
              <div className="rec-card" style={{ padding: 0 }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div className="rec-search-wrap" style={{ maxWidth: 360, flex: 1 }}>
                    <Search className="rec-search-icon" />
                    <input 
                      type="text" 
                      className="rec-search-input" 
                      placeholder="Search by name, skill, or job..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="rec-table">
                    <thead>
                      <tr>
                        <th>Candidate Name</th>
                        <th>Application Details</th>
                        <th>Active Stage</th>
                        <th style={{ textAlign: 'center' }}>Match Suitability</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.filter(c =>
                        searchQuery === '' ||
                        `${c.firstName} ${c.lastName} ${c.jobTitle} ${c.stage}`.toLowerCase().includes(searchQuery.toLowerCase())
                      ).length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                            No candidates found matching query.
                          </td>
                        </tr>
                      ) : (
                        candidates.filter(c =>
                          searchQuery === '' ||
                          `${c.firstName} ${c.lastName} ${c.jobTitle} ${c.stage}`.toLowerCase().includes(searchQuery.toLowerCase())
                        ).map(c => (
                          <tr key={c.id} className="rec-table-row" id={`rec-cand-row-${c.id}`}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className={cn('h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm border', c.avatarColor || 'bg-slate-100 text-slate-600 border-slate-200')}>
                                  {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                                </div>
                                <div>
                                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>{c.firstName} {c.lastName}</p>
                                  <p style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>{c.email}</p>
                                </div>
                              </div>
                            </td>
                            <td>
                              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>{c.jobTitle}</p>
                              <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>Exp: {c.experience} · {c.source}</p>
                            </td>
                            <td>
                              <span className={cn(
                                'rec-stage-badge px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase',
                                c.stage === 'Onboarding' ? 'bg-teal-50 text-teal-600 border-teal-100' :
                                c.stage === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                c.stage === 'Offer' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                'bg-blue-50 text-blue-600 border-blue-100'
                              )}>
                                {c.stage}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {c.matchScore > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                  <div style={{ width: 64, height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: '#6366f1', borderRadius: 99, width: `${c.matchScore}%` }} />
                                  </div>
                                  <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#6366f1' }}>{c.matchScore}%</span>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontStyle: 'italic' }}>Not evaluated</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="rec-icon-btn" style={{ marginLeft: 'auto' }} id={`rec-view-cand-${c.id}`} onClick={() => setSelectedCandidate(c)}>
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Simulated Job Listing Web Previews ── */}
      <AnimatePresence>
        {selectedSimulatedChannel && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setSelectedSimulatedChannel(null)}
            className="rec-modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              onClick={e => e.stopPropagation()}
              className="rec-card" 
              style={{ width: '90%', maxWidth: '600px', padding: '2rem', maxHeight: '85vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe className="h-5 w-5 text-indigo-500" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Simulated candidate view: {selectedSimulatedChannel} listing</span>
                </div>
                <button onClick={() => setSelectedSimulatedChannel(null)} className="rec-modal-close">✕</button>
              </div>
              
              {(() => {
                const job = jobs.find(j => j.id === selectedJobId);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: 'sans-serif' }}>
                    <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{job?.title}</h3>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>{job?.department} · {job?.location} · {job?.type}</p>
                    </div>

                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>About the Role</p>
                      <p style={{ fontSize: '0.75rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{job?.description}</p>
                    </div>

                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Skills Requirements</p>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(job?.description || '').includes(',') ? (job?.description || '').split(',').map((s: string) => (
                          <span key={s} style={{ fontSize: '0.65rem', padding: '3px 8px', background: '#f5f3ff', color: '#6366f1', borderRadius: '4px', fontWeight: 700 }}>{s.trim()}</span>
                        )) : (
                          <span style={{ fontSize: '0.65rem', padding: '3px 8px', background: '#f5f3ff', color: '#6366f1', borderRadius: '4px', fontWeight: 700 }}>Full Stack React/Node Developer</span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Interested? Apply directly through our company career portal.</span>
                      <button onClick={() => { setSelectedSimulatedChannel(null); setActiveTab('stage-3'); }} className="rec-btn-primary" style={{ fontSize: '0.7rem' }}>
                        Apply Now
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Candidate Profile Viewer modal (Stage 8 attachment previewing) ── */}
      <AnimatePresence>
        {selectedCandidate && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setSelectedCandidate(null)}
            className="rec-modal-backdrop"
            style={{ zIndex: 9999 }}
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              onClick={e => e.stopPropagation()}
              className="rec-modal"
              style={{ maxWidth: '640px' }}
            >
              <div className="rec-modal-header" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff' }}>
                <div>
                  <h2 className="rec-modal-title" style={{ color: '#fff', fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
                    {selectedCandidate.firstName} {selectedCandidate.lastName}
                  </h2>
                  <p className="rec-modal-sub" style={{ color: '#94a3b8', marginTop: '2px', fontSize: '0.75rem' }}>
                    {selectedCandidate.jobTitle} · Source: {selectedCandidate.source}
                  </p>
                </div>
                <button className="rec-modal-close" style={{ color: '#fff' }} onClick={() => setSelectedCandidate(null)}>✕</button>
              </div>
              <div className="rec-modal-body" style={{ padding: '1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
                {/* Documents & Media Section */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText className="h-4 w-4 text-indigo-600" />
                      Documents & Media Attachments
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                      {(() => {
                        const rawAtts = [...(selectedCandidate.attachmentImages || [])];
                        if (selectedCandidate.resumeUrl && !rawAtts.includes(selectedCandidate.resumeUrl) && selectedCandidate.resumeUrl !== 'uploaded-resume.pdf' && selectedCandidate.resumeUrl !== 'google-form-upload.pdf') {
                          rawAtts.unshift(selectedCandidate.resumeUrl);
                        }
                        return `${rawAtts.length} file${rawAtts.length === 1 ? '' : 's'}`;
                      })()}
                    </span>
                  </div>

                  {(() => {
                    const rawAtts = [...(selectedCandidate.attachmentImages || [])];
                    if (selectedCandidate.resumeUrl && !rawAtts.includes(selectedCandidate.resumeUrl) && selectedCandidate.resumeUrl !== 'uploaded-resume.pdf' && selectedCandidate.resumeUrl !== 'google-form-upload.pdf') {
                      rawAtts.unshift(selectedCandidate.resumeUrl);
                    }

                    if (rawAtts.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '0.75rem' }}>
                          <Paperclip className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                          <p style={{ margin: 0, fontWeight: 600 }}>No attachments uploaded for this candidate.</p>
                        </div>
                      );
                    }

                    const parsedAtts = rawAtts.map((att, idx) => parseAttachmentItem(att, idx));

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem' }}>
                        {parsedAtts.map((att, idx) => (
                          <div key={idx} style={{ border: '1.5px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                            {/* Card Header Preview / Icon */}
                            <div style={{ height: '110px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #e2e8f0', overflow: 'hidden', position: 'relative' }}>
                              {att.error ? (
                                <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '0.7rem' }}>
                                  <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-amber-500" />
                                  <span>⚠️ File unavailable</span>
                                </div>
                              ) : att.type === 'image' ? (
                                <img 
                                  src={att.url} 
                                  alt={att.name} 
                                  onClick={() => setPreviewMediaAttachment(att)}
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                />
                              ) : (
                                <div style={{ textAlign: 'center' }}>
                                  {att.type === 'pdf' ? (
                                    <FileText className="h-10 w-10 text-rose-500 mx-auto mb-1" />
                                  ) : att.type === 'doc' ? (
                                    <FileText className="h-10 w-10 text-blue-500 mx-auto mb-1" />
                                  ) : att.type === 'video' ? (
                                    <Video className="h-10 w-10 text-purple-500 mx-auto mb-1" />
                                  ) : att.type === 'spreadsheet' ? (
                                    <FileSpreadsheet className="h-10 w-10 text-emerald-500 mx-auto mb-1" />
                                  ) : att.type === 'archive' ? (
                                    <Package className="h-10 w-10 text-amber-500 mx-auto mb-1" />
                                  ) : (
                                    <Paperclip className="h-10 w-10 text-slate-500 mx-auto mb-1" />
                                  )}
                                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                                    {att.type}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Card Details */}
                            <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={att.name}>
                                  {att.name}
                                </p>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: 0 }}>
                                  {att.mimeType || 'Document'} {att.sizeStr ? `· ${att.sizeStr}` : ''}
                                </p>
                              </div>

                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                <button
                                  onClick={() => {
                                    if (att.type === 'image') {
                                      setPreviewMediaAttachment(att);
                                    } else {
                                      window.open(att.url, '_blank');
                                    }
                                  }}
                                  className="rec-btn-outline"
                                  style={{ flex: 1, fontSize: '0.7rem', padding: '4px', height: '28px', justifyContent: 'center' }}
                                >
                                  <Eye className="h-3.5 w-3.5 text-indigo-600" /> View
                                </button>
                                <a
                                  href={att.downloadUrl || att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="rec-btn-primary"
                                  style={{ flex: 1, fontSize: '0.7rem', padding: '4px', height: '28px', justifyContent: 'center', textDecoration: 'none', background: '#334155' }}
                                >
                                  <Download className="h-3.5 w-3.5" /> Download
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Light-box Image Preview Modal */}
        {previewMediaAttachment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rec-modal-backdrop"
            style={{ zIndex: 99999 }}
            onClick={() => setPreviewMediaAttachment(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rec-modal"
              style={{ maxWidth: '680px', padding: '1rem', background: '#0f172a', color: '#fff' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #334155' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye className="h-4 w-4 text-purple-400" />
                  {previewMediaAttachment.name}
                </h3>
                <button
                  onClick={() => setPreviewMediaAttachment(null)}
                  style={{ background: 'none', border: 0, color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '1rem 0', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '280px', maxHeight: '70vh' }}>
                {previewMediaAttachment.error ? (
                  <div style={{ textAlign: 'center', color: '#f87171' }}>
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                    <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>⚠️ File unavailable</p>
                  </div>
                ) : (
                  <img
                    src={previewMediaAttachment.url}
                    alt={previewMediaAttachment.name}
                    style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '0.5rem', border: '1px solid #334155' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #334155' }}>
                <a
                  href={previewMediaAttachment.downloadUrl || previewMediaAttachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="rec-btn-primary"
                  style={{ fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download className="h-4 w-4" /> Download Original
                </a>
                <button
                  onClick={() => setPreviewMediaAttachment(null)}
                  className="rec-btn-outline"
                  style={{ fontSize: '0.75rem', color: '#fff', borderColor: '#475569' }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Real-time Candidate Application Modal */}
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rec-modal-backdrop"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rec-modal"
              style={{ maxWidth: '520px' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="rec-modal-header" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText className="h-5 w-5" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Submit Real-Time Application</h3>
                </div>
                <button className="rec-modal-close" style={{ color: '#fff' }} onClick={() => setShowAddModal(false)}>✕</button>
              </div>
              <div className="rec-modal-body" style={{ padding: '1.25rem' }}>
                <form onSubmit={handleRealtimeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>Job Opening</label>
                    <select 
                      className="rec-select" 
                      style={{ width: '100%', height: '38px' }}
                      value={modalApplicant.jobId || selectedJobId}
                      onChange={e => setModalApplicant({...modalApplicant, jobId: e.target.value})}
                    >
                      <option value="">-- Select Active Job --</option>
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>{j.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>Applicant Name *</label>
                    <input 
                      type="text" 
                      required
                      className="rec-search-input" 
                      style={{ width: '100%', paddingLeft: '0.75rem', height: '38px' }}
                      value={modalApplicant.name}
                      onChange={e => setModalApplicant({...modalApplicant, name: e.target.value})}
                      placeholder="e.g. Ramesh Kumar"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>Email Address *</label>
                      <input 
                        type="email" 
                        required
                        className="rec-search-input" 
                        style={{ width: '100%', paddingLeft: '0.75rem', height: '38px' }}
                        value={modalApplicant.email}
                        onChange={e => setModalApplicant({...modalApplicant, email: e.target.value})}
                        placeholder="ramesh@example.com"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>Phone Number</label>
                      <input 
                        type="text" 
                        className="rec-search-input" 
                        style={{ width: '100%', paddingLeft: '0.75rem', height: '38px' }}
                        value={modalApplicant.phone}
                        onChange={e => setModalApplicant({...modalApplicant, phone: e.target.value})}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>Experience</label>
                      <input 
                        type="text" 
                        className="rec-search-input" 
                        style={{ width: '100%', paddingLeft: '0.75rem', height: '38px' }}
                        value={modalApplicant.experience}
                        onChange={e => setModalApplicant({...modalApplicant, experience: e.target.value})}
                        placeholder="e.g. 3.5 Years"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>Source</label>
                      <select 
                        className="rec-select" 
                        style={{ width: '100%', height: '38px' }}
                        value={modalApplicant.source}
                        onChange={e => setModalApplicant({...modalApplicant, source: e.target.value})}
                      >
                        <option>Google Form</option>
                        <option>LinkedIn</option>
                        <option>Career Page</option>
                        <option>Naukri</option>
                        <option>Wellfound</option>
                        <option>Direct</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>Skills (Comma separated)</label>
                    <input 
                      type="text" 
                      className="rec-search-input" 
                      style={{ width: '100%', paddingLeft: '0.75rem', height: '38px' }}
                      value={modalApplicant.skills}
                      onChange={e => setModalApplicant({...modalApplicant, skills: e.target.value})}
                      placeholder="React, Node.js, TypeScript"
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button type="button" className="rec-btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                    <button type="submit" className="rec-btn-primary" disabled={submittingApp} style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' }}>
                      {submittingApp ? 'Saving to Database...' : 'Save Real-Time Application'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, title, value, trend, color }: any) {
  const colorMap: Record<string, { icon: string, bg: string }> = {
    blue:    { icon: 'text-blue-600',    bg: 'bg-blue-50' },
    indigo:  { icon: 'text-indigo-600',  bg: 'bg-indigo-50' },
    purple:  { icon: 'text-purple-600',  bg: 'bg-purple-50' },
    amber:   { icon: 'text-amber-600',   bg: 'bg-amber-50' },
    emerald: { icon: 'text-emerald-600', bg: 'bg-emerald-50' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className="rec-stat-card">
      <div className={cn('rec-stat-icon-wrap', c.bg, c.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="rec-stat-label">{title}</p>
        <p className="rec-stat-value">{value}</p>
      </div>
      <div className="rec-stat-trend text-slate-400">
        {trend}
      </div>
    </div>
  );
}
