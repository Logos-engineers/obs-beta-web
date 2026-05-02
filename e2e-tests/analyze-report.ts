import fs from 'fs';
import path from 'path';
import axios from 'axios';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1499340339452838013/Z8AfLvHjXiReLpv9Ab_2-h--FWYUzyfalJXVyZtdkbH-MnUjZ-v0JsvXycAVxKGmmdDP';
const RESULTS_PATH = path.join(process.cwd(), 'qa-reports/test-results.json');
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';

async function sendToDiscord(content: string, isSuccess: boolean) {
  const color = isSuccess ? 0x00FF00 : 0xFF0000;
  const title = isSuccess ? '✅ QA 결과: 모든 테스트 통과' : '❌ QA 분석 리포트';

  try {
    await axios.post(DISCORD_WEBHOOK_URL, {
      embeds: [{
        title,
        description: content.slice(0, 4000), // Discord limit
        color,
        timestamp: new Date().toISOString()
      }]
    });
    console.log('Discord notification sent.');
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
  }
}

async function analyzeWithOllama(errorDetails: string): Promise<string> {
  try {
    const prompt = `
      당신은 전문 QA 엔지니어입니다. 다음은 라즈베리파이에서 실행된 E2E 테스트 실패 결과입니다.
      이를 분석하여 무엇이 문제인지(백엔드 에러인지, UI 변경인지, 타임아웃인지 등) 진단하고, 
      수정 방향을 제시하는 Markdown 리포트를 작성해 주세요. 한국어로 작성해 주세요.

      테스트 결과 데이터:
      ${errorDetails}
    `;

    console.log('Sending request to Ollama llama3.2:3b (lighter model, should be faster)...');
    const response = await axios.post(OLLAMA_API_URL, {
      model: 'llama3.2:3b', 
      prompt,
      stream: false
    }, { timeout: 300000 }); // 5 minutes timeout


    return response.data.response;
  } catch (error) {
    console.error('Ollama analysis failed:', error);
    return 'Ollama 분석 중 오류가 발생했습니다. 라즈베리파이에서 Ollama가 실행 중인지 확인해 주세요.';
  }
}

async function analyze() {
  if (!fs.existsSync(RESULTS_PATH)) {
    console.error('Test results not found.');
    return;
  }

  const results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8'));
  const stats = results.stats;
  console.log('Test Stats:', JSON.stringify(stats));

  // expected 가 아닌 결과가 하나라도 있으면 실패로 간주 (unexpected, flaky 등)
  const hasFailures = stats.unexpected > 0 || stats.flaky > 0;

  if (!hasFailures) {
    const successMsg = '라즈베리파이 에이전트가 모든 핵심 플로우를 성공적으로 검증했습니다.';
    await sendToDiscord(successMsg, true);
    return;
  }

  // 실패 상세 정보 추출 (모든 레벨 순회)
  const failures: any[] = [];
  const findFailures = (suite: any) => {
    if (suite.specs) {
      for (const spec of suite.specs) {
        if (spec.tests) {
          for (const test of spec.tests) {
            for (const res of test.results) {
              if (res.status !== 'expected') {
                failures.push({
                  title: spec.title,
                  error: res.error,
                  steps: res.steps
                });
              }
            }
          }
        }
      }
    }
    if (suite.suites) {
      for (const subSuite of suite.suites) {
        findFailures(subSuite);
      }
    }
  };

  results.suites.forEach(findFailures);
  console.log(`Detected ${failures.length} actual failures.`);

  console.log(`Analyzing ${failures.length} failures with Ollama...`);

  const errorDetails = failures.map((f: any, i: number) => {
    return `Failure ${i + 1}:
    - Error: ${f.error?.message}
    - Step: ${f.steps?.map((s: any) => s.title).join(' -> ')}
    `;
  }).join('\n\n');

  const analysis = await analyzeWithOllama(errorDetails);
  await sendToDiscord(analysis, false);
}

analyze().catch(console.error);
