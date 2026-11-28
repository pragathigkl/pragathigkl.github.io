/**
 * PRAGATHI P.U. COLLEGE, GURUMATKAL — LECTURER QUESTION SELECTOR BACKEND
 * Google Apps Script (Web App) — Deploy as: Execute as Me | Who has access: Anyone
 *
 * Target Drive Folder: https://drive.google.com/drive/folders/1Src_7QIUFVbGAW2AaGyxRexzH5F6mYMp
 * - Creates a NEW weekly subfolder inside TARGET_DRIVE_FOLDER_ID for each exam created by Admin.
 * - Creates the NEET 180Q (Physics/Chemistry/Botany/Zoology) or KCET 100Q (Physics/Chemistry/Maths/Biology)
 *   Excel-compatible Google Sheet inside that weekly folder.
 * - Auto-saves lecturer selections directly into that Subject sheet on every pick/unpick.
 * - Stores Firebase Lecturer email -> locked Subject mapping and "Push to Admin" status.
 */

const TARGET_DRIVE_FOLDER_ID = '1Src_7QIUFVbGAW2AaGyxRexzH5F6mYMp';
const ADMIN_EMAIL            = 'laxmandodla97@gmail.com';
const REGISTRY_FILE_NAME     = 'Pragathi_Question_Selector_Registry.json';
const TEMPLATE_HEADERS       = ['Q.No', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Diagram (Optional)', 'Correct Answer'];

function getRootFolder_() {
  return DriveApp.getFolderById(TARGET_DRIVE_FOLDER_ID);
}

function loadRegistry_() {
  const root = getRootFolder_();
  const it = root.getFilesByName(REGISTRY_FILE_NAME);
  if (!it.hasNext()) {
    return { exams: [], lecturerProfiles: {} };
  }
  try {
    const parsed = JSON.parse(it.next().getBlob().getDataAsString());
    if (!parsed.exams) parsed.exams = [];
    if (!parsed.lecturerProfiles) parsed.lecturerProfiles = {};
    return parsed;
  } catch (e) {
    return { exams: [], lecturerProfiles: {} };
  }
}

function saveRegistry_(data) {
  const root = getRootFolder_();
  const it = root.getFilesByName(REGISTRY_FILE_NAME);
  const content = JSON.stringify(data, null, 2);
  if (it.hasNext()) {
    it.next().setContent(content);
  } else {
    root.createFile(REGISTRY_FILE_NAME, content, MimeType.PLAIN_TEXT);
  }
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
    if (action === 'ping') {
      return jsonOut_({ ok: true, folderId: TARGET_DRIVE_FOLDER_ID, adminEmail: ADMIN_EMAIL });
    }
    if (action === 'getState') {
      const reg = loadRegistry_();
      return jsonOut_({ ok: true, exams: reg.exams, lecturerProfiles: reg.lecturerProfiles });
    }
    return jsonOut_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const action = payload.action;

    if (action === 'createExam') {
      if (String(payload.actorEmail || '').toLowerCase() !== ADMIN_EMAIL) {
        return jsonOut_({ ok: false, error: 'Unauthorized: Admin only (' + ADMIN_EMAIL + ')' });
      }
      return jsonOut_(handleCreateExam_(payload));
    }
    if (action === 'saveLecturerProfile') {
      const email = String(payload.email || '').toLowerCase().trim();
      const subject = String(payload.subject || '').trim();
      const name = String(payload.name || email).trim();
      if (!email || !subject) return jsonOut_({ ok: false, error: 'Missing email or subject' });
      const reg = loadRegistry_();
      const existingForSubj = Object.values(reg.lecturerProfiles).filter(function(p) {
        return p.subject === subject && p.email !== email;
      });
      if (existingForSubj.length >= 2) {
        return jsonOut_({ ok: false, error: subject + ' already has 2 registered lecturers (maximum 2 per subject). Contact Admin.' });
      }
      const slot = existingForSubj.length + 1;
      reg.lecturerProfiles[email] = { email: email, name: name, subject: subject, slot: slot, lockedAt: new Date().toISOString() };
      saveRegistry_(reg);
      return jsonOut_({ ok: true, profile: reg.lecturerProfiles[email] });
    }
    if (action === 'resetLecturerProfile') {
      if (String(payload.actorEmail || '').toLowerCase() !== ADMIN_EMAIL) {
        return jsonOut_({ ok: false, error: 'Unauthorized: Admin only' });
      }
      const email = String(payload.email || '').toLowerCase().trim();
      const reg = loadRegistry_();
      delete reg.lecturerProfiles[email];
      saveRegistry_(reg);
      return jsonOut_({ ok: true });
    }
    if (action === 'autoSaveSelection' || action === 'pushToAdmin') {
      return jsonOut_(handleSaveSubjectSelection_(payload, action === 'pushToAdmin'));
    }
    if (action === 'deleteExam') {
      if (String(payload.actorEmail || '').toLowerCase() !== ADMIN_EMAIL) {
        return jsonOut_({ ok: false, error: 'Unauthorized: Admin only' });
      }
      const reg = loadRegistry_();
      reg.exams = reg.exams.filter(function(x) { return x.id !== payload.examId; });
      saveRegistry_(reg);
      return jsonOut_({ ok: true });
    }
    return jsonOut_({ ok: false, error: 'Unknown POST action: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function handleCreateExam_(payload) {
  const examName  = String(payload.name || 'WEEKLY TEST').trim();
  const examType  = payload.type === 'KCET' ? 'KCET' : 'NEET';
  const examClass = payload.examClass || 'II PUC';
  const examDate  = payload.date || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  const examId    = payload.id || ('EXAM_' + Date.now());

  const subjects = examType === 'NEET'
    ? [
        { name: 'Physics', quota: 45 },
        { name: 'Chemistry', quota: 45 },
        { name: 'Botany', quota: 45 },
        { name: 'Zoology', quota: 45 }
      ]
    : [
        { name: 'Physics', quota: 25 },
        { name: 'Chemistry', quota: 25 },
        { name: 'Maths', quota: 25 },
        { name: 'Biology', quota: 25 }
      ];

  // Create a NEW weekly subfolder inside the target Drive folder for this exam
  const rootFolder = getRootFolder_();
  const weekFolderName = examName + ' - ' + examClass + ' (' + examDate + ')';
  const weekFolder = rootFolder.createFolder(weekFolderName);

  // Create the exact NEET 180Q / KCET 100Q Excel-compatible Google Sheet inside the new weekly folder
  const sheetTitle = examName + '_' + examClass.replace(/\s+/g, '_') + '_' + examType + '_' + (examType === 'NEET' ? '180Q' : '100Q');
  const ss = SpreadsheetApp.create(sheetTitle);
  const file = DriveApp.getFileById(ss.getId());
  file.moveTo(weekFolder);

  subjects.forEach(function(sub, idx) {
    const ws = idx === 0 ? ss.getSheets()[0] : ss.insertSheet(sub.name);
    if (idx === 0) ws.setName(sub.name);
    ws.getRange(1, 1, 1, TEMPLATE_HEADERS.length).setValues([TEMPLATE_HEADERS]);
    ws.getRange(1, 1, 1, TEMPLATE_HEADERS.length)
      .setBackground('#0F172A')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    ws.setFrozenRows(1);

    const rows = [];
    for (let q = 1; q <= sub.quota; q++) {
      rows.push([q, '', '', '', '', '', '', '']);
    }
    ws.getRange(2, 1, rows.length, TEMPLATE_HEADERS.length).setValues(rows);
    ws.setColumnWidth(1, 60);
    ws.setColumnWidth(2, 420);
    ws.setColumnWidth(3, 180);
    ws.setColumnWidth(4, 180);
    ws.setColumnWidth(5, 180);
    ws.setColumnWidth(6, 180);
    ws.setColumnWidth(7, 160);
    ws.setColumnWidth(8, 120);
  });

  const xlsxExportUrl = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
  const examRecord = {
    id: examId,
    name: examName,
    examClass: examClass,
    type: examType,
    date: examDate,
    folderId: weekFolder.getId(),
    folderName: weekFolderName,
    folderUrl: weekFolder.getUrl(),
    sheetId: ss.getId(),
    sheetUrl: ss.getUrl(),
    xlsxUrl: xlsxExportUrl,
    quotas: subjects.reduce(function(acc, s) { acc[s.name] = s.quota; return acc; }, {}),
    selections: subjects.reduce(function(acc, s) { acc[s.name] = []; return acc; }, {}),
    pushedStatus: subjects.reduce(function(acc, s) { acc[s.name] = null; return acc; }, {}),
    createdAt: new Date().toISOString()
  };

  const reg = loadRegistry_();
  reg.exams.unshift(examRecord);
  saveRegistry_(reg);

  return { ok: true, exam: examRecord };
}

function handleSaveSubjectSelection_(payload, isPush) {
  const examId = payload.examId;
  const subject = payload.subject;
  const questions = payload.questions || [];
  const lecturerEmail = String(payload.lecturerEmail || '').toLowerCase();
  const reg = loadRegistry_();
  const exam = reg.exams.find(function(x) { return x.id === examId; });
  if (!exam) return { ok: false, error: 'Exam not found: ' + examId };

  const ss = SpreadsheetApp.openById(exam.sheetId);
  let ws = ss.getSheetByName(subject);
  if (!ws) ws = ss.insertSheet(subject);

  const quota = (exam.quotas && exam.quotas[subject]) ? exam.quotas[subject] : Math.max(questions.length, 25);
  const rows = [];
  for (let i = 0; i < Math.max(quota, questions.length); i++) {
    const q = questions[i];
    if (q) {
      rows.push([i + 1, q.q || '', q.a || '', q.b || '', q.c || '', q.d || '', q.diagram || '', q.ans || '']);
    } else {
      rows.push([i + 1, '', '', '', '', '', '', '']);
    }
  }
  ws.getRange(2, 1, rows.length, TEMPLATE_HEADERS.length).setValues(rows);

  exam.selections = exam.selections || {};
  exam.selections[subject] = questions;
  exam.pushedStatus = exam.pushedStatus || {};
  if (isPush) {
    exam.pushedStatus[subject] = {
      pushedBy: lecturerEmail,
      count: questions.length,
      pushedAt: new Date().toISOString()
    };
  }
  saveRegistry_(reg);

  return {
    ok: true,
    pushed: isPush,
    count: questions.length,
    pushedInfo: exam.pushedStatus[subject] || null
  };
}
