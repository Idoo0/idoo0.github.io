export const cvAccept = '.pdf,application/pdf';
export const maxCvBytes = 25 * 1024 * 1024;

export function validateCVFile(file) {
  if (!file || !/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) throw new Error('Gunakan file CV berformat PDF.');
  if (!file.size || file.size > maxCvBytes) throw new Error('Ukuran CV maksimal 25 MB dan file tidak boleh kosong.');
}

export async function uploadCV(file) {
  validateCVFile(file);
  const response = await fetch(`api/documents/contact/cv?${new URLSearchParams({filename:file.name})}`, {
    method:'POST', headers:{'Content-Type':'application/pdf'}, body:file
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'CV belum dapat disimpan.');
  return result;
}
