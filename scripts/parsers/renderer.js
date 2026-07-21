function getValue(obj, path) {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

function findBlock(template) {
  const openMatch = template.match(/\{\{#(if|each) (.+?)\}\}/);
  if (!openMatch) return null;
  const type = openMatch[1];
  const openTag = `{{#${type} `;
  const closeTag = `{{/${type}}}`;
  let depth = 1;
  let i = openMatch.index + openMatch[0].length;
  while (i < template.length && depth > 0) {
    const nextOpen = template.indexOf(openTag, i);
    const nextClose = template.indexOf(closeTag, i);
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + openTag.length;
    } else {
      depth--;
      i = nextClose + closeTag.length;
    }
  }
  if (depth !== 0) return null;
  const content = template.slice(openMatch.index + openMatch[0].length, i - closeTag.length);
  return { type, key: openMatch[2], content, startIdx: openMatch.index, endIdx: i };
}

export function renderTemplate(template, data) {
  let result = template;

  const block = findBlock(result);
  if (block) {
    let replacement = '';
    if (block.type === 'if') {
      const val = getValue(data, block.key.trim());
      const cond = Array.isArray(val) ? val.length > 0 : !!val;
      replacement = cond ? renderTemplate(block.content, data) : '';
    } else if (block.type === 'each') {
      const list = getValue(data, block.key.trim());
      if (Array.isArray(list) && list.length > 0) {
        replacement = list.map(item => renderTemplate(block.content, { ...data, ...item })).join('\n');
      }
    }
    result = result.slice(0, block.startIdx) + replacement + result.slice(block.endIdx);
    result = renderTemplate(result, data);
  }

  result = result.replace(/\{\{(.+?)\}\}/g, (_, key) => {
    const val = getValue(data, key.trim());
    return val !== undefined && val !== null ? String(val) : '';
  });

  result = result.replace(/[^\S\n]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  return result;
}

