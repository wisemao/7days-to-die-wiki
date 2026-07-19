export function renderTemplate(template, data) {
  let result = template.replace(/\{\{#if (.+?)\}\}(.*?)\{\{\/if\}\}/gs, (_, key, content) => {
    const val = getValue(data, key.trim());
    if (Array.isArray(val)) {
      return val.length > 0 ? renderTemplate(content, data) : '';
    }
    return val ? renderTemplate(content, data) : '';
  });

  result = result.replace(/\{\{#each (.+?)\}\}(.*?)\{\{\/each\}\}/gs, (_, key, content) => {
    const list = getValue(data, key.trim());
    if (!Array.isArray(list) || list.length === 0) return '';
    return list.map(item => renderTemplate(content, { ...data, ...item })).join('\n');
  });

  result = result.replace(/\{\{(.+?)\}\}/g, (_, key) => {
    const val = getValue(data, key.trim());
    return val !== undefined && val !== null ? String(val) : '';
  });

  return result;
}

function getValue(obj, path) {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}
