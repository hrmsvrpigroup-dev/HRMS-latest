import { useState, useEffect, useRef } from 'react';
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
  BookOpen, FileText, BarChart2, PieChart as PieChartIcon, Cpu, Copy, ExternalLink
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
  description: string;
  mediaUrl?: string;
}

// ─── 9 Pipeline Stages Config ──────────────────────────────────────────

const STAGES = [
  { step: '1', key: 'stage-1', title: 'Create Job', desc: 'Define role & reqs', icon: Briefcase, color: 'bg-blue-50 text-blue-600 border-blue-200', activeBg: 'bg-blue-600 text-white border-blue-600' },
  { step: '2', key: 'stage-2', title: 'Job Posting', desc: 'Publish to portals', icon: Globe, color: 'bg-indigo-50 text-indigo-600 border-indigo-200', activeBg: 'bg-indigo-600 text-white border-indigo-600' },
  { step: '3', key: 'stage-3', title: 'Applications', desc: 'Receive & collect', icon: Inbox, color: 'bg-pink-50 text-pink-600 border-pink-200', activeBg: 'bg-pink-600 text-white border-pink-600' },
  { step: '4', key: 'stage-4', title: 'AI Screening', desc: 'AI-Powered screen', icon: Brain, color: 'bg-purple-50 text-purple-600 border-purple-200', activeBg: 'bg-purple-600 text-white border-purple-600' },
  { step: '5', key: 'stage-5', title: 'Shortlisting', desc: 'Review best matches', icon: StarHalf, color: 'bg-sky-50 text-sky-600 border-sky-200', activeBg: 'bg-sky-600 text-white border-sky-600' },
  { step: '6', key: 'stage-6', title: 'Interviews', desc: 'Schedule & conduct', icon: Calendar, color: 'bg-amber-50 text-amber-600 border-amber-200', activeBg: 'bg-amber-600 text-white border-amber-600' },
  { step: '7', key: 'stage-7', title: 'Offer', desc: 'Extend offer', icon: Award, color: 'bg-orange-50 text-orange-600 border-orange-200', activeBg: 'bg-orange-600 text-white border-orange-600' },
  { step: '8', key: 'stage-8', title: 'Documents', desc: 'Collect & verify', icon: FolderOpen, color: 'bg-green-50 text-green-600 border-green-200', activeBg: 'bg-green-600 text-white border-green-600' },
  { step: '9', key: 'stage-9', title: 'Onboarding', desc: 'Welcome new hire', icon: UserPlus, color: 'bg-teal-50 text-teal-600 border-teal-200', activeBg: 'bg-teal-600 text-white border-teal-600' },
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

export default function Recruitment() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  
  // State for forms & UI flows
  const [selectedJobId, setSelectedJobId] = useState<string>('');
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
      alert(`Job "${createdJob.title}" created successfully! Moving to Stage 2: Job Posting.`);
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
      setActiveTab('stage-2');
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

  // Helper values for dashboard charts
  const SOURCE_DATA = candidates.reduce<any[]>((acc, cur) => {
    const existing = acc.find(x => x.name === cur.source);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: cur.source, value: 1, fill: SOURCE_FILLS[cur.source] || SOURCE_FILLS.Others });
    }
    return acc;
  }, []);

  const TABS = [
    { value: 'dashboard', label: 'Dashboard', icon: BarChart2 },
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
                <span className="rec-sep">·</span>
                <span className="rec-muted-text">{candidates.length} total candidates in system</span>
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

      {/* ── Tab Navigation ─────────────────────────────────────────────── */}
      <div className="rec-tab-nav">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              id={`rec-tab-${tab.value}`}
              onClick={() => {
                setActiveTab(tab.value);
                setOnboardingInviteResult(null);
              }}
              className={cn('rec-tab-btn', active && 'rec-tab-btn--active')}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {active && <span className="rec-tab-active-dot" />}
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
                  <StatCard icon={Users} title="Applicants" value={candidates.length.toString()} trend="Total resumes in system" color="indigo" />
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
                        const count = candidates.filter(c => c.stage === stage.key).length;
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
              <div className="rec-card" style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <h2 className="rec-section-title" style={{ fontSize: '1.25rem' }}>Stage 1: Define Role & Requirements</h2>
                  <p className="rec-section-sub">Create a new job vacancy in the HR system</p>
                </div>
                <form onSubmit={handleCreateJobSubmit} className="flex flex-col gap-4">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="auth-luxury-label">
                      Job Title
                      <input 
                        type="text" 
                        className="rec-search-input" 
                        style={{ width: '100%', paddingLeft: '1rem' }} 
                        placeholder="e.g. Senior Fullstack Engineer"
                        value={newJob.title}
                        onChange={e => setNewJob({...newJob, title: e.target.value})}
                      />
                    </div>
                    <div className="auth-luxury-label">
                      Department
                      <select 
                        className="rec-select" 
                        style={{ width: '100%', height: '38px' }}
                        value={newJob.department}
                        onChange={e => setNewJob({...newJob, department: e.target.value})}
                      >
                        <option>Engineering</option>
                        <option>Product Management</option>
                        <option>Design</option>
                        <option>Marketing</option>
                        <option>Sales</option>
                        <option>Human Resources</option>
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="auth-luxury-label">
                      Location
                      <input 
                        type="text" 
                        className="rec-search-input" 
                        style={{ width: '100%', paddingLeft: '1rem' }} 
                        placeholder="e.g. Remote, Mumbai, Hybrid"
                        value={newJob.location}
                        onChange={e => setNewJob({...newJob, location: e.target.value})}
                      />
                    </div>
                    <div className="auth-luxury-label">
                      Employment Type
                      <select 
                        className="rec-select" 
                        style={{ width: '100%', height: '38px' }}
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
                    Job Description & Key Responsibilities
                    <textarea 
                      className="rec-search-input" 
                      style={{ width: '100%', height: '100px', padding: '0.75rem 1rem', resize: 'vertical' }} 
                      placeholder="Enter description..."
                      value={newJob.description}
                      onChange={e => setNewJob({...newJob, description: e.target.value})}
                    />
                  </div>

                   <div className="auth-luxury-label">
                    Skills Required (Comma separated)
                    <input 
                      type="text" 
                      className="rec-search-input" 
                      style={{ width: '100%', paddingLeft: '1rem' }} 
                      placeholder="e.g. React, Node.js, TypeScript, PostgreSQL"
                      value={newJob.requirements}
                      onChange={e => setNewJob({...newJob, requirements: e.target.value})}
                    />
                  </div>

                  <div className="auth-luxury-label" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    Job Specification Document / Media Banner
                    <div className="premium-media-uploader-box">
                      {jobFilePreview ? (
                        <div className="uploaded-file-preview">
                          {jobFilePreview.startsWith('data:image/') ? (
                            <img src={jobFilePreview} alt="Preview" className="media-preview-thumbnail" />
                          ) : (
                            <div className="doc-icon-preview">
                              <FileText className="h-8 w-8 text-indigo-500" />
                            </div>
                          )}
                          <div className="uploaded-file-meta">
                            <span className="file-name" style={{ color: '#0f172a', fontWeight: 700 }}>{jobFileName}</span>
                            <span className="file-size" style={{ color: '#64748b' }}>{jobFileSize}</span>
                          </div>
                          <button type="button" onClick={handleRemoveJobFile} className="remove-file-btn" title="Remove File">
                            <XCircle className="h-5 w-5 text-red-500" />
                          </button>
                        </div>
                      ) : (
                        <label className="uploader-dropzone">
                          <input 
                            type="file" 
                            accept="image/jpeg, image/png, image/webp, application/pdf" 
                            onChange={handleJobFileChange} 
                            hidden 
                          />
                          <div className="dropzone-content">
                            <div className="upload-icon-wrapper">
                              <FolderOpen className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div className="dropzone-text">
                              <span className="upload-link-text">Click to upload file</span> or drag and drop
                            </div>
                            <span className="upload-help-text">PDF, PNG, JPG, or WEBP up to 5MB</span>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  <button type="submit" className="rec-btn-primary" style={{ height: '42px', justifyContent: 'center', marginTop: '1rem' }}>
                    <Plus className="h-4.5 w-4.5" /> Save Job & Proceed
                  </button>
                </form>
              </div>
            )}

            {/* ════════════════ STAGE 2: JOB POSTING ════════════════ */}
            {activeTab === 'stage-2' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                {/* Select Job Posting & Toggles */}
                <div className="rec-card" style={{ padding: '1.5rem' }}>
                  <h2 className="rec-section-title" style={{ marginBottom: '1rem' }}>Stage 2: Distribute to Job Boards</h2>
                  <p className="rec-section-sub" style={{ marginBottom: '1.5rem' }}>Choose job posting and configure distribution channels</p>
                  
                  <div className="auth-luxury-label" style={{ marginBottom: '1.25rem' }}>
                    Select Active Job Vacancy
                    <select 
                      className="rec-select" 
                      style={{ width: '100%', height: '40px' }}
                      value={selectedJobId}
                      onChange={e => {
                        setSelectedJobId(e.target.value);
                        setPostingSuccessJobId(null);
                      }}
                    >
                      {jobs.length === 0 ? (
                        <option>No job posting created yet</option>
                      ) : (
                        jobs.map(j => (
                          <option key={j.id} value={j.id}>{j.title} ({j.department} - {j.status})</option>
                        ))
                      )}
                    </select>
                  </div>

                  <h3 className="rec-panel-title" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>Available Integrations</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {[
                      { key: 'linkedin', label: 'LinkedIn Jobs Portal', icon: Globe },
                      { key: 'naukri', label: 'Naukri.com Employer Partner', icon: Users },
                      { key: 'wellfound', label: 'Wellfound (AngelList)', icon: Target },
                      { key: 'indeed', label: 'Indeed API Integration', icon: MapPin },
                      { key: 'career_portal', label: 'Company Career Webpage', icon: Globe },
                    ].map(chan => (
                      <div key={chan.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '0.625rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <chan.icon className="h-4 w-4 text-indigo-500" />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>{chan.label}</span>
                        </div>
                        <label className="rec-switch">
                          <input 
                            type="checkbox" 
                            checked={postingChannels[chan.key]}
                            onChange={e => setPostingChannels({...postingChannels, [chan.key]: e.target.checked})}
                          />
                          <span className="rec-slider" />
                        </label>
                      </div>
                    ))}
                  </div>

                  <button 
                    disabled={isPosting || !selectedJobId} 
                    onClick={handlePublishJobIntegrations} 
                    className="rec-btn-primary" 
                    style={{ width: '100%', height: '42px', justifyContent: 'center' }}
                  >
                    {isPosting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Distributing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Distribute & Publish Job
                      </>
                    )}
                  </button>
                </div>

                {/* API terminal logs simulation & simulated links */}
                <div className="flex flex-col gap-4">
                  <div className="rec-card" style={{ padding: '1.25rem', background: '#0f172a', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auto-Post API Console Log</span>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: isPosting ? '#eab308' : '#10b981' }} />
                    </div>
                    <div style={{ height: '180px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.7rem', color: '#f8fafc', lineHeight: '1.6', padding: '0.5rem' }}>
                      {integrationLogs.length === 0 ? (
                        <p style={{ color: '#64748b' }}>Waiting for distribution run...</p>
                      ) : (
                        integrationLogs.map((log, i) => {
                          let color = '#fff';
                          if (log.includes('[SUCCESS]')) color = '#4ade80';
                          else if (log.includes('[INFO]')) color = '#38bdf8';
                          else if (log.includes('[ERROR]')) color = '#f87171';
                          return <p key={i} style={{ color }}>{log}</p>;
                        })
                      )}
                    </div>
                  </div>

                  {/* Simulated boards web previews */}
                  {postingSuccessJobId && (
                    <div className="rec-card" style={{ padding: '1.25rem' }}>
                      <h3 className="rec-panel-title" style={{ color: '#10b981', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.75rem' }}>
                        <CheckCircle className="h-4 w-4" /> Live Board Preview Links Generated
                      </h3>
                      <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '1rem' }}>Click below to simulate candidate-facing view of the listing on platform sites:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {postingChannels.linkedin && (
                          <button onClick={() => setSelectedSimulatedChannel('LinkedIn')} className="rec-btn-outline" style={{ fontSize: '0.7rem', height: '32px' }}>
                            <Globe className="h-3.5 w-3.5" /> LinkedIn Post <ExternalLink className="h-3 w-3 ml-1" />
                          </button>
                        )}
                        {postingChannels.naukri && (
                          <button onClick={() => setSelectedSimulatedChannel('Naukri')} className="rec-btn-outline" style={{ fontSize: '0.7rem', height: '32px' }}>
                            <Users className="h-3.5 w-3.5" /> Naukri Listing <ExternalLink className="h-3 w-3 ml-1" />
                          </button>
                        )}
                        {postingChannels.wellfound && (
                          <button onClick={() => setSelectedSimulatedChannel('Wellfound')} className="rec-btn-outline" style={{ fontSize: '0.7rem', height: '32px' }}>
                            <Target className="h-3.5 w-3.5" /> Wellfound Post <ExternalLink className="h-3 w-3 ml-1" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════ STAGE 3: APPLICATIONS ════════════════ */}
            {activeTab === 'stage-3' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
                {/* Manual Add candidate form */}
                <div className="rec-card" style={{ padding: '1.5rem' }}>
                  <h2 className="rec-section-title" style={{ marginBottom: '1rem' }}>Stage 3: Manually Add Applicant</h2>
                  <p className="rec-section-sub" style={{ marginBottom: '1.5rem' }}>Submit a candidate profile into the pipeline</p>
                  
                  <form onSubmit={handleAddApplicantSubmit} className="flex flex-col gap-3">
                    <div className="auth-luxury-label">
                      Select Job Opening
                      <select 
                        className="rec-select" 
                        style={{ width: '100%', height: '36px' }}
                        value={newApplicant.jobId || selectedJobId}
                        onChange={e => setNewApplicant({...newApplicant, jobId: e.target.value})}
                      >
                        <option value="">-- Choose Job Posting --</option>
                        {jobs.map(j => (
                          <option key={j.id} value={j.id}>{j.title}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="auth-luxury-label">
                        First Name
                        <input 
                          type="text" 
                          className="rec-search-input" 
                          style={{ width: '100%', paddingLeft: '0.75rem', height: '36px' }}
                          value={newApplicant.firstName}
                          onChange={e => setNewApplicant({...newApplicant, firstName: e.target.value})}
                          placeholder="Aarav"
                        />
                      </div>
                      <div className="auth-luxury-label">
                        Last Name
                        <input 
                          type="text" 
                          className="rec-search-input" 
                          style={{ width: '100%', paddingLeft: '0.75rem', height: '36px' }}
                          value={newApplicant.lastName}
                          onChange={e => setNewApplicant({...newApplicant, lastName: e.target.value})}
                          placeholder="Patel"
                        />
                      </div>
                    </div>

                    <div className="auth-luxury-label">
                      Email Address
                      <input 
                        type="email" 
                        className="rec-search-input" 
                        style={{ width: '100%', paddingLeft: '0.75rem', height: '36px' }}
                        value={newApplicant.email}
                        onChange={e => setNewApplicant({...newApplicant, email: e.target.value})}
                        placeholder="aarav@example.com"
                      />
                    </div>

                    <div className="auth-luxury-label">
                      Contact Phone
                      <input 
                        type="text" 
                        className="rec-search-input" 
                        style={{ width: '100%', paddingLeft: '0.75rem', height: '36px' }}
                        value={newApplicant.phone}
                        onChange={e => setNewApplicant({...newApplicant, phone: e.target.value})}
                        placeholder="+91 99999 88888"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="auth-luxury-label">
                        Experience
                        <input 
                          type="text" 
                          className="rec-search-input" 
                          style={{ width: '100%', paddingLeft: '0.75rem', height: '36px' }}
                          value={newApplicant.experience}
                          onChange={e => setNewApplicant({...newApplicant, experience: e.target.value})}
                          placeholder="e.g. 4 Years"
                        />
                      </div>
                      <div className="auth-luxury-label">
                        Source
                        <select 
                          className="rec-select" 
                          style={{ width: '100%', height: '36px' }}
                          value={newApplicant.source}
                          onChange={e => setNewApplicant({...newApplicant, source: e.target.value})}
                        >
                          <option>LinkedIn</option>
                          <option>Naukri</option>
                          <option>Wellfound</option>
                          <option>Indeed</option>
                          <option>Career Page</option>
                          <option>Referral</option>
                          <option>Direct</option>
                        </select>
                      </div>
                    </div>

                    <div className="auth-luxury-label">
                      Skills (Comma separated)
                      <input 
                        type="text" 
                        className="rec-search-input" 
                        style={{ width: '100%', paddingLeft: '0.75rem', height: '36px' }}
                        value={newApplicant.skills}
                        onChange={e => setNewApplicant({...newApplicant, skills: e.target.value})}
                        placeholder="e.g. React, Node.js, CSS"
                      />
                    </div>

                    <button type="submit" className="rec-btn-primary" style={{ height: '38px', justifyContent: 'center', marginTop: '0.5rem' }}>
                      <Plus className="h-4 w-4" /> Add Candidate
                    </button>
                  </form>
                </div>

                {/* Candidate list for Stage 3 */}
                <div className="rec-card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
                  <h2 className="rec-section-title" style={{ marginBottom: '1rem' }}>Stage 3: Collected Applications</h2>
                  <p className="rec-section-sub" style={{ marginBottom: '1rem' }}>Candidate profiles that have entered this stage</p>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table className="rec-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Role</th>
                          <th>Source</th>
                          <th>Skills</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.filter(c => c.stage === 'Applications').length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                              No new applications currently in this stage.
                            </td>
                          </tr>
                        ) : (
                          candidates.filter(c => c.stage === 'Applications').map(c => (
                            <tr key={c.id} className="rec-table-row">
                              <td>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{c.firstName} {c.lastName}</p>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{c.email}</p>
                              </td>
                              <td style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{c.jobTitle}</td>
                              <td style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366f1' }}>{c.source}</td>
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
                        {job?.description.includes(',') ? job.description.split(',').map((s: string) => (
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
            className="rec-modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              onClick={e => e.stopPropagation()}
              className="rec-modal"
            >
              <div className="rec-modal-header">
                <div>
                  <h2 className="rec-modal-title">Candidate Attachment Viewer</h2>
                  <p className="rec-modal-sub">Credential scans & Document verification</p>
                </div>
                <button className="rec-modal-close" onClick={() => setSelectedCandidate(null)}>✕</button>
              </div>
              <div className="rec-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.875rem' }}>
                  {(!selectedCandidate.attachmentImages || selectedCandidate.attachmentImages.length === 0) ? (
                    <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                      No verification documents uploaded. Please upload mock scans in Stage 8.
                    </p>
                  ) : (
                    selectedCandidate.attachmentImages.map((img, i) => (
                      <div key={i} style={{ border: '1.5px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', background: '#f8fafc' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', padding: '0.4rem 0.6rem', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                          Attachment scan #{i + 1}
                        </p>
                        <div style={{ padding: '0.25rem' }}>
                          <img src={img} alt={`Document scan ${i + 1}`} style={{ width: '100%', height: '160px', objectFit: 'contain', background: '#000' }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
