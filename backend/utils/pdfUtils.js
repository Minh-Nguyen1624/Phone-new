const { fileTypeFromBuffer } = require("file-type");
async function isValidPdf(filePath) {
  try {
    const buffer = await fsPromises.readFile(filePath, { length: 262 });
    console.log(`Read ${buffer.length} bytes from ${filePath}`);
    console.log(`First 5 bytes: ${buffer.slice(0, 5).toString()}`); // Check PDF header
    const type = await fileTypeFromBuffer(buffer);
    console.log(`File type detection result for ${filePath}:`, type);
    return type && type.mime === "application/pdf";
  } catch (error) {
    console.error("Error checking file type:", error);
    return false;
  }
}

module.exports = {
  isValidPdf,
};
