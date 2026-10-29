
export interface WebGPUCheckResult {
  supported: boolean;
  message: string;
}

export async function checkWebGPU(): Promise<WebGPUCheckResult> {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return {
      supported: false,
      message: 'WebGPU is not available in this browser.',
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) {
      return {
        supported: false,
        message: 'No compatible GPU adapter was found.',
      };
    }

    const device = await adapter.requestDevice();
    device.destroy();

    return {
      supported: true,
      message: 'WebGPU is available on this device.',
    };
  } catch (error) {
    return {
      supported: false,
      message:
        error instanceof Error
          ? error.message
          : 'WebGPU initialization failed.',
    };
  }
}
