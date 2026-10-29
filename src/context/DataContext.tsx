import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Programme,
  Task,
  Document,
  Notification,
  YearEndInsight,
  AuditRecord,
  TaskStatus,
  DocumentStatus,
  TaskHandover
} from '../types';
import {
  MOCK_PROGRAMMES,
  MOCK_TASKS,
  MOCK_DOCUMENTS,
  MOCK_NOTIFICATIONS,
  MOCK_YEAR_END_INSIGHTS,
  MOCK_AUDIT_LOGS
} from '../data/mockData';
import {
  db,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from '../lib/dataStore';

interface DataContextType {
  programmes: Programme[];
  tasks: Task[];
  documents: Document[];
  notifications: Notification[];
  yearEndInsights: YearEndInsight[];
  auditLogs: AuditRecord[];
  isCloudSynced: boolean;
  addProgramme: (programme: Programme, newTasks?: Task[]) => Promise<void>;
  updateProgramme: (id: string, updates: Partial<Programme>, userId?: string) => Promise<void>;
  reassignProgrammeICs: (
    programmeId: string,
    firstIcId: string,
    secondIcId?: string,
    thirdIcId?: string,
    supportingTeacherIds?: string[],
    userId?: string
  ) => Promise<void>;
  submitProgrammeReflection: (
    programmeId: string,
    reflection: { whatWorked: string; challenges: string; suggestions: string },
    userId: string
  ) => Promise<{ success: boolean; errors?: string[] }>;
  approveProposedTasks: (tasksToApprove: Task[], userId: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus, userId: string) => Promise<void>;
  handoverTask: (taskId: string, toUserId: string, note: string, fromUserId: string, toUserName: string) => Promise<void>;
  addDocument: (doc: Document) => Promise<void>;
  updateDocument: (docId: string, updates: Partial<Document>, userId: string) => Promise<void>;
  updateDocumentStatus: (docId: string, status: DocumentStatus, userId: string) => Promise<void>;
  resolveNotification: (id: string) => Promise<void>;
  archiveProgramme: (programmeId: string, userId: string) => { success: boolean; errors?: string[] };
  generateYearEndInsights: () => Promise<void>;
  logAudit: (userId: string, action: AuditRecord['action'], details: string, targetId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const DATA_KEY_VERSION = 'v2027_13_official_v4';

  const [programmes, setProgrammes] = useState<Programme[]>(() => {
    try {
      const storedVersion = localStorage.getItem('basecamp_version');
      if (storedVersion !== DATA_KEY_VERSION) {
        localStorage.setItem('basecamp_version', DATA_KEY_VERSION);
        localStorage.setItem('basecamp_programmes_v13', JSON.stringify(MOCK_PROGRAMMES));
        localStorage.setItem('basecamp_tasks_v13', JSON.stringify(MOCK_TASKS));
        return MOCK_PROGRAMMES;
      }
      const saved = localStorage.getItem('basecamp_programmes_v13');
      return saved ? JSON.parse(saved) : MOCK_PROGRAMMES;
    } catch {
      return MOCK_PROGRAMMES;
    }
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('basecamp_tasks_v13');
      return saved ? JSON.parse(saved) : MOCK_TASKS;
    } catch {
      return MOCK_TASKS;
    }
  });

  const [documents, setDocuments] = useState<Document[]>(() => {
    const saved = localStorage.getItem('basecamp_documents');
    return saved ? JSON.parse(saved) : MOCK_DOCUMENTS;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('basecamp_notifications');
    return saved ? JSON.parse(saved) : MOCK_NOTIFICATIONS;
  });

  const [yearEndInsights, setYearEndInsights] = useState<YearEndInsight[]>(() => {
    const saved = localStorage.getItem('basecamp_insights');
    return saved ? JSON.parse(saved) : MOCK_YEAR_END_INSIGHTS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>(() => {
    const saved = localStorage.getItem('basecamp_audit');
    return saved ? JSON.parse(saved) : MOCK_AUDIT_LOGS;
  });

  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  // Firestore Real-Time Subscriptions & Auto-Seeding
  useEffect(() => {
    let unsubProgrammes: () => void;
    let unsubTasks: () => void;
    let unsubDocs: () => void;
    let unsubNotifs: () => void;
    let unsubInsights: () => void;
    let unsubAudit: () => void;

    const setupFirestore = async () => {
      try {
        const prgCol = collection(db, 'programmes');
        const tasksCol = collection(db, 'tasks');
        const docsCol = collection(db, 'documents');
        const notifsCol = collection(db, 'notifications');
        const insightsCol = collection(db, 'yearEndInsights');
        const auditCol = collection(db, 'auditLogs');

        // Check if database needs initial seeding or clean sync to the 13 official programmes
        const prgSnapshot = await getDocs(prgCol);
        const officialIds = new Set(MOCK_PROGRAMMES.map(p => p.id));
        const existingDocs = prgSnapshot.docs;
        const hasAll13Official = MOCK_PROGRAMMES.every(p => existingDocs.some(d => d.id === p.id)) && existingDocs.length === 13;

        if (prgSnapshot.empty || !hasAll13Official) {
          const batch = writeBatch(db);
          // Delete any obsolete or hallucinated documents (e.g. prg_asean, old placeholder programmes)
          existingDocs.forEach(d => {
            if (!officialIds.has(d.id)) {
              batch.delete(doc(db, 'programmes', d.id));
            }
          });
          // Upsert the exact 13 official programmes with clean teacher IDs
          MOCK_PROGRAMMES.forEach(p => batch.set(doc(db, 'programmes', p.id), p));
          MOCK_TASKS.forEach(t => batch.set(doc(db, 'tasks', t.id), t));
          MOCK_DOCUMENTS.forEach(d => batch.set(doc(db, 'documents', d.id), d));
          MOCK_NOTIFICATIONS.forEach(n => batch.set(doc(db, 'notifications', n.id), n));
          MOCK_YEAR_END_INSIGHTS.forEach(y => batch.set(doc(db, 'yearEndInsights', y.id), y));
          MOCK_AUDIT_LOGS.forEach(a => batch.set(doc(db, 'auditLogs', a.id), a));
          await batch.commit();
        }

        // Live Real-Time listeners
        unsubProgrammes = onSnapshot(prgCol, snapshot => {
          if (!snapshot.empty) {
            const list: Programme[] = [];
            snapshot.forEach(d => {
              if (officialIds.has(d.id)) {
                list.push(d.data() as Programme);
              }
            });
            list.sort((a, b) => a.startDate.localeCompare(b.startDate));
            if (list.length > 0) {
              setProgrammes(list);
              localStorage.setItem('basecamp_programmes_v13', JSON.stringify(list));
            }
          }
        });

        unsubTasks = onSnapshot(tasksCol, snapshot => {
          if (!snapshot.empty) {
            const list: Task[] = [];
            snapshot.forEach(d => list.push(d.data() as Task));
            setTasks(list);
            localStorage.setItem('basecamp_tasks_v13', JSON.stringify(list));
          }
        });

        unsubDocs = onSnapshot(docsCol, snapshot => {
          if (!snapshot.empty) {
            const list: Document[] = [];
            snapshot.forEach(d => list.push(d.data() as Document));
            setDocuments(list);
            localStorage.setItem('basecamp_documents', JSON.stringify(list));
          }
        });

        unsubNotifs = onSnapshot(notifsCol, snapshot => {
          if (!snapshot.empty) {
            const list: Notification[] = [];
            snapshot.forEach(d => list.push(d.data() as Notification));
            setNotifications(list);
            localStorage.setItem('basecamp_notifications', JSON.stringify(list));
          }
        });

        unsubInsights = onSnapshot(insightsCol, snapshot => {
          if (!snapshot.empty) {
            const list: YearEndInsight[] = [];
            snapshot.forEach(d => list.push(d.data() as YearEndInsight));
            setYearEndInsights(list);
            localStorage.setItem('basecamp_insights', JSON.stringify(list));
          }
        });

        unsubAudit = onSnapshot(auditCol, snapshot => {
          if (!snapshot.empty) {
            const list: AuditRecord[] = [];
            snapshot.forEach(d => list.push(d.data() as AuditRecord));
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setAuditLogs(list);
            localStorage.setItem('basecamp_audit', JSON.stringify(list));
          }
        });

        setIsCloudSynced(true);
      } catch (err) {
        console.warn('Firestore real-time sync notice (using local persistence fallback):', err);
      }
    };

    setupFirestore();

    return () => {
      if (unsubProgrammes) unsubProgrammes();
      if (unsubTasks) unsubTasks();
      if (unsubDocs) unsubDocs();
      if (unsubNotifs) unsubNotifs();
      if (unsubInsights) unsubInsights();
      if (unsubAudit) unsubAudit();
    };
  }, []);

  const logAudit = async (userId: string, action: AuditRecord['action'], details: string, targetId: string) => {
    const record: AuditRecord = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      userId,
      action,
      details,
      targetId,
      createdAt: new Date().toISOString(),
    };

    setAuditLogs(prev => [record, ...prev]);
    localStorage.setItem('basecamp_audit', JSON.stringify([record, ...auditLogs]));

    try {
      await setDoc(doc(db, 'auditLogs', record.id), record);
    } catch (e) {
      console.error('Audit sync error:', e);
    }
  };

  const addProgramme = async (newProgramme: Programme, initialTasks: Task[] = []) => {
    setProgrammes(prev => [newProgramme, ...prev]);
    if (initialTasks.length > 0) {
      setTasks(prev => [...initialTasks, ...prev]);
    }

    try {
      await setDoc(doc(db, 'programmes', newProgramme.id), newProgramme);
      if (initialTasks.length > 0) {
        const batch = writeBatch(db);
        initialTasks.forEach(t => batch.set(doc(db, 'tasks', t.id), t));
        await batch.commit();
      }
    } catch (e) {
      console.error('Add programme cloud error:', e);
    }

    logAudit(newProgramme.createdBy, 'programme_created', `Created programme "${newProgramme.title}"`, newProgramme.id);
  };

  const updateProgramme = async (id: string, updates: Partial<Programme>, userId?: string) => {
    setProgrammes(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    try {
      await updateDoc(doc(db, 'programmes', id), updates);
    } catch (e) {
      console.error('Update programme cloud error:', e);
    }
    if (userId) {
      logAudit(userId, 'programme_updated', `Updated programme details`, id);
    }
  };

  const reassignProgrammeICs = async (
    programmeId: string,
    firstIcId: string,
    secondIcId?: string,
    thirdIcId?: string,
    supportingTeacherIds?: string[],
    userId?: string
  ) => {
    const updates: Partial<Programme> = {
      firstIcId,
      secondIcId,
      thirdIcId,
    };
    if (supportingTeacherIds !== undefined) {
      updates.supportingTeacherIds = supportingTeacherIds;
    }
    await updateProgramme(programmeId, updates, userId);
  };

  const submitProgrammeReflection = async (
    programmeId: string,
    reflection: { whatWorked: string; challenges: string; suggestions: string },
    userId: string
  ): Promise<{ success: boolean; errors?: string[] }> => {
    const programmeTasks = tasks.filter(t => t.programmeId === programmeId);
    const incompleteTasks = programmeTasks.filter(t => t.status !== 'Completed');

    if (incompleteTasks.length > 0) {
      return {
        success: false,
        errors: [`Cannot mark completed: ${incompleteTasks.length} task(s) are still incomplete (${incompleteTasks.map(t => `"${t.title}"`).join(', ')})`],
      };
    }

    const updates: Partial<Programme> = {
      status: 'Completed',
      reflection: {
        ...reflection,
        submittedBy: userId,
        submittedAt: new Date().toISOString(),
      },
    };

    await updateProgramme(programmeId, updates, userId);

    // Also auto-archive the reflection into Documents repository
    const prog = programmes.find(p => p.id === programmeId);
    const reflectionDoc: Document = {
      id: `doc_refl_${programmeId}_${Date.now()}`,
      title: `${prog?.title || 'Programme'} - Post-Event AAR & Committee Reflection`,
      filePath: `/reflections/${programmeId}_AAR.docx`,
      fileType: 'docx',
      category: 'Reflection Questions',
      year: new Date().getFullYear(),
      status: 'Approved',
      ownerId: userId,
      tags: ['reflection', 'aar', 'post-event', 'handover', 'suggestions'],
      templateFlag: false,
      uploadedBy: 'System Auto-Archive',
      uploadedAt: new Date().toISOString(),
      indexingStatus: 'Searchable',
      fileSize: '45 KB',
      programmeId,
      excerpt: `What Worked: ${reflection.whatWorked}\nChallenges: ${reflection.challenges}\nSuggestions for Next Year: ${reflection.suggestions}`,
    };
    await addDocument(reflectionDoc);

    return { success: true };
  };

  const approveProposedTasks = async (tasksToApprove: Task[], userId: string) => {
    setTasks(prev => [...tasksToApprove, ...prev]);

    try {
      const batch = writeBatch(db);
      tasksToApprove.forEach(t => batch.set(doc(db, 'tasks', t.id), t));
      await batch.commit();
    } catch (e) {
      console.error('Approve tasks cloud error:', e);
    }

    tasksToApprove.forEach(t => {
      logAudit(userId, 'task_approved', `Approved task "${t.title}" for programme`, t.programmeId);
    });
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus, userId: string) => {
    const isCompleted = status === 'Completed';
    const targetTask = tasks.find(t => t.id === taskId);

    // Clean updates without undefined properties (Firestore throws if undefined is passed)
    const updates: Partial<Task> = {
      status,
      completedBy: isCompleted ? userId : '',
      completedAt: isCompleted ? new Date().toISOString() : '',
    };

    setTasks(prev => {
      const updated = prev.map(t => (t.id === taskId ? { ...t, ...updates } : t));
      try {
        localStorage.setItem('basecamp_tasks_v13', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save tasks to localStorage:', e);
      }
      return updated;
    });

    try {
      // Use setDoc with merge: true so it works even if the task was recently generated in session
      await setDoc(doc(db, 'tasks', taskId), updates, { merge: true });
    } catch (e) {
      console.error('Update task status error in Firestore:', e);
    }

    if (isCompleted) {
      logAudit(userId, 'task_completed', `Completed task "${targetTask?.title || taskId}"`, taskId);
    } else {
      logAudit(userId, 'task_reopened', `Reopened task "${targetTask?.title || taskId}" (status: ${status})`, taskId);
    }
  };

  const handoverTask = async (
    taskId: string,
    toUserId: string,
    note: string,
    fromUserId: string,
    toUserName: string
  ) => {
    const handoverRecord: TaskHandover = {
      id: `hnd_${Date.now()}`,
      taskId,
      fromUserId,
      toUserId,
      note,
      createdAt: new Date().toISOString(),
    };

    const targetTask = tasks.find(t => t.id === taskId);
    const prevOwners = targetTask
      ? (targetTask.previousOwnerIds.includes(fromUserId)
          ? targetTask.previousOwnerIds
          : [...targetTask.previousOwnerIds, fromUserId])
      : [fromUserId];

    const taskUpdates: Partial<Task> = {
      ownerId: toUserId,
      previousOwnerIds: prevOwners,
      status: 'Awaiting Input',
      requestedInputFromId: toUserId,
      handovers: [...(targetTask?.handovers || []), handoverRecord],
    };

    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...taskUpdates } : t)));

    const notif: Notification = {
      id: `notif_${Date.now()}`,
      userId: toUserId,
      type: 'input_requested',
      title: 'Task Handover Requested',
      message: `Input requested on task "${targetTask?.title || 'Task'}" by current owner. Note: "${note}"`,
      targetType: 'task',
      targetId: taskId,
      createdAt: new Date().toISOString(),
    };

    setNotifications(prev => [notif, ...prev]);

    try {
      await updateDoc(doc(db, 'tasks', taskId), taskUpdates);
      await setDoc(doc(db, 'notifications', notif.id), notif);
    } catch (e) {
      console.error('Handover cloud sync error:', e);
    }
  };

  const addDocument = async (newDoc: Document) => {
    setDocuments(prev => [newDoc, ...prev]);
    try {
      await setDoc(doc(db, 'documents', newDoc.id), newDoc);
    } catch (e) {
      console.error('Add doc cloud error:', e);
    }
    logAudit(newDoc.uploadedBy, 'document_status_changed', `Uploaded document "${newDoc.title}"`, newDoc.id);
  };

  const updateDocument = async (docId: string, updates: Partial<Document>, userId: string) => {
    setDocuments(prev => prev.map(d => (d.id === docId ? { ...d, ...updates } : d)));
    try {
      await updateDoc(doc(db, 'documents', docId), updates);
    } catch (e) {
      console.error('Update doc cloud error:', e);
    }
    const targetDoc = documents.find(d => d.id === docId);
    if (targetDoc) {
      logAudit(userId, 'document_status_changed', `Updated document "${targetDoc.title}"`, docId);
    }
  };

  const updateDocumentStatus = async (docId: string, status: DocumentStatus, userId: string) => {
    setDocuments(prev => prev.map(d => (d.id === docId ? { ...d, status } : d)));
    try {
      await updateDoc(doc(db, 'documents', docId), { status });
    } catch (e) {
      console.error('Update doc status error:', e);
    }
    const targetDoc = documents.find(d => d.id === docId);
    if (targetDoc) {
      logAudit(userId, 'document_status_changed', `Changed document "${targetDoc.title}" status to "${status}"`, docId);
    }
  };

  const resolveNotification = async (id: string) => {
    const resolvedAt = new Date().toISOString();
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, resolvedAt } : n)));
    try {
      await updateDoc(doc(db, 'notifications', id), { resolvedAt });
    } catch (e) {
      console.error('Resolve notif error:', e);
    }
  };

  const archiveProgramme = (programmeId: string, userId: string) => {
    const programme = programmes.find(p => p.id === programmeId);
    if (!programme) return { success: false, errors: ['Programme not found'] };

    const prgTasks = tasks.filter(t => t.programmeId === programmeId);
    const incompleteTasks = prgTasks.filter(t => t.status !== 'Completed');

    // Check required documents
    const prgDocs = documents.filter(d => d.programmeId === programmeId || d.tags.includes(programme.type.toLowerCase()));
    const missingDocs: string[] = [];

    if (!prgDocs.some(d => d.category === 'RAMS' && (d.status === 'Approved' || d.status === 'Current'))) {
      missingDocs.push('Approved or Current RAMS Document');
    }
    if (!prgDocs.some(d => d.category === 'Parents Gateway Letters')) {
      missingDocs.push('Parents Gateway Draft Letter');
    }

    const errors: string[] = [];

    // Rule 1: All assigned programme action items must be marked completed
    if (incompleteTasks.length > 0) {
      errors.push(`${incompleteTasks.length} task(s) are still incomplete (${incompleteTasks.map(t => `"${t.title}"`).join(', ')})`);
    }

    // Rule 2: After-Action Review (AAR) reflection must be filled
    const hasAarFilled = Boolean(
      (programme.reflectionSummary && programme.reflectionSummary.trim().length > 0) ||
      (programme.aarReflections && Object.values(programme.aarReflections).some(val => typeof val === 'string' && val.trim().length > 0)) ||
      documents.some(d => d.programmeId === programmeId && (d.tags.includes('aar') || d.tags.includes('reflection') || d.category === 'VMV'))
    );

    if (!hasAarFilled) {
      errors.push('After-Action Review (AAR) reflection has not been filed yet. Complete the "Complete & Reflect" AAR first.');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Perform archive
    const updates: Partial<Programme> = {
      status: 'Archived',
      archivedAt: new Date().toISOString(),
      archivedBy: userId,
    };

    setProgrammes(prev => prev.map(p => (p.id === programmeId ? { ...p, ...updates } : p)));
    updateDoc(doc(db, 'programmes', programmeId), updates).catch(console.error);

    logAudit(userId, 'programme_archived', `Archived programme "${programme.title}"`, programmeId);
    return { success: true };
  };

  const generateYearEndInsights = async () => {
    try {
      const res = await fetch('/api/gemini/year-end-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.insights && Array.isArray(data.insights)) {
        const formatted: YearEndInsight[] = data.insights.map((item: any, idx: number) => ({
          id: `yei_gen_${Date.now()}_${idx}`,
          year: new Date().getFullYear(),
          category: item.category || 'General Analysis',
          statement: item.statement || item.insight,
          evidence: item.evidence || 'Analyzed Hillgrove committee logs',
          status: 'Proposed',
          createdAt: new Date().toISOString(),
        }));
        setYearEndInsights(formatted);

        try {
          const batch = writeBatch(db);
          formatted.forEach(f => batch.set(doc(db, 'yearEndInsights', f.id), f));
          await batch.commit();
        } catch (e) {
          console.error('Insights batch error:', e);
        }
      }
    } catch (err) {
      console.warn('Year end insight generation failed:', err);
    }
  };

  return (
    <DataContext.Provider
      value={{
        programmes,
        tasks,
        documents,
        notifications,
        yearEndInsights,
        auditLogs,
        isCloudSynced,
        addProgramme,
        updateProgramme,
        reassignProgrammeICs,
        submitProgrammeReflection,
        approveProposedTasks,
        updateTaskStatus,
        handoverTask,
        addDocument,
        updateDocument,
        updateDocumentStatus,
        resolveNotification,
        archiveProgramme,
        generateYearEndInsights,
        logAudit,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

// For screens also open to signed-out guests: null when there is no committee data
export const useOptionalData = () => useContext(DataContext) ?? null;

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
