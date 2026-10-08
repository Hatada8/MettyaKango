/* AI 要約（patient_ai_summary）
   ・1 回の入院につき 1 行（admission_id が一意）
   ・AI が出した原文は generated_text、手直しは edited_text に保存する */

/* 「AIで要約する」を何回押せるか
   false：何回でも作り直せる（同じ入院の要約を新しい文章で上書きする）← 今はこちら
   true ：1 回の入院につき 1 回だけ */
const AI_SUMMARY_ONCE = false;

const AI_SUMMARY_SELECT =
  'select=*,generator:employee_master!generated_by(employee_name),editor:employee_master!updated_by(employee_name)';

async function getAiSummary(admissionId){
  const rows = await db.select('patient_ai_summary', `${AI_SUMMARY_SELECT}&admission_id=eq.${admissionId}`);
  return rows[0] || null;
}

/* source_text 列がまだないとき（add_ai_source_text.sql を実行する前）は、原文なしで保存する */
async function withOptionalSource(run){
  try{ return await run(true); }
  catch(e){
    if(String(e.body || '').includes('source_text')) return run(false);
    throw e;
  }
}

/* 作成
   ・まだなければ追加 → { row }
   ・すでにあれば：AI_SUMMARY_ONCE が true なら { already: true }、
     false なら新しい文章で上書き（手直し版は消える）→ { row, regenerated: true } */
async function createAiSummary({ admissionId, patientId, text, sourceText = null, employeeId }){
  const existing = await db.select('patient_ai_summary', `select=ai_summary_id&admission_id=eq.${admissionId}`, { includeDeleted: true });
  if(existing.length){
    if(AI_SUMMARY_ONCE) return { already: true };
    const [row] = await withOptionalSource(withSource => db.update('patient_ai_summary', `admission_id=eq.${admissionId}`, {
      ...(withSource ? { source_text: sourceText } : {}),
      generated_text: text,
      generated_by: employeeId,
      generated_at: new Date().toISOString(),
      edited_text: null,
      updated_by: null,
      delete_flag: 0
    }));
    return { row, regenerated: true };
  }
  try{
    const [row] = await withOptionalSource(withSource => db.insert('patient_ai_summary', {
      admission_id: admissionId,
      patient_id: patientId,
      ...(withSource ? { source_text: sourceText } : {}),
      generated_text: text,
      generated_by: employeeId
    }));
    return { row };
  }catch(e){
    // ほぼ同時に別の人が作った場合
    if(isDuplicateError(e)) return { already: true };
    throw e;
  }
}

async function saveAiSummaryEdit(summaryId, text, employeeId){
  return db.update('patient_ai_summary', `ai_summary_id=eq.${summaryId}`, { edited_text: text, updated_by: employeeId });
}

/* 画面に出す文章（手直し版があればそちらを優先） */
function aiSummaryText(row){
  return row ? (row.edited_text || row.generated_text) : '';
}

/* ---------------------------------------------------------
   要約文の作成（デモ）
   自由記述の文章から、大事そうな文を選んで短くまとめます。
   今は外部の AI につながず、この端末の中だけで計算しています。
   本物の AI に替えるときは、この関数の中身だけを差し替えれば OK です。
   --------------------------------------------------------- */
const SUMMARY_RATIO = 0.4;   // もとの文章の何割くらいにまとめるか
const SUMMARY_KEYWORDS = /熱|痛|血圧|脈|食事|食欲|摂取|割|排泄|便|尿|睡眠|眠|転倒|ふらつ|歩行|リハビリ|服薬|薬|点滴|傷|創|咳|痰|呼吸|酸素|不穏|混乱|訴え|家族|面会|拒否|注意|必要|確認|介助|嘔吐|吐き気|むくみ|浮腫|様子|変化/g;

/* 文字数（空白と改行は数えない） */
function countChars(str){
  return String(str || '').replace(/\s/g, '').length;
}

async function generateAiSummaryText({ sourceText }){
  const text = String(sourceText || '').replace(/\r/g, '').trim();
  const sentences = text.split(/(?<=[。！？!?])|\n+/)
    .map(s => s.replace(/[。]+$/, '').replace(/(なんか|えーと|あの、|とにかく|やはり|ちなみに)/g, '').trim())
    .filter(Boolean);

  let chosen = sentences;
  if(sentences.length > 1){
    const total = sentences.reduce((n, s) => n + countChars(s), 0);
    const target = Math.max(30, Math.round(total * SUMMARY_RATIO));
    const ranked = sentences.map((s, i) => ({
      s, i,
      score: 1 + Math.min((s.match(SUMMARY_KEYWORDS) || []).length, 3) * 1.5 + (/\d/.test(s) ? 1 : 0) + (i === 0 ? 1 : 0) + (i === sentences.length - 1 ? 0.5 : 0)
    })).sort((a, b) => (b.score - a.score) || (a.i - b.i));

    const picked = [];
    let len = 0;
    for(const r of ranked){
      if(len >= target) break;
      picked.push(r);
      len += countChars(r.s);
    }
    chosen = picked.sort((a, b) => a.i - b.i).map(r => r.s);
  }

  // 本物の AI のような「考えている時間」を少しだけ置く
  await new Promise(r => setTimeout(r, 700));
  return chosen.map(s => `・${s}`).join('\n');
}
