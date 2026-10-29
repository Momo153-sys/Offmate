
import { OffmateAI } from './engine';
import { WebLLMEngine } from './providers/web-llm';

export async function testLocalAI(): Promise<void> {
  const ai = new OffmateAI();

  const engine = new WebLLMEngine(
    'Qwen3-0.6B-q4f16_1-MLC',
  );

  ai.registerEngine(engine);

  try {
    console.log('Loading Offmate local AI model...');

    await ai.initialize();

    console.log('AI model loaded successfully!');

    const response = await ai.generate({
      messages: [
        {
          role: 'system',
          content:
            'You are Offmate, a helpful offline personal assistant. Answer clearly and concisely.',
        },
        {
            role: 'user',
            content: 'Hello! What can you help me with? /no_think',
        },
      ],
      options: {
        temperature: 0.7,
        maxTokens: 256,
      },
    });

    console.log('Offmate AI response:', response.text);
  } catch (error) {
    console.error('Offmate AI test failed:', error);
  } finally {
    await ai.dispose();
  }
}
