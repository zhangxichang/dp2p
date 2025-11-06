export async function blob_to_data_url(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const file_reader = new FileReader();
    file_reader.onload = (e) => resolve(e.target?.result as string);
    file_reader.onerror = (e) => reject(e.target?.error);
    file_reader.readAsDataURL(blob);
  });
}
