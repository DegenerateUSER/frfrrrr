import Tesseract from 'tesseract.js';import FormData from "form-data";
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
export default async function ocr3(imagePath) {
    try {
      const formData = new FormData();
      const apiKey = process.env.OCRSPACE_API_KEY || 'helloworld'; // Replace with your actual API key
      
      // If a path is provided, read the file and append it to form data
      if (imagePath) {
        const imageBuffer = readFileSync(imagePath);
        formData.append('file', imageBuffer, {
          filename: 'image.jpg',
          contentType: 'image/jpeg',
        });
      }
      
      // Set up the other form parameters
      formData.append('apikey', apiKey);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      
      // Make the API request
      const response = await axios.post('https://api.ocr.space/parse/image', 
        formData, 
        { 
          headers: {
            ...formData.getHeaders(),
          } 
        }
      );
      
      console.log('OCR API response:', response.data);
      
      // Extract the text from the response
      if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
        return response.data.ParsedResults[0].ParsedText;
      } else {
        console.error('No text found in the OCR result');
        return null;
      }
    } catch (error) {
      console.error('OCR error:', error.message);
      return null;
    }
  }


export async function tesseractocr(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'eng', // Language (use 'eng' for English)
      {
        logger: m => console.log(m), // Optional: shows progress
      }
    );
    // Return the recognized text
    console.log('OCR Result:\n', text);
    return text;
  } catch (err) {
    console.error('OCR Error:', err);
    return null;
  }
}

const genAI = new GoogleGenerativeAI('AIzaSyCAoPO53Eg_FKKjesXMGABwTZh9jxVeLLE');

function fileToBase64(filePath) {
  const file = fs.readFileSync(filePath);
  return file.toString('base64');
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  throw new Error('Unsupported image format. Use PNG or JPG.');
}

export async function runOCR(imagePath) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const base64Image = fileToBase64(imagePath);
  const mimeType = getMimeType(imagePath);

  const result = await model.generateContent([
    { text: "Extract all text from this image:" },
    {
      inlineData: {
        mimeType,
        data: base64Image,
      },
    },
  ]);

  const response = result.response;
// Assuming the response has a text method to get the extracted text
  console.log("Extracted Text:\n", response.text());
  return response.text(); 
}