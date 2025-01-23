import { NextResponse } from "next/server";
import { InferenceSession, Tensor } from "onnxruntime-node";

const ENCODER_PATH = "app/api/models/conditional_beta_vae_encoder.onnx";
const DECODER_PATH = "app/api/models/conditional_beta_vae_decoder.onnx";

let encoderSession: InferenceSession | null = null;
let decoderSession: InferenceSession | null = null;

async function getEncoderSession() {
  if (!encoderSession) {
    encoderSession = await InferenceSession.create(ENCODER_PATH);
  }
  return encoderSession;
}

async function getDecoderSession() {
  if (!decoderSession) {
    decoderSession = await InferenceSession.create(DECODER_PATH);
  }
  return decoderSession;
}

export async function POST(request: Request) {
  try {
    const { pixelData, label, tiltValue } = await request.json();

    // 1. Create input tensors for encoder
    const xTensor = new Tensor(
      "float32",
      Float32Array.from(pixelData),
      [1, 784]
    );
    
    const yTensor = new Tensor(
      "int64",
      BigInt64Array.from([BigInt(label)]),
      [1]
    );

    // 2. Run encoder to get mu
    const encoder = await getEncoderSession();
    const encoderResults = await encoder.run({
      x: xTensor,
      y: yTensor,
    });
    
    // 3. Get base latent vector (mu)
    const mu = encoderResults["mu"].data as Float32Array;
    
    // 4. Modify the third dimension with tiltValue
    const latentVector = Array.from(mu);
    latentVector[3] = tiltValue; // Modify the 4th dimension (index 3)
    
    // 5. Create decoder input tensors
    const zTensor = new Tensor(
      "float32",
      Float32Array.from(latentVector),
      [1, 10]  // [batch_size, latent_dim]
    );

    // 6. Run decoder
    const decoder = await getDecoderSession();
    const decoderResults = await decoder.run({
      z: zTensor,
      y: yTensor,
    });

    // 7. Get reconstruction
    const xHat = decoderResults["x_hat"].data as Float32Array;

    return NextResponse.json({
      x_hat: Array.from(xHat),
    });
  } catch (error) {
    console.error("Error running ONNX inference:", error);
    return NextResponse.json(
      { error: "Inference error" },
      { status: 500 }
    );
  }
}