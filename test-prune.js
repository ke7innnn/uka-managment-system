function pruneDeep(obj) {
  if (Array.isArray(obj)) {
    const arr = obj.map(pruneDeep).filter(v => v !== null && v !== undefined && v !== '');
    return arr.length > 0 ? arr : undefined;
  }
  if (typeof obj === 'object' && obj !== null) {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      // Skip expensive or useless keys (base64 images, internal IDs, empty values)
      // Note: We KEEP 'createdAt' and 'uploadedAt' so the AI knows dates/times.
      if (
        ['id', 'password', 'url', 'clientPassword'].includes(k) || 
        k.endsWith('Photo') || 
        k.endsWith('Certificate') || 
        k.endsWith('Signature')
      ) {
        continue;
      }
      const pruned = pruneDeep(v);
      if (pruned !== undefined && pruned !== null && pruned !== '') {
        res[k] = pruned;
      }
    }
    return Object.keys(res).length > 0 ? res : undefined;
  }
  return obj;
}

const c = {
  id: "123",
  name: "Kevin",
  documents: [
    {
      id: "doc1",
      name: "File.pdf",
      uploadedAt: "2026-06-10",
      uploadedBy: "Admin"
    }
  ],
  phases: []
};

const compressedClients = [c].map((client) => {
  return { ...client, phases: [] };
});

console.log(JSON.stringify(pruneDeep(compressedClients), null, 2));
