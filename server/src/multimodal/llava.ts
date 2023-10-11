import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const llava_path = process.env.LLAVA_PATH
const model_path = process.env.LLAVA_MODEL_PATH

export function captionImage(imagePath: string) {
  const absoluteImagePath = path.join(__dirname, '../../', imagePath)

  return new Promise<string>((resolve, reject) => {
    const { exec } = require('child_process');
    exec(`${llava_path} ${model_path}/ggml-model-q5_k.gguf ${model_path}/mmproj-model-f16.gguf ${absoluteImagePath} > output.txt 2>&1 && sed -n '/clip_model_load: total allocated memory:/,/llama_print_timings/p' output.txt | sed '1d;$d'`, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        reject(error.message);
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        reject(stderr);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  })
}

/*
./llava models/img/ggml-model-q5_k.gguf models/img/mmproj-model-f16.gguf ../images/img1.png > output.txt 2>&1 && sed -n '/clip_model_load: total allocated memory:/,/llama_print_timings/p' output.txt | sed '1d;$d'
*/
