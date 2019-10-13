const metaProperties = new Set([
  '_ns',
  '_id',
  '_rev',
  'tool',
  'editorVersion',
  'rendererVersion',
  'createdDate',
  'createdBy',
  'department',
  'annotations',
  'editedBy',
  'updatedBy',
  'updatedDate',
  'active',
  'activateDate',
  'deactivateDate',
  'publication'
]);

const deleteMetaProperties = function(item) {
  const obj = {}
  for (const key of Object.keys(item)) {
    if (!metaProperties.has(key)) obj[key] = item[key]
  }
  return obj
}

module.exports = {
  deleteMetaProperties: deleteMetaProperties
};
