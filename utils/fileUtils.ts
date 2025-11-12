// A function to convert a File object to a GoogleGenerativeAI.Part
export async function fileToGenerativePart(file: File) {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // The result includes the data URL prefix, so we need to remove it
          resolve(reader.result.split(',')[1]);
        } else {
          resolve(''); // Should not happen with readAsDataURL
        }
      };
      reader.readAsDataURL(file);
    });
  
    const base64EncodedData = await base64EncodedDataPromise;
  
    return {
      inlineData: {
        data: base64EncodedData,
        mimeType: file.type,
      },
    };
  }