/* ---------------- アプリ全体で共有する状態 ---------------- */
let patients = [];
let patientsLoaded = false;
let currentPatientId = null;
let currentUser = null; // { name, role }
let currentFamilyPatient = null; // 家族としてログインした際に紐づく患者
let familyPollTimer = null;
let nursePollTimer = null;
let nurseListPollTimer = null;
let attachedImage = null; // 看護師がカルテ要約用に添付した画像（base64）
let appointmentsIndex = {}; // patientId -> 面談予約リクエストの配列（サイドバーのバッジ表示用）
let authMode = 'login';
let toastTimeout;
