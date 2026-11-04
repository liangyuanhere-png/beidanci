/* Each word updates spaced repetition once, after the full learning sequence. */
window.LumiStudy = (() => {
  function buildQueue(items, standard) {
    if (!standard) return items;
    return ['card', 'context', 'spell'].flatMap((type, stage) => items.map((item, ordinal) => ({
      word: item.word, type, ordinal, stage, final: type === 'spell'
    })));
  }

  function recordAnswer(session, question, grade) {
    if (question.answered) return null;
    question.answered = true;
    const results = session.wordResults || (session.wordResults = {});
    const result = Object.prototype.hasOwnProperty.call(results, question.word)
      ? results[question.word] : (results[question.word] = { grade: 3, recorded: false });
    result.grade = Math.min(result.grade, grade);
    session.done++;
    if (grade >= 1) session.right++;
    else session.wrong++;
    const shouldMark = !result.recorded && (!session.standard || question.final);
    if (shouldMark) result.recorded = true;
    if (grade === 0 && question.type !== 'card' && !question.retry && session.queue.length < 300) {
      session.queue.push({ ...question, answered: false, retry: true, final: false });
    }
    return { shouldMark, grade: result.grade };
  }

  function completedWords(session) {
    return Object.values(session.wordResults || {}).filter(result => result.recorded).length;
  }

  function exampleParts(word) {
    const base = word.word.toLowerCase();
    const forms = new Set([base, base + 's', base + 'es', base + 'ed', base + 'd', base + 'ing', base + 'ly']);
    if (base.endsWith('e')) forms.add(base.slice(0, -1) + 'ing');
    if (base.endsWith('y')) forms.add(base.slice(0, -1) + 'ies');
    const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp('\\b(?:' + [...forms].sort((a, b) => b.length - a.length).map(escape).join('|') + ')\\b', 'gi');
    const text = String(word.example || '');
    const matches = [...text.matchAll(pattern)];
    const parts = [];
    let index = 0;
    for (const match of matches) {
      parts.push({ text: text.slice(index, match.index), target: false }, { text: match[0], target: true });
      index = match.index + match[0].length;
    }
    parts.push({ text: text.slice(index), target: false });
    return { parts, hasTarget: matches.length > 0, cloze: text.replace(pattern, '________') };
  }

  return { buildQueue, recordAnswer, completedWords, exampleParts };
})();
