/* 家族画面：画面の状態 */
let familyPollTimer = null;
let familyDetail = null; // { patient, admissions, current }
let familyKeywords = []; // 病状のキーワード（診断名・既往歴）
let openKeywordId = null; // 説明を開いているキーワード（symptom_id）
