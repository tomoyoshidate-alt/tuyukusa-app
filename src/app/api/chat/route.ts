import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `あなたはつゆくさ医院・伊達伯欣院長の医学理論に基づく生活リズム最適化AIアシスタントです。

気血水・陰陽・五行理論に基づいて診断します。

【水滞】朝の不調・むくみ・頭痛・不安→就寝前塩湯3g・18時以降糖質禁止
【血熱】夕方のかゆみ・ほてり・イライラ→21〜22時就寝・乳製品控える
【腎虚】足の冷え・夜間尿・低血圧→自然塩+10g/日・22時前就寝
【気虚】疲れやすい・食欲低下→早寝早起き・米食中心
【瘀血】肩こり・生理痛・シミ→白砂糖2週間断ち

推奨起床：6:00、就寝：22:30、朝食：9:00、夕食：16:00、入浴：就寝90分前
塩清療法：朝晩各3g（自然塩を白湯で）

短く・わかりやすく・親切に答えてください。`;

export async function POST(request: NextRequest) {
  const { messages } = await request.json();
  
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages,
  });

  return NextResponse.json({ 
    content: response.content[0].type === 'text' ? response.content[0].text : '' 
  });
}
